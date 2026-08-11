# Integration contracts

Production adapters can use Clerk, Stripe, Neon, Vercel Blob, and Resend, but the business contract stays provider-neutral. The paywall app and subscriber operations share the same normalized IDs and entitlement rules.

## Shared rules

- Internal `userId` is the account key. Email is a verified contact attribute, never the entitlement key.
- Provider IDs are stored as opaque strings and are never exposed in public URLs.
- Every mutation receives an idempotency key and a verified approval context when the action requires human approval.
- Webhooks are verified from the raw request body before parsing or persistence.
- Secrets, raw webhook bodies, signed URLs, emails, and full IP addresses never enter general logs.
- Adapter errors distinguish retryable provider failure, permanent policy denial, invalid input, approval failure, and integrity conflict.

## AuthAdapter

```ts
interface AuthAdapter {
  getSession(): Promise<{ userId: string; email: string }>;
}
```

Contract:

- `userId` is stable across email changes.
- `email` is verified. Unverified users cannot start billing, receive subscriber delivery, or request a PDF link.
- Missing or invalid sessions fail closed with an authentication error.
- The application never trusts a `userId` or email supplied in request JSON.

## BillingAdapter

```ts
interface BillingAdapter {
  createSubscriptionCheckout(input: {
    userId: string;
    email: string;
    priceKey: string;
    successPath: string;
    cancelPath: string;
    idempotencyKey: string;
  }): Promise<{ checkoutUrl: string; checkoutSessionId: string }>;

  createCustomerPortal(input: {
    userId: string;
    customerId: string;
    returnPath: string;
    idempotencyKey: string;
  }): Promise<{ portalUrl: string }>;

  constructWebhookEvent(rawBody: Uint8Array, signature: string): Promise<{
    id: string;
    created: number;
    type: string;
    data: unknown;
  }>;
}
```

The checkout success route displays pending access until a verified webhook updates entitlement. It cannot grant access.

Normalized Stripe events passed to the repository:

```ts
type NormalizedStripeEvent = {
  eventId: string;
  eventCreated: number;
  eventType:
    | "checkout.session.completed"
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "invoice.payment_succeeded"
    | "invoice.payment_failed"
    | "charge.refunded"
    | "charge.dispute.created";
  customerId: string;
  subscriptionId: string | null;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  isFirstCharge: boolean | null;
  userId: string;
  email: string;
  payloadSha256: string;
};
```

The repository must reject an existing `eventId` with a different `payloadSha256` and open an integrity incident.

## EntitlementRepository

```ts
interface EntitlementRepository {
  applyStripeEvent(event: NormalizedStripeEvent): Promise<{
    applied: boolean;
    duplicate: boolean;
    entitlementState: string;
  }>;

  getByUserId(userId: string): Promise<EntitlementRecord | null>;
  hasDownloadAccess(userId: string, at: Date): Promise<boolean>;
}
```

`applyStripeEvent` claims the Stripe event and applies the entitlement transition in one database transaction. Required uniqueness constraints:

- Stripe event ID;
- provider customer ID;
- provider subscription ID when present;
- one active entitlement row per user and product;
- release ID;
- audience snapshot ID;
- recipient delivery ID;
- audit aggregate ID plus sequence number.

`hasDownloadAccess` uses database state, current time, policy version, and active release state. It does not call Stripe on the download request path.

Policy version `subscriber-access-v1` is binding: cancellation preserves access through `currentPeriodEnd`; the first `past_due` state starts one seven-day, non-resetting grace period; refund completion and chargeback creation suspend immediately. A verified paid renewal clears `past_due` and extends the period. Browser redirects and repeated failure events cannot change those rules.

## PrivateAssetStore

The paywall app reads the current handbook through the existing interface:

```ts
interface PrivateAssetStore {
  getHandbook(): Promise<{
    body: ReadableStream | Uint8Array;
    contentType: "application/pdf";
    contentLength?: number;
    etag?: string;
    filename: string;
  }>;
}
```

Subscriber release operations add a separately privileged promotion interface:

```ts
interface PrivateReleaseStore {
  putPrivateIfAbsent(input: {
    objectKey: string;
    body: ReadableStream | Uint8Array;
    sha256: string;
    byteCount: number;
    contentType: "application/pdf";
    filename: string;
    idempotencyKey: string;
    approval: VerifiedApproval;
  }): Promise<PrivateObjectReceipt>;

  headPrivate(objectKey: string): Promise<PrivateObjectReceipt | null>;
}
```

The access route calls `AuthAdapter.getSession`, then `EntitlementRepository.hasDownloadAccess`, then `PrivateAssetStore.getHandbook`. It should stream the object or return a signed URL with a five-minute maximum lifetime. Cache headers are `private, no-store`. Signed URLs and Blob tokens never appear in analytics or audit payloads.

Objects are private, immutable, and content-addressed. Rollback changes the current release pointer; it does not overwrite or immediately delete the withdrawn object.

The initial selected asset is the exact local file `output/pdf/production-ai-engineering.pdf` recorded in `fixtures/subscriber-policy.v1.json`. Its private preview/development upload is recorded in `fixtures/initial-staging-upload-receipt.json`. The receipt does not authorize production: production requires a fresh `PROMOTION` approval for environment `production`, action `promote_initial_canonical_pdf_to_production`, and the exact recorded digest and byte count.

## DeliveryNotifier

```ts
interface DeliveryNotifier {
  sendSubscriberUpdate(input: {
    deliveryId: string;
    userId: string;
    email: string;
    releaseId: string;
    subject: string;
    accessUrl: string;
  }): Promise<{
    providerMessageId: string;
    acceptedAt: string;
  }>;
}
```

The email adapter consumes committed outbox rows. It cannot query or expand the audience. `deliveryId` is the provider idempotency key and the local unique key. The email contains an authenticated app URL, never a raw Blob URL or durable bearer token.

The Resend implementation lives in `lib/resend-service-email.mjs`. It is staging-only and defaults to preview/no-send. A provider call requires the domain resource to be `verified`, the exact deterministic delivery ID, one recipient, and a matching unexpired `STAGING_EMAIL_VERIFICATION` approval. The approval binds the recipient-email digest, internal user ID, release, audience snapshot, subject/content digests, sender domain, and a one-send ceiling while explicitly denying production and live promotion.

Resend receives the deterministic delivery ID in its `Idempotency-Key` header. Provider idempotency lasts 24 hours; the Neon outbox unique constraint remains authoritative after that window. General logs and command output never contain API keys or recipient addresses.

Email webhooks normalize provider results to `accepted`, `delivered`, `soft_bounced`, `hard_bounced`, `complained`, or `failed`. `delivered` is a provider signal, not proof of reading. Hard bounces and complaints update suppression state transactionally.

## ReleaseRepository and outbox

```ts
interface ReleaseRepository {
  activateRelease(input: {
    releaseId: string;
    manifestSha256: string;
    objectReceipt: PrivateObjectReceipt | null;
    previousReleaseId: string | null;
    approval: VerifiedApproval;
  }): Promise<{ applied: boolean; duplicate: boolean }>;

  createAudienceSnapshot(input: AudienceQuery): Promise<AudienceSnapshot>;
  enqueueApprovedSend(input: {
    approval: VerifiedApproval;
    snapshot: AudienceSnapshot;
    contentSha256: string;
  }): Promise<{ inserted: number; duplicate: number }>;
}
```

Release activation and outbox creation are transactions. Outbox workers use row leases with expirations, not process memory, so crashes resume rather than duplicate.

## AnalyticsSink

```ts
interface AnalyticsSink {
  capture(event: AnalyticsEvent): Promise<{ accepted: boolean }>;
}
```

Analytics failure never blocks checkout, entitlement, download, cancellation, refund, or email delivery. Events go through a bounded outbox and use the contract in `analytics-events.md`. No event may contain email, name, raw IP, provider secret, signed URL, field-note body, or PDF content.

`subscriber-ops/analytics-events.md`, its JSON schema, and its executable registry are the canonical raw vocabulary. App adapters emit those exact names, including `billing.subscription_activated` only for first activation and `billing.renewal_paid` for later paid cycles. Acquisition plans and dashboards derive stages and rates from raw events; they do not invent parallel event names.

## ApprovalVerifier

```ts
interface ApprovalVerifier {
  verify(input: {
    approval: HumanApproval;
    requiredScope: string;
    releaseId: string;
    manifestSha256: string;
    audienceSha256?: string;
    contentSha256?: string;
    now: Date;
  }): Promise<VerifiedApproval>;
}
```

Verification checks the approver identity and role, decision, scope, digests, recipient ceiling, action list, environment, expiry, and one-time-use policy. A UI button or environment variable is not approval evidence by itself.
