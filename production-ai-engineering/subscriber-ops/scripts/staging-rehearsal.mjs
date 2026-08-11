#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRecipientDeliveryId, buildWeeklySendKey, sha256Text } from "../lib/contracts.mjs";
import { createBlockedProviderAdapters, ExternalMutationBlockedError } from "../lib/blocked-adapters.mjs";
import {
  applyEntitlementEvent,
  assertSubscriberPolicy,
  createLocalReleaseProjection,
  emptyEntitlement,
  hasEntitledAccess,
  isFirstChargeRefundEligible,
  projectEntitlementAt,
} from "../lib/policy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const opsRoot = resolve(here, "..");
const repoRoot = resolve(opsRoot, "..");
const policy = JSON.parse(await readFile(resolve(opsRoot, "fixtures/subscriber-policy.v1.json"), "utf8"));
const plan = JSON.parse(await readFile(resolve(opsRoot, "fixtures/staging-rehearsal-plan.json"), "utf8"));
const stagingReceipt = JSON.parse(await readFile(resolve(opsRoot, "fixtures/initial-staging-upload-receipt.json"), "utf8"));
assertSubscriberPolicy(policy);
assert.equal(plan.external_mutations_allowed, false);
assert.equal(plan.policy_id, policy.policy_id);

const scenarioResults = [];
async function scenario(name, check) {
  assert.equal(plan.scenarios.includes(name), true, `scenario ${name} is not in the rehearsal plan`);
  await check();
  scenarioResults.push({ scenario: name, status: "passed" });
}

const assetPath = resolve(repoRoot, policy.initial_asset.source_path);
const assetBytes = await readFile(assetPath);
const assetStat = await stat(assetPath);
const observedAssetSha = createHash("sha256").update(assetBytes).digest("hex");
await scenario("initial_asset_integrity", async () => {
  assert.equal(observedAssetSha, policy.initial_asset.sha256);
  assert.equal(assetStat.size, policy.initial_asset.byte_count);
  assert.equal(policy.initial_asset.staging_status, "PRIVATE_STAGING_UPLOADED");
  assert.equal(stagingReceipt.status, "PRIVATE_STAGING_UPLOADED");
  assert.equal(stagingReceipt.store.access, "private");
  assert.deepEqual(stagingReceipt.store.environments, ["preview", "development"]);
  assert.equal(stagingReceipt.object.sha256, observedAssetSha);
  assert.equal(stagingReceipt.object.byte_count, assetStat.size);
  assert.equal(stagingReceipt.production.status, "UNAPPROVED");
});

const activated = applyEntitlementEvent(
  emptyEntitlement("usr_staging_synthetic"),
  {
    event_id: "ent_purchase_1",
    type: "subscription.activated",
    created_at: "2026-08-04T18:00:00.000Z",
    current_period_end: "2026-09-04T18:00:00.000Z",
  },
  policy,
);
await scenario("purchase_and_access", async () => {
  assert.equal(activated.state, "ACTIVE");
  assert.equal(hasEntitledAccess(activated, "2026-08-05T18:00:00.000Z", policy), true);
});

const canceled = applyEntitlementEvent(
  activated,
  {
    event_id: "ent_cancel_1",
    type: "subscription.canceled",
    created_at: "2026-08-10T18:00:00.000Z",
    current_period_end: "2026-09-04T18:00:00.000Z",
  },
  policy,
);
await scenario("cancellation_paid_period", async () => {
  assert.equal(canceled.state, "CANCELED_PAID_PERIOD");
  assert.equal(hasEntitledAccess(canceled, "2026-09-04T17:59:59.000Z", policy), true);
  assert.equal(hasEntitledAccess(canceled, "2026-09-04T18:00:00.000Z", policy), false);
});

const renewed = applyEntitlementEvent(
  activated,
  {
    event_id: "ent_renewal_1",
    type: "billing.renewal_paid",
    created_at: "2026-09-04T17:55:00.000Z",
    current_period_end: "2026-10-04T18:00:00.000Z",
  },
  policy,
);
await scenario("renewal_paid", async () => {
  assert.equal(renewed.state, "ACTIVE");
  assert.equal(hasEntitledAccess(renewed, "2026-09-20T18:00:00.000Z", policy), true);
});

const failed = applyEntitlementEvent(
  activated,
  {
    event_id: "ent_failed_1",
    type: "billing.payment_failed",
    created_at: "2026-09-04T18:00:00.000Z",
    current_period_end: "2026-09-04T18:00:00.000Z",
  },
  policy,
);
const repeatedFailure = applyEntitlementEvent(
  failed,
  {
    event_id: "ent_failed_2",
    type: "billing.payment_failed",
    created_at: "2026-09-07T18:00:00.000Z",
    current_period_end: "2026-09-04T18:00:00.000Z",
  },
  policy,
);
await scenario("payment_failure_grace_and_suspension", async () => {
  assert.equal(failed.state, "PAST_DUE_GRACE");
  assert.equal(repeatedFailure.grace_ends_at, failed.grace_ends_at);
  assert.equal(hasEntitledAccess(repeatedFailure, "2026-09-11T17:59:59.000Z", policy), true);
  const suspended = projectEntitlementAt(repeatedFailure, "2026-09-11T18:00:00.000Z", policy);
  assert.equal(suspended.state, "SUSPENDED");
  assert.equal(suspended.suspended_reason, "past_due_grace_expired");
});

const refundPaidAt = "2026-08-04T18:00:00.000Z";
const refunded = applyEntitlementEvent(
  activated,
  {
    event_id: "ent_refund_1",
    type: "billing.refund_completed",
    created_at: "2026-08-06T18:00:00.000Z",
  },
  policy,
);
await scenario("first_charge_refund", async () => {
  assert.equal(isFirstChargeRefundEligible({ firstCharge: true, paidAt: refundPaidAt, requestedAt: "2026-08-11T18:00:00.000Z", policy }), true);
  assert.equal(isFirstChargeRefundEligible({ firstCharge: true, paidAt: refundPaidAt, requestedAt: "2026-08-11T18:00:01.000Z", policy }), false);
  assert.equal(isFirstChargeRefundEligible({ firstCharge: false, paidAt: refundPaidAt, requestedAt: "2026-08-05T18:00:00.000Z", policy }), false);
  assert.equal(refunded.state, "SUSPENDED");
  assert.equal(hasEntitledAccess(refunded, "2026-08-06T18:00:01.000Z", policy), false);
});

const chargeback = applyEntitlementEvent(
  activated,
  {
    event_id: "ent_chargeback_1",
    type: "billing.chargeback_created",
    created_at: "2026-08-07T18:00:00.000Z",
  },
  policy,
);
await scenario("chargeback_suspension", async () => {
  assert.equal(chargeback.state, "SUSPENDED");
  assert.equal(chargeback.suspended_reason, "chargeback_created");
  assert.equal(hasEntitledAccess(chargeback, "2026-08-07T18:00:01.000Z", policy), false);
});

const initialRelease = { release_id: "rel_initial_canonical", sha256: policy.initial_asset.sha256 };
const replacementRelease = { release_id: "rel_replacement_synthetic", sha256: sha256Text("synthetic staging replacement; not a PDF") };
const releaseProjection = createLocalReleaseProjection(initialRelease);
await scenario("pdf_replacement", async () => {
  assert.equal(releaseProjection.replace(replacementRelease).release_id, replacementRelease.release_id);
  assert.equal(releaseProjection.current().sha256, replacementRelease.sha256);
});

const weeklySendKey = buildWeeklySendKey(replacementRelease.release_id, "aud_staging_synthetic", sha256Text("synthetic Tuesday note"));
const simulatedRecipients = ["usr_staging_alpha", "usr_staging_bravo"];
const simulatedDeliveries = simulatedRecipients.map((userId) => ({
  delivery_id: buildRecipientDeliveryId(weeklySendKey, userId),
  user_id: userId,
  result: "simulated_not_sent",
}));
await scenario("tuesday_delivery", async () => {
  assert.equal(simulatedDeliveries.length, 2);
  assert.equal(new Set(simulatedDeliveries.map((entry) => entry.delivery_id)).size, 2);
  assert.equal(simulatedDeliveries.every((entry) => entry.result === "simulated_not_sent"), true);
});

await scenario("release_rollback", async () => {
  assert.equal(releaseProjection.rollback(initialRelease.release_id).release_id, initialRelease.release_id);
  assert.equal(releaseProjection.current().sha256, policy.initial_asset.sha256);
});

const adapters = createBlockedProviderAdapters();
let blockedMutationCount = 0;
for (const mutation of [
  () => adapters.BillingAdapter.createSubscriptionCheckout({}),
  () => adapters.PrivateReleaseStore.putPrivateIfAbsent({}),
  () => adapters.DeliveryNotifier.sendSubscriberUpdate({}),
]) {
  try {
    await mutation();
  } catch (error) {
    if (!(error instanceof ExternalMutationBlockedError)) throw error;
    blockedMutationCount += 1;
  }
}
await scenario("provider_mutations_blocked", async () => {
  assert.equal(blockedMutationCount, 3);
});

assert.deepEqual(scenarioResults.map((entry) => entry.scenario), plan.scenarios);
const outputDir = await mkdtemp(join(tmpdir(), "subscriber-ops-staging-rehearsal."));
const report = {
  schema_version: "1",
  status: "passed",
  mode: plan.mode,
  policy_id: policy.policy_id,
  scenarios: scenarioResults,
  initial_asset: {
    source_path: policy.initial_asset.source_path,
    sha256: observedAssetSha,
    byte_count: assetStat.size,
    staging_upload_performed_by_rehearsal: false,
    staging_upload_confirmed_by_receipt: true,
    staging_status: policy.initial_asset.staging_status,
    staging_store_id: stagingReceipt.store.id,
    production_status: stagingReceipt.production.status,
  },
  blocked_provider_mutations: blockedMutationCount,
  external_mutations: 0,
  simulated_delivery_rows: simulatedDeliveries.length,
  final_simulated_release_id: releaseProjection.current().release_id,
  output_dir: outputDir,
};
await writeFile(join(outputDir, "staging-rehearsal-report.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
