#!/usr/bin/env node
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRecipientDeliveryId,
  buildWeeklySendKey,
} from "../lib/contracts.mjs";
import {
  buildStagingEmailApprovalRequest,
  createResendServiceEmailAdapter,
  serviceEmailContentSha256,
} from "../lib/resend-service-email.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const opsRoot = resolve(here, "..");
const args = process.argv.slice(2);
const sendRequested = args.includes("--send");
const providerMutationConfirmed = args.includes("--confirm-staging-provider-mutation");
const prepareRequested = args.includes("--prepare-request");

function option(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const approvalPath = option("--approval");
const contentArgument = option("--content");
const knownFlags = new Set(["--send", "--confirm-staging-provider-mutation", "--prepare-request", "--approval", "--content"]);
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (!knownFlags.has(arg)) throw new Error(`unknown option ${arg}`);
  if (["--approval", "--content"].includes(arg)) index += 1;
}
if (sendRequested && prepareRequested) throw new Error("--send and --prepare-request are mutually exclusive");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const service = await readJson(resolve(opsRoot, "fixtures/resend-staging-service.json"));
const syntheticContentPath = resolve(opsRoot, "fixtures/staging-email-content.synthetic.json");
const contentPath = contentArgument ? resolve(contentArgument) : syntheticContentPath;
const content = await readJson(contentPath);
if (content.schema_version !== "1" || content.environment !== "staging") throw new Error("content must be a schema-version 1 staging message");
for (const key of ["release_id", "audience_snapshot_id", "subject", "text", "html"]) {
  if (typeof content[key] !== "string" || content[key] === "") throw new Error(`content.${key} is required`);
}

const defaultUserId = "usr_staging_email_synthetic";
const defaultRecipient = "recipient@example.invalid";
const userId = sendRequested || prepareRequested ? process.env.RESEND_STAGING_USER_ID : defaultUserId;
const recipient = sendRequested || prepareRequested ? process.env.RESEND_STAGING_RECIPIENT : defaultRecipient;
if (!userId || !recipient) throw new Error("RESEND_STAGING_USER_ID and RESEND_STAGING_RECIPIENT are required for this mode");

const contentSha256 = serviceEmailContentSha256(content);
const weeklySendKey = buildWeeklySendKey(content.release_id, content.audience_snapshot_id, contentSha256);
const deliveryId = buildRecipientDeliveryId(weeklySendKey, userId);
const request = buildStagingEmailApprovalRequest({
  releaseId: content.release_id,
  audienceSnapshotId: content.audience_snapshot_id,
  weeklySendKey,
  userId,
  recipientEmail: recipient,
  subject: content.subject,
  text: content.text,
  html: content.html,
  senderDomain: service.domain,
});

if (prepareRequested) {
  const outputDir = await mkdtemp(join(tmpdir(), "resend-staging-approval-request."));
  const requestArtifact = {
    ...request,
    status: "AWAITING_EXPLICIT_APPROVAL",
    approval_fields_required: ["approval_id", "decision", "decided_at", "expires_at", "authorizer", "reason"],
    note: "This request is not an approval and cannot authorize a send.",
  };
  const outputPath = join(outputDir, "staging-email-approval-request.json");
  await writeFile(outputPath, `${JSON.stringify(requestArtifact, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write(`${JSON.stringify({ status: "prepared", mode: "no_send", output_path: outputPath, delivery_id: deliveryId, external_mutations: 0 }, null, 2)}\n`);
  process.exit(0);
}

const adapter = createResendServiceEmailAdapter({
  apiKey: sendRequested ? process.env.RESEND_API_KEY : undefined,
  emailDomain: sendRequested ? process.env.RESEND_EMAIL_DOMAIN : service.domain,
  resourceStatus: service.resource_status,
  domainStatus: service.domain_status,
  environment: "staging",
  fromName: service.sender.from_name,
  fromLocalPart: service.sender.local_part,
  replyToLocalPart: service.sender.reply_to_local_part,
});

const input = {
  deliveryId,
  weeklySendKey,
  userId,
  email: recipient,
  releaseId: content.release_id,
  audienceSnapshotId: content.audience_snapshot_id,
  subject: content.subject,
  text: content.text,
  html: content.html,
};

if (!sendRequested) {
  const preview = adapter.previewSubscriberUpdate(input);
  process.stdout.write(`${JSON.stringify({
    status: service.domain_status === "verified" ? "ready_for_scoped_approval" : "blocked",
    mode: "no_send",
    provider: preview.provider,
    environment: preview.environment,
    resource_status: preview.resource_status,
    domain_status: preview.domain_status,
    domain_verified: service.domain_status === "verified",
    delivery_id: preview.delivery_id,
    external_mutations: 0,
    remaining_gate: service.domain_status === "verified" ? "explicit staging approval" : "Resend domain verification",
  }, null, 2)}\n`);
  process.exit(0);
}

if (!providerMutationConfirmed) throw new Error("--send also requires --confirm-staging-provider-mutation");
if (!approvalPath) throw new Error("--send requires --approval /absolute/path/to/approval.json");
if (!isAbsolute(approvalPath)) throw new Error("--approval path must be absolute");
if (!contentArgument || !isAbsolute(contentArgument)) throw new Error("--send requires an absolute --content path");
const approval = await readJson(approvalPath);
const result = await adapter.sendSubscriberUpdate({ ...input, approval, now: new Date() });
process.stdout.write(`${JSON.stringify({
  status: "provider_accepted",
  environment: "staging",
  provider: "resend",
  delivery_id: result.deliveryId,
  provider_message_id: result.providerMessageId,
}, null, 2)}\n`);
