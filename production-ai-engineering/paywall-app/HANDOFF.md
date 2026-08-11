# Paywall staging-prep handoff

Status: staging implementation is validated and deployed only to a protected
Vercel preview. Deployment `dpl_Fg1GHG2GzWNMQU2tWy4ChFELM3PV` is `READY`, is
classified as `preview`, and redirects unauthenticated traffic to Vercel SSO.
Production promotion remains unapproved.

The two older red Vercel entries are historical setup attempts: one targeted the
new project's initial Production environment without Production configuration;
the other inherited the project's former `Other` framework output behavior and
looked for `public`. The project now reports `Next.js` and `Next.js default`, and
`npm run deploy:preview` validates locally, pins the exact project, and supplies
an explicit Preview target. Do not use a bare Vercel deployment command.

## Coordinated staging evidence

- Vercel project: `surfaces-platform/production-ai-handbook-staging`, with SSO
  protection reported as `all_except_custom_domains`.
- Neon: isolated preview/development database; the coordinating task applied
  `migrations/001_entitlements.sql` and verified `analytics_outbox`,
  `entitlements`, `stripe_events`, and `apply_stripe_event`.
- Blob: isolated preview/development private store with the approved initial PDF;
  its receipt remains governed by `subscriber-policy.v1.json`.
- Production: still unapproved and unchanged by this slice.

## Implemented

- Public sales and free Sections 1–3 sample routes.
- Configurable identity defaults: seller `Surfaces`, support
  `hello@surfaces.systems`, and base domain `surfaces.systems`.
- Server-controlled `$5/month` Stripe subscription Checkout, authenticated
  dashboard, and Customer Portal contract.
- Seven-day first-charge refund configuration and customer copy, visibly labeled
  as a staging draft pending qualified review.
- Raw-body webhook verification for Checkout, subscriptions, invoices, completed
  refunds, and created chargebacks.
- Duplicate, changed-payload event-ID reuse, and stale-event protection.
- Exact `subscriber-access-v1`: canceled paid-period access; one non-resetting
  seven-day `past_due` grace; immediate refund/chargeback suspension; paid renewal
  restores active access.
- Entitlement-checked, non-cacheable PDF streaming from private storage.
- Literal parity with all 23 canonical analytics events, privacy-field rejection,
  local/test sinks, and a production Neon outbox. Analytics failure never blocks
  checkout, entitlement, cancellation, or download behavior.
- Preview-safe Stripe return URLs. Production permits only HTTPS Surfaces or
  `*.vercel.app` request origins, then falls back to configured/Vercel origins.

## Remaining staging work

Do not perform these steps without the relevant approval:

1. Bind and prove the Clerk staging application, sign-in methods, and preview and
   custom-domain redirect URLs.
2. Verify the Stripe test product is exactly `$5 USD` monthly; configure Portal
   cancellation to stop renewal while preserving paid-period access; prove the
   seven-day first-charge refund operating path.
3. Register staging `/api/webhooks/stripe` for
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_succeeded`, `invoice.payment_failed`, `charge.refunded`, and
   `charge.dispute.created`.
4. Retain the applied Neon migration receipt and add backup/restore evidence.
5. Bind `CURRENT_RELEASE_ID` and `HANDBOOK_BLOB_URL` to the recorded private
   staging receipt; prove anonymous denial and entitled access. Production
   promotion requires a new scoped approval.
6. Complete qualified review of renewal, cancellation, refund, tax, privacy,
   consent, and support language before live billing.
7. Add the analytics outbox lease/drain worker and choose its production
   destination. The app durably enqueues but does not invent an analytics vendor.
8. Add consent-reviewed browser instrumentation for visible offer/sample events,
   30-day first/last-non-direct attribution, and versioned engagement rules.
   Server routes intentionally do not claim browser-only triggers.
9. Build the support-side refund-request record/approval path. The app enforces a
   completed provider refund but never issues one.
10. Connect the separately governed Tuesday release/outbox/email workflow.
11. Audit every deployed handbook URL for bypasses and run test-mode purchase,
    duplicate/conflicting webhook, cancel, renewal, failure, refund, dispute,
    revoked-access, and expired-session proofs before live billing.

## Provider and terms gates

- **Stripe:** staging test-mode identity and Price must be proven; Portal,
  statement descriptor, tax, recurring-renewal disclosure, cancellation,
  refunds, disputes, and digital-content terms require qualified review. Live
  mode remains a separate approval.
- **Clerk:** allowed origins, redirect URLs, sign-in methods, verified-email
  behavior, privacy disclosure, retention, and account-deletion handling must be
  approved and proven in staging.
- **Resend:** the paywall app does not consume a Resend key. Subscriber operations
  still needs approved service-versus-promotional classification, sender-domain
  SPF/DKIM/DMARC, consent and unsubscribe behavior, suppression and complaint
  handling, privacy/DPA review, monitored replies, and test receipts before any
  Tuesday send.
- All customer-facing legal language remains staging draft copy pending qualified
  review; implementation of a policy is not legal approval.

## Required environment

Use `.env.example` only as a reference. Secrets belong in the deployment provider,
never Git. Production requires `APP_MODE=production`, Clerk keys, Stripe key,
webhook secret and Price ID, Neon `DATABASE_URL`, private Blob token/object URL,
and `CURRENT_RELEASE_ID`. Return URLs prefer the validated request origin, then
optional `NEXT_PUBLIC_APP_URL`, then Vercel's injected `VERCEL_URL`.

## Validation scope

`npm run check` verifies exact analytics/policy parity, TypeScript, unit contracts,
and a credential-free Next.js production build. Runtime smoke verifies public and
authenticated routing, private PDF delivery, and locally emitted canonical access
events. See the final task report for exact current counts.

Recorded 2026-08-04: parity passed for 23 events and `subscriber-access-v1`;
TypeScript passed; 8 test files and 38 tests passed; Next.js 16.3.0 built 12 routes.
Local runtime returned `200` for home, sample, health, signed dashboard, and the
protected 659-byte PDF; anonymous dashboard returned `307` to sign-in. The local
sink emitted exactly `subscriber.pdf_access_requested` and
`subscriber.pdf_access_granted`; both passed the subscriber-ops executable
validator, carried the mock release ID, and contained no email address.
