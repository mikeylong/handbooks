#!/usr/bin/env node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBlockedProviderAdapters, ExternalMutationBlockedError } from "../lib/blocked-adapters.mjs";
import { buildSyntheticRun } from "../lib/synthetic-run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, "../fixtures/synthetic-weekly-run.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const result = buildSyntheticRun(fixture);

const adapters = createBlockedProviderAdapters({ authSession: { userId: "usr_synthetic", email: "synthetic@example.invalid" } });
let externalMutationBlocked = false;
try {
  await adapters.DeliveryNotifier.sendSubscriberUpdate({});
} catch (error) {
  if (!(error instanceof ExternalMutationBlockedError)) throw error;
  externalMutationBlocked = true;
}
if (!externalMutationBlocked) throw new Error("dry-run adapter unexpectedly allowed an external mutation");

const outputDir = await mkdtemp(join(tmpdir(), "subscriber-ops-dry-run."));
const artifacts = {
  "release-manifest.json": result.manifest,
  "editorial-approval.json": result.approvals.editorial,
  "promotion-approval.json": result.approvals.promotion,
  "promotion-receipt.json": result.promotionReceipt,
  "audience-snapshot.json": result.audience,
  "delivery-plan.json": result.deliveryPlan,
  "send-approval.json": result.approvals.send,
  "delivery-reconciliation.json": result.deliveries,
  "audit-chain.json": result.audit,
};
for (const [filename, value] of Object.entries(artifacts)) {
  await writeFile(join(outputDir, filename), `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
}

const summary = {
  status: "passed",
  mode: "synthetic_local_only",
  external_mutations: 0,
  external_mutation_adapter_check: "blocked",
  release_id: result.manifest.release_id,
  manifest_sha256: result.manifestSha,
  audience_count: result.audience.recipient_count,
  delivery_rows: result.deliveries.length,
  state_transitions: result.statePath.length - 1,
  audit_events: result.audit.length,
  audit_head_sha256: result.auditHeadSha256,
  output_dir: outputDir,
};
await writeFile(join(outputDir, "dry-run-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
