#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANALYTICS_EVENT_DEFINITIONS,
  ANALYTICS_EVENTS,
  ContractError,
  STATE_TRANSITIONS,
  assertAnalyticsEvent,
  assertApprovalCovers,
  assertAudienceSnapshot,
  assertPromotionReceipt,
  assertTransition,
  buildRecipientDeliveryId,
  buildWeeklySendKey,
  sha256Canonical,
  verifyAuditChain,
} from "../lib/contracts.mjs";
import {
  ExternalMutationBlockedError,
  createBlockedProviderAdapters,
  createInMemoryEntitlementRepository,
} from "../lib/blocked-adapters.mjs";
import { buildSyntheticRun } from "../lib/synthetic-run.mjs";
import {
  applyEntitlementEvent,
  assertSubscriberPolicy,
  emptyEntitlement,
  hasEntitledAccess,
  isFirstChargeRefundEligible,
  projectEntitlementAt,
} from "../lib/policy.mjs";
import {
  buildStagingEmailApprovalRequest,
  createResendServiceEmailAdapter,
  serviceEmailContentSha256,
} from "../lib/resend-service-email.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const passed = [];

function pass(name) {
  passed.push(name);
}

function expectContractError(fn, code) {
  assert.throws(fn, (error) => error instanceof ContractError && error.code === code);
}

async function expectAsyncError(fn, ErrorType, code) {
  await assert.rejects(fn, (error) => error instanceof ErrorType && (!code || error.code === code));
}

const schemaDir = resolve(root, "schemas");
const schemaFiles = (await readdir(schemaDir)).filter((name) => name.endsWith(".json"));
const schemaIds = new Set();
for (const filename of schemaFiles) {
  const parsed = JSON.parse(await readFile(resolve(schemaDir, filename), "utf8"));
  assert.equal(parsed.schema_version === "1" || parsed.$schema === "https://json-schema.org/draft/2020-12/schema", true, `${filename} is not versioned`);
  if (parsed.$id) {
    assert.equal(schemaIds.has(parsed.$id), false, `${filename} repeats a schema ID`);
    schemaIds.add(parsed.$id);
  }
}
pass(`${schemaFiles.length} JSON contracts parse and have unique IDs`);

const stateContract = JSON.parse(await readFile(resolve(schemaDir, "release-state-machine.json"), "utf8"));
assert.deepEqual(stateContract.transitions, STATE_TRANSITIONS);
pass("machine-readable and executable state transitions match");

const analyticsSchema = JSON.parse(await readFile(resolve(schemaDir, "analytics-event.schema.json"), "utf8"));
const schemaAnalyticsEvents = analyticsSchema.properties.event_name.enum;
assert.deepEqual(schemaAnalyticsEvents, ANALYTICS_EVENTS);
assert.deepEqual(Object.keys(ANALYTICS_EVENT_DEFINITIONS), ANALYTICS_EVENTS);
pass(`${ANALYTICS_EVENTS.length} canonical raw analytics names match across schema and code`);

const analyticsPropertyExamples = {
  billing_cycle_number: 2,
  amount_minor: 500,
  first_charge: true,
  currency: "usd",
  provider_result: "accepted",
};
for (const [eventName, requiredProperties] of Object.entries(ANALYTICS_EVENT_DEFINITIONS)) {
  assertAnalyticsEvent({
    schema_version: "1",
    event_id: `evt_registry_${eventName.replaceAll(".", "_")}`,
    event_name: eventName,
    occurred_at: "2026-08-04T18:45:00.000Z",
    actor_ref: "usr_registry_test",
    anonymous_ref: null,
    session_ref: "ses_registry_test",
    release_id: "rel_2026_08_04_registry",
    source: { channel: "direct", campaign: null, content: null, referrer_host: null },
    properties: Object.fromEntries(
      requiredProperties.map((property) => [property, analyticsPropertyExamples[property] ?? `synthetic_${property}`]),
    ),
  });
}
pass("every canonical analytics event validates with its exact required property set");

const fixture = JSON.parse(await readFile(resolve(root, "fixtures/synthetic-weekly-run.json"), "utf8"));
const run = buildSyntheticRun(fixture);
assert.equal(run.deliveries.length, run.audience.recipient_count);
assert.equal(new Set(run.deliveries.map((entry) => entry.delivery_id)).size, run.deliveries.length);
pass("positive Monday-to-Tuesday synthetic run validates");

const subscriberPolicy = JSON.parse(await readFile(resolve(root, "fixtures/subscriber-policy.v1.json"), "utf8"));
assertSubscriberPolicy(subscriberPolicy);
const canonicalPdfPath = resolve(root, "..", subscriberPolicy.initial_asset.source_path);
const canonicalPdfBytes = await readFile(canonicalPdfPath);
const canonicalPdfStat = await stat(canonicalPdfPath);
assert.equal(createHash("sha256").update(canonicalPdfBytes).digest("hex"), subscriberPolicy.initial_asset.sha256);
assert.equal(canonicalPdfStat.size, subscriberPolicy.initial_asset.byte_count);
assert.equal(subscriberPolicy.initial_asset.staging_status, "PRIVATE_STAGING_UPLOADED");
assert.equal(subscriberPolicy.initial_asset.production_status, "UNAPPROVED");
pass("approved policy and initial canonical PDF integrity match exactly");

const stagingReceipt = JSON.parse(await readFile(resolve(root, "fixtures/initial-staging-upload-receipt.json"), "utf8"));
assert.equal(stagingReceipt.status, "PRIVATE_STAGING_UPLOADED");
assert.equal(stagingReceipt.store.name, "production-ai-handbook-staging-pdf");
assert.equal(stagingReceipt.store.id, "store_Y79UDmNrtHqx852p");
assert.equal(stagingReceipt.store.access, "private");
assert.equal(stagingReceipt.store.region, "iad1");
assert.deepEqual(stagingReceipt.store.environments, ["preview", "development"]);
assert.equal(stagingReceipt.object.sha256, subscriberPolicy.initial_asset.sha256);
assert.equal(stagingReceipt.object.byte_count, subscriberPolicy.initial_asset.byte_count);
assert.equal(stagingReceipt.object.page_count, subscriberPolicy.initial_asset.page_count);
assert.equal(stagingReceipt.source.sha256, subscriberPolicy.initial_asset.sha256);
assert.equal(stagingReceipt.production.status, "UNAPPROVED");
assert.equal(stagingReceipt.production.promotion_performed, false);
assert.equal(stagingReceipt.production.subscriber_delivery_authorized, false);
const canonicalSourceBytes = await readFile(resolve(root, "..", stagingReceipt.protected_state.canonical_source_path));
assert.equal(createHash("sha256").update(canonicalSourceBytes).digest("hex"), stagingReceipt.protected_state.canonical_source_sha256);
assert.equal(stagingReceipt.protected_state.canonical_source_unchanged, true);
assert.equal(stagingReceipt.protected_state.production_pdf_unchanged, true);
pass("private staging upload receipt matches the selected bytes and leaves production unapproved");

const firstChargePaidAt = "2026-08-04T18:00:00.000Z";
assert.equal(isFirstChargeRefundEligible({ firstCharge: true, paidAt: firstChargePaidAt, requestedAt: "2026-08-11T18:00:00.000Z", policy: subscriberPolicy }), true);
assert.equal(isFirstChargeRefundEligible({ firstCharge: true, paidAt: firstChargePaidAt, requestedAt: "2026-08-11T18:00:01.000Z", policy: subscriberPolicy }), false);
assert.equal(isFirstChargeRefundEligible({ firstCharge: false, paidAt: firstChargePaidAt, requestedAt: "2026-08-05T18:00:00.000Z", policy: subscriberPolicy }), false);
pass("first-charge refund window is inclusive through exactly seven days");

const policyActive = applyEntitlementEvent(emptyEntitlement("usr_policy"), {
  event_id: "policy_active",
  type: "subscription.activated",
  created_at: "2026-08-04T18:00:00.000Z",
  current_period_end: "2026-09-04T18:00:00.000Z",
}, subscriberPolicy);
const policyCanceled = applyEntitlementEvent(policyActive, {
  event_id: "policy_canceled",
  type: "subscription.canceled",
  created_at: "2026-08-10T18:00:00.000Z",
  current_period_end: "2026-09-04T18:00:00.000Z",
}, subscriberPolicy);
assert.equal(hasEntitledAccess(policyCanceled, "2026-09-04T17:59:59.000Z", subscriberPolicy), true);
assert.equal(hasEntitledAccess(policyCanceled, "2026-09-04T18:00:00.000Z", subscriberPolicy), false);
pass("canceled subscribers retain access only through the paid-period boundary");

const policyFailed = applyEntitlementEvent(policyActive, {
  event_id: "policy_failed_1",
  type: "billing.payment_failed",
  created_at: "2026-09-04T18:00:00.000Z",
  current_period_end: "2026-09-04T18:00:00.000Z",
}, subscriberPolicy);
const policyFailedAgain = applyEntitlementEvent(policyFailed, {
  event_id: "policy_failed_2",
  type: "billing.payment_failed",
  created_at: "2026-09-07T18:00:00.000Z",
  current_period_end: "2026-09-04T18:00:00.000Z",
}, subscriberPolicy);
assert.equal(policyFailedAgain.grace_ends_at, policyFailed.grace_ends_at);
assert.equal(hasEntitledAccess(policyFailedAgain, "2026-09-11T17:59:59.000Z", subscriberPolicy), true);
assert.equal(projectEntitlementAt(policyFailedAgain, "2026-09-11T18:00:00.000Z", subscriberPolicy).state, "SUSPENDED");
pass("past_due grants seven non-resetting days then suspends at the boundary");

for (const [type, reason] of [["billing.refund_completed", "refund_completed"], ["billing.chargeback_created", "chargeback_created"]]) {
  const suspended = applyEntitlementEvent(policyActive, {
    event_id: `policy_${reason}`,
    type,
    created_at: "2026-08-06T18:00:00.000Z",
  }, subscriberPolicy);
  assert.equal(suspended.state, "SUSPENDED");
  assert.equal(suspended.suspended_reason, reason);
  assert.equal(hasEntitledAccess(suspended, "2026-08-06T18:00:01.000Z", subscriberPolicy), false);
}
pass("completed refunds and created chargebacks suspend access immediately");

const rehearsalPlan = JSON.parse(await readFile(resolve(root, "fixtures/staging-rehearsal-plan.json"), "utf8"));
assert.equal(rehearsalPlan.external_mutations_allowed, false);
assert.deepEqual(rehearsalPlan.scenarios, [
  "initial_asset_integrity",
  "purchase_and_access",
  "cancellation_paid_period",
  "renewal_paid",
  "payment_failure_grace_and_suspension",
  "first_charge_refund",
  "chargeback_suspension",
  "pdf_replacement",
  "tuesday_delivery",
  "release_rollback",
  "provider_mutations_blocked",
]);
pass("staging rehearsal plan covers all approved scenarios with mutations disabled");

const resendService = JSON.parse(await readFile(resolve(root, "fixtures/resend-staging-service.json"), "utf8"));
assert.equal(resendService.provider, "resend");
assert.equal(resendService.plan, "Free");
assert.equal(resendService.resource_status, "onboarding");
assert.equal(resendService.domain_status, "not_started");
assert.equal(resendService.dns_provider, "GoDaddy");
assert.deepEqual(resendService.dns_nameservers, ["ns07.domaincontrol.com", "ns08.domaincontrol.com"]);
assert.deepEqual(resendService.environments, ["preview", "development"]);
assert.deepEqual(resendService.environment_variables, ["RESEND_API_KEY", "RESEND_EMAIL_DOMAIN"]);
assert.equal(resendService.production_enabled, false);
pass("Resend contract records preview/development onboarding and the not_started domain gate");

const stagingEmailContent = JSON.parse(await readFile(resolve(root, "fixtures/staging-email-content.synthetic.json"), "utf8"));
const stagingRecipient = "recipient@example.invalid";
const stagingUserId = "usr_resend_staging_test";
const stagingContentSha = serviceEmailContentSha256(stagingEmailContent);
const stagingWeeklyKey = buildWeeklySendKey(stagingEmailContent.release_id, stagingEmailContent.audience_snapshot_id, stagingContentSha);
const stagingDeliveryId = buildRecipientDeliveryId(stagingWeeklyKey, stagingUserId);
const stagingApprovalRequest = buildStagingEmailApprovalRequest({
  releaseId: stagingEmailContent.release_id,
  audienceSnapshotId: stagingEmailContent.audience_snapshot_id,
  weeklySendKey: stagingWeeklyKey,
  userId: stagingUserId,
  recipientEmail: stagingRecipient,
  subject: stagingEmailContent.subject,
  text: stagingEmailContent.text,
  html: stagingEmailContent.html,
  senderDomain: resendService.domain,
});
const stagingEmailApproval = {
  ...stagingApprovalRequest,
  approval_id: "apr_resend_staging_test",
  decision: "APPROVED",
  decided_at: "2026-08-04T18:00:00.000Z",
  expires_at: "2026-08-04T19:00:00.000Z",
  authorizer: { actor_id: "owner_synthetic", role: "release_owner", method: "recorded_manual" },
  reason: "Synthetic test approval; no external provider is contacted.",
};
let onboardingFetchCalls = 0;
const onboardingAdapter = createResendServiceEmailAdapter({
  apiKey: "synthetic_not_a_real_key",
  emailDomain: resendService.domain,
  resourceStatus: resendService.resource_status,
  domainStatus: resendService.domain_status,
  environment: "staging",
  fetchImpl: async () => {
    onboardingFetchCalls += 1;
    throw new Error("onboarding adapter must not call fetch");
  },
});
const stagingEmailInput = {
  deliveryId: stagingDeliveryId,
  weeklySendKey: stagingWeeklyKey,
  userId: stagingUserId,
  email: stagingRecipient,
  releaseId: stagingEmailContent.release_id,
  audienceSnapshotId: stagingEmailContent.audience_snapshot_id,
  subject: stagingEmailContent.subject,
  text: stagingEmailContent.text,
  html: stagingEmailContent.html,
  approval: stagingEmailApproval,
  now: new Date("2026-08-04T18:30:00.000Z"),
};
const stagingPreview = onboardingAdapter.previewSubscriberUpdate(stagingEmailInput);
assert.equal(stagingPreview.external_mutations, 0);
assert.equal(stagingPreview.delivery_id, stagingDeliveryId);
assert.equal(JSON.stringify(stagingPreview).includes(stagingRecipient), false);
assert.equal(JSON.stringify(stagingPreview).includes("synthetic_not_a_real_key"), false);
await expectAsyncError(() => onboardingAdapter.sendSubscriberUpdate(stagingEmailInput), ContractError, "RESEND_DOMAIN_NOT_VERIFIED");
assert.equal(onboardingFetchCalls, 0);
pass("Resend onboarding and no-send preview make zero provider calls and redact secrets and email");

let verifiedRequest = null;
const verifiedAdapter = createResendServiceEmailAdapter({
  apiKey: "synthetic_not_a_real_key",
  emailDomain: resendService.domain,
  resourceStatus: "verified",
  domainStatus: "verified",
  environment: "staging",
  fetchImpl: async (_url, options) => {
    verifiedRequest = options;
    return { ok: true, status: 200, async json() { return { id: "resend_synthetic_provider_id" }; } };
  },
});
const verifiedResult = await verifiedAdapter.sendSubscriberUpdate(stagingEmailInput);
assert.equal(verifiedResult.deliveryId, stagingDeliveryId);
assert.equal(verifiedRequest.headers["Idempotency-Key"], stagingDeliveryId);
assert.equal(verifiedRequest.headers.Authorization, "Bearer synthetic_not_a_real_key");
const verifiedBody = JSON.parse(verifiedRequest.body);
assert.deepEqual(verifiedBody.to, [stagingRecipient]);
assert.equal(verifiedBody.to.length, 1);
assert.equal(verifiedBody.subject, stagingEmailContent.subject);
assert.equal(verifiedBody.reply_to, "hello@surfaces.systems");
pass("verified Resend adapter binds one recipient and deterministic delivery ID to the provider request");

await expectAsyncError(
  () => verifiedAdapter.sendSubscriberUpdate({ ...stagingEmailInput, email: "different@example.invalid" }),
  ContractError,
  "STAGING_EMAIL_APPROVAL_MISMATCH",
);
await expectAsyncError(
  () => verifiedAdapter.sendSubscriberUpdate({ ...stagingEmailInput, approval: { ...stagingEmailApproval, production_authorized: true } }),
  ContractError,
  "PRODUCTION_EMAIL_REJECTED",
);
await expectAsyncError(
  () => verifiedAdapter.sendSubscriberUpdate({ ...stagingEmailInput, approval: { ...stagingEmailApproval, expires_at: "2026-08-04T20:00:01.000Z" } }),
  ContractError,
  "STAGING_EMAIL_APPROVAL_WINDOW",
);
expectContractError(
  () => createResendServiceEmailAdapter({ emailDomain: resendService.domain, resourceStatus: "active", domainStatus: "verified", environment: "production", fetchImpl: async () => ({}) }),
  "PRODUCTION_EMAIL_REJECTED",
);
expectContractError(
  () => verifiedAdapter.previewSubscriberUpdate({ ...stagingEmailInput, deliveryId: `del_${"f".repeat(64)}` }),
  "DELIVERY_ID_MISMATCH",
);
expectContractError(
  () => verifiedAdapter.previewSubscriberUpdate({ ...stagingEmailInput, weeklySendKey: buildWeeklySendKey(stagingEmailContent.release_id, "aud_changed", stagingContentSha) }),
  "WEEKLY_SEND_KEY_MISMATCH",
);
pass("Resend adapter rejects changed recipients, long approvals, production authority, production environment, and nondeterministic bindings");

expectContractError(() => assertTransition("REVIEW_PENDING", "DELIVERING"), "INVALID_TRANSITION");
pass("state skipping is rejected");

const changedApproval = structuredClone(run.approvals.send);
changedApproval.bound_artifacts.manifest_sha256 = "f".repeat(64);
expectContractError(
  () => assertApprovalCovers({
    approval: changedApproval,
    requiredScope: "SEND",
    requiredAction: "send_subscriber_update",
    environment: "test",
    releaseId: run.manifest.release_id,
    manifestSha256: run.manifestSha,
    audienceSha256: run.audienceSha,
    contentSha256: run.deliveryPlan.content.body_sha256,
    recipientCount: run.audience.recipient_count,
    now: new Date("2026-08-04T18:45:00.000Z"),
  }),
  "MANIFEST_MISMATCH",
);
pass("approval cannot be reused after a manifest change");

expectContractError(
  () => assertApprovalCovers({
    approval: run.approvals.send,
    requiredScope: "SEND",
    requiredAction: "send_subscriber_update",
    environment: "test",
    releaseId: run.manifest.release_id,
    manifestSha256: run.manifestSha,
    audienceSha256: run.audienceSha,
    contentSha256: run.deliveryPlan.content.body_sha256,
    recipientCount: run.audience.recipient_count,
    now: new Date("2026-08-04T19:01:00.000Z"),
  }),
  "APPROVAL_EXPIRED",
);
pass("expired send approval is rejected");

const changedAudience = structuredClone(run.audience);
changedAudience.recipient_refs.push("usr_delta");
changedAudience.recipient_refs.sort();
expectContractError(() => assertAudienceSnapshot(changedAudience), "RECIPIENT_COUNT");
pass("audience membership cannot change under a frozen snapshot");

const changedReceipt = structuredClone(run.promotionReceipt);
changedReceipt.observed.sha256 = "f".repeat(64);
expectContractError(() => assertPromotionReceipt(changedReceipt), "PROMOTION_MISMATCH");
pass("private asset digest mismatch is rejected");

const analyticsEvent = {
  schema_version: "1",
  event_id: "evt_synthetic_0001",
  event_name: "subscriber.pdf_access_granted",
  occurred_at: "2026-08-04T18:45:00.000Z",
  actor_ref: "usr_alpha",
  anonymous_ref: null,
  session_ref: "ses_synthetic",
  release_id: run.manifest.release_id,
  source: { channel: "linkedin", campaign: "synthetic", content: "test", referrer_host: "linkedin.com" },
  properties: { delivery_mode: "authenticated_stream" },
};
assertAnalyticsEvent(analyticsEvent);
const missingPropertyEvent = structuredClone(analyticsEvent);
missingPropertyEvent.properties = {};
expectContractError(() => assertAnalyticsEvent(missingPropertyEvent), "EVENT_PROPERTY_MISSING");
const leakingEvent = structuredClone(analyticsEvent);
leakingEvent.properties.email = "synthetic@example.invalid";
expectContractError(() => assertAnalyticsEvent(leakingEvent), "FORBIDDEN_DATA");
const unknownPropertyEvent = structuredClone(analyticsEvent);
unknownPropertyEvent.properties.unplanned_dimension = "synthetic";
expectContractError(() => assertAnalyticsEvent(unknownPropertyEvent), "EVENT_PROPERTY_UNKNOWN");
pass("analytics rejects missing, unknown, and forbidden properties");

const tamperedAudit = structuredClone(run.audit);
tamperedAudit[3].payload.state = "TAMPERED";
expectContractError(() => verifyAuditChain(tamperedAudit), "AUDIT_HASH");
pass("audit-chain tampering is detected");

const weeklyKey = run.deliveryPlan.weekly_send_key;
assert.equal(buildRecipientDeliveryId(weeklyKey, "usr_alpha"), buildRecipientDeliveryId(weeklyKey, "usr_alpha"));
assert.notEqual(buildRecipientDeliveryId(weeklyKey, "usr_alpha"), buildRecipientDeliveryId(weeklyKey, "usr_bravo"));
pass("recipient delivery IDs are deterministic and distinct");

const repo = createInMemoryEntitlementRepository({ pastDueGraceHours: 72 });
const stripeEvent = {
  eventId: "evt_stripe_synthetic_1",
  eventCreated: 1785866400,
  eventType: "customer.subscription.updated",
  customerId: "cus_synthetic",
  subscriptionId: "sub_synthetic",
  status: "active",
  currentPeriodEnd: 1788544800,
  userId: "usr_alpha",
  email: "synthetic@example.invalid",
  payloadSha256: "a".repeat(64),
};
assert.equal((await repo.applyStripeEvent(stripeEvent)).applied, true);
assert.equal((await repo.applyStripeEvent(stripeEvent)).duplicate, true);
await expectAsyncError(
  () => repo.applyStripeEvent({ ...stripeEvent, payloadSha256: "b".repeat(64) }),
  ContractError,
  "EVENT_ID_REUSE",
);
assert.deepEqual(repo.inspectForTest(), { eventCount: 1, entitlementCount: 1 });
pass("Stripe event replay is idempotent and changed-payload reuse is rejected");

const blockedAdapters = createBlockedProviderAdapters();
await expectAsyncError(
  () => blockedAdapters.DeliveryNotifier.sendSubscriberUpdate({}),
  ExternalMutationBlockedError,
  "EXTERNAL_MUTATION_BLOCKED",
);
await expectAsyncError(
  () => blockedAdapters.PrivateReleaseStore.putPrivateIfAbsent({}),
  ExternalMutationBlockedError,
  "EXTERNAL_MUTATION_BLOCKED",
);
pass("local provider adapters fail closed on email and private Blob mutations");

const duplicateManifestHash = sha256Canonical(run.manifest);
assert.equal(duplicateManifestHash, run.manifestSha);
pass("canonical manifest digest is stable");

process.stdout.write(`subscriber-ops contracts: ${passed.length} checks passed\n`);
for (const item of passed) process.stdout.write(`- ${item}\n`);
