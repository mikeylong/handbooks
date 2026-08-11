import { createHash } from "node:crypto";

const SHA256_RE = /^[a-f0-9]{64}$/;
const RELEASE_ID_RE = /^rel_[a-z0-9][a-z0-9_-]{7,95}$/;
const APPROVAL_ID_RE = /^apr_[a-z0-9][a-z0-9_-]{7,95}$/;
const AUDIENCE_ID_RE = /^aud_[a-z0-9][a-z0-9_-]{7,95}$/;

export const RELEASE_KINDS = Object.freeze(["EDITION_AND_NOTE", "NOTE_ONLY"]);
export const APPROVAL_SCOPES = Object.freeze([
  "EDITORIAL",
  "PROMOTION",
  "SEND",
  "REFUND",
  "ENTITLEMENT_OVERRIDE",
  "DEPLOYMENT",
  "LIVE_BILLING",
]);

export const STATE_TRANSITIONS = Object.freeze({
  CANDIDATE_INGESTED: ["REVIEW_PENDING", "INCIDENT_HOLD"],
  REVIEW_PENDING: ["REVIEW_REJECTED", "EDITORIALLY_APPROVED", "INCIDENT_HOLD"],
  REVIEW_REJECTED: [],
  EDITORIALLY_APPROVED: ["PROMOTION_PLANNED", "INCIDENT_HOLD"],
  PROMOTION_PLANNED: ["PRIVATE_ASSET_VERIFIED", "INCIDENT_HOLD"],
  PRIVATE_ASSET_VERIFIED: ["AUDIENCE_SNAPSHOT_READY", "INCIDENT_HOLD", "WITHDRAWN"],
  AUDIENCE_SNAPSHOT_READY: ["SEND_APPROVED", "INCIDENT_HOLD", "WITHDRAWN"],
  SEND_APPROVED: ["DELIVERING", "INCIDENT_HOLD", "WITHDRAWN"],
  DELIVERING: ["DELIVERED", "INCIDENT_HOLD", "WITHDRAWN"],
  DELIVERED: ["MONITORING", "INCIDENT_HOLD", "WITHDRAWN"],
  MONITORING: ["CLOSED", "INCIDENT_HOLD", "WITHDRAWN"],
  CLOSED: ["INCIDENT_HOLD"],
  INCIDENT_HOLD: [
    "REVIEW_PENDING",
    "EDITORIALLY_APPROVED",
    "PROMOTION_PLANNED",
    "PRIVATE_ASSET_VERIFIED",
    "AUDIENCE_SNAPSHOT_READY",
    "SEND_APPROVED",
    "DELIVERING",
    "DELIVERED",
    "MONITORING",
    "WITHDRAWN",
  ],
  WITHDRAWN: ["MONITORING"],
});

export const ANALYTICS_EVENT_DEFINITIONS = Object.freeze({
  "acquisition.teaser_viewed": ["teaser_id", "teaser_version", "placement"],
  "acquisition.sample_opened": ["sample_version", "format"],
  "acquisition.sample_downloaded": ["sample_version", "asset_id"],
  "acquisition.sample_engaged": ["sample_version", "engagement_type", "engagement_rule_version"],
  "acquisition.offer_viewed": ["offer_id", "page_version"],
  "acquisition.email_opted_in": ["consent_version", "subscription_category", "verification_method"],
  "acquisition.referral_shared": ["asset_id", "share_method"],
  "billing.checkout_started": ["price_key", "checkout_flow_version"],
  "billing.subscription_activated": ["entitlement_policy_version", "billing_interval"],
  "billing.renewal_paid": ["billing_cycle_number", "amount_minor", "currency"],
  "billing.payment_failed": ["failure_class", "billing_cycle"],
  "subscriber.pdf_access_requested": ["access_route"],
  "subscriber.pdf_access_granted": ["delivery_mode"],
  "subscriber.pdf_access_denied": ["reason_code"],
  "subscriber.weekly_delivery_accepted": ["delivery_id", "provider_result"],
  "subscriber.weekly_delivery_bounced": ["delivery_id", "bounce_class"],
  "subscriber.field_note_opened": ["delivery_id", "tracking_method"],
  "billing.cancellation_requested": ["path"],
  "billing.subscription_ended": ["reason_code"],
  "billing.refund_requested": ["reason_code", "first_charge"],
  "billing.refund_completed": ["reason_code", "amount_minor", "currency"],
  "operations.incident_opened": ["severity", "category"],
  "operations.release_withdrawn": ["reason_code"],
});

export const ANALYTICS_EVENTS = Object.freeze(Object.keys(ANALYTICS_EVENT_DEFINITIONS));

const FORBIDDEN_DATA_KEYS = new Set([
  "email",
  "name",
  "ip",
  "ip_address",
  "token",
  "signature",
  "signed_url",
  "signedurl",
  "stripe_customer_id",
  "stripecustomerid",
  "raw_webhook",
  "rawwebhook",
]);

export class ContractError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ContractError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ContractError(code, message);
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_OBJECT", `${label} must be an object`);
  }
}

function assertNonemptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail("INVALID_STRING", `${label} must be a non-empty string`);
  }
}

function assertIsoDateTime(value, label) {
  assertNonemptyString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || !value.includes("T")) {
    fail("INVALID_DATETIME", `${label} must be an ISO date-time`);
  }
}

export function assertSha256(value, label = "sha256") {
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    fail("INVALID_SHA256", `${label} must be a lowercase SHA-256 digest`);
  }
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortCanonical(value[key])]),
  );
}

export function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

export function sha256Text(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function sha256Canonical(value) {
  return sha256Text(canonicalJson(value));
}

function assertArtifact(value, label) {
  assertObject(value, label);
  assertNonemptyString(value.path, `${label}.path`);
  assertSha256(value.sha256, `${label}.sha256`);
}

export function assertReleaseManifest(manifest) {
  assertObject(manifest, "release manifest");
  if (manifest.schema_version !== "1") fail("SCHEMA_VERSION", "release schema_version must be 1");
  if (!RELEASE_ID_RE.test(manifest.release_id ?? "")) fail("RELEASE_ID", "release_id is invalid");
  if (!RELEASE_KINDS.includes(manifest.release_kind)) fail("RELEASE_KIND", "release_kind is invalid");
  assertIsoDateTime(manifest.created_at, "created_at");

  assertObject(manifest.candidate, "candidate");
  assertNonemptyString(manifest.candidate.run_id, "candidate.run_id");
  assertNonemptyString(manifest.candidate.run_dir, "candidate.run_dir");
  if (manifest.candidate.status !== "ready") fail("CANDIDATE_NOT_READY", "candidate status must be ready");
  assertObject(manifest.candidate.reports, "candidate.reports");
  const reportEntries = Object.entries(manifest.candidate.reports);
  if (reportEntries.length < 5) fail("REPORTS_MISSING", "at least five candidate reports are required");
  for (const [name, artifact] of reportEntries) assertArtifact(artifact, `candidate.reports.${name}`);

  assertObject(manifest.field_note, "field_note");
  assertArtifact(manifest.field_note, "field_note");
  assertNonemptyString(manifest.field_note.subject, "field_note.subject");
  if (manifest.field_note.subject.length > 140) fail("SUBJECT_LENGTH", "field note subject is longer than 140 characters");

  if (manifest.release_kind === "EDITION_AND_NOTE") {
    assertNonemptyString(manifest.edition_version, "edition_version");
    assertObject(manifest.candidate.pdf, "candidate.pdf");
    assertArtifact(manifest.candidate.pdf, "candidate.pdf");
    if (!Number.isInteger(manifest.candidate.pdf.byte_count) || manifest.candidate.pdf.byte_count < 1) {
      fail("PDF_BYTES", "candidate.pdf.byte_count must be positive");
    }
    if (!Number.isInteger(manifest.candidate.pdf.page_count) || manifest.candidate.pdf.page_count < 1) {
      fail("PDF_PAGES", "candidate.pdf.page_count must be positive");
    }
    if (manifest.candidate.pdf.content_type !== "application/pdf") fail("PDF_MIME", "candidate PDF MIME type is invalid");
    if (!manifest.candidate.pdf.filename?.endsWith(".pdf") || /[/\\]/.test(manifest.candidate.pdf.filename)) {
      fail("PDF_FILENAME", "candidate PDF filename is invalid");
    }
    if (manifest.field_note.edition_changed !== true) fail("EDITION_CHANGE", "edition release must mark the field note changed");
  } else {
    if (manifest.edition_version !== null) fail("NOTE_ONLY_VERSION", "note-only release cannot set an edition version");
    if (manifest.candidate.pdf !== null) fail("NOTE_ONLY_PDF", "note-only release cannot promote a candidate PDF");
    if (manifest.field_note.edition_changed !== false) fail("NOTE_ONLY_CHANGE", "note-only field note must mark edition_changed false");
    assertNonemptyString(manifest.previous_release_id, "previous_release_id");
  }

  assertObject(manifest.distribution, "distribution");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.distribution.delivery_date ?? "")) {
    fail("DELIVERY_DATE", "distribution.delivery_date must be YYYY-MM-DD");
  }
  if (manifest.distribution.timezone !== "America/Los_Angeles") fail("TIMEZONE", "delivery timezone must be America/Los_Angeles");
  assertNonemptyString(manifest.distribution.audience_rule_version, "distribution.audience_rule_version");

  assertObject(manifest.protected_state, "protected_state");
  if (manifest.protected_state.canonical_source_unchanged !== true) fail("CANONICAL_CHANGED", "canonical source must remain unchanged");
  if (manifest.protected_state.production_pdf_unchanged !== true) fail("PRODUCTION_CHANGED", "production PDF must remain unchanged");
  return manifest;
}

export function assertApproval(approval) {
  assertObject(approval, "approval");
  if (approval.schema_version !== "1") fail("SCHEMA_VERSION", "approval schema_version must be 1");
  if (!APPROVAL_ID_RE.test(approval.approval_id ?? "")) fail("APPROVAL_ID", "approval_id is invalid");
  if (!APPROVAL_SCOPES.includes(approval.scope)) fail("APPROVAL_SCOPE", "approval scope is invalid");
  if (!["test", "staging", "production"].includes(approval.environment)) fail("ENVIRONMENT", "approval environment is invalid");
  if (!["APPROVED", "REJECTED"].includes(approval.decision)) fail("DECISION", "approval decision is invalid");
  assertIsoDateTime(approval.decided_at, "approval.decided_at");
  assertIsoDateTime(approval.expires_at, "approval.expires_at");
  if (Date.parse(approval.expires_at) <= Date.parse(approval.decided_at)) fail("APPROVAL_WINDOW", "approval must expire after it is decided");
  assertObject(approval.authorizer, "approval.authorizer");
  assertNonemptyString(approval.authorizer.actor_id, "approval.authorizer.actor_id");
  assertNonemptyString(approval.authorizer.role, "approval.authorizer.role");
  if (!Array.isArray(approval.allowed_actions) || approval.allowed_actions.length === 0) {
    fail("ALLOWED_ACTIONS", "approval must name at least one allowed action");
  }
  assertObject(approval.bound_artifacts, "approval.bound_artifacts");
  if (approval.bound_artifacts.manifest_sha256 !== null) {
    assertSha256(approval.bound_artifacts.manifest_sha256, "approval.bound_artifacts.manifest_sha256");
  }
  for (const key of ["audience_sha256", "content_sha256", "refund_request_sha256"]) {
    if (approval.bound_artifacts[key] != null) assertSha256(approval.bound_artifacts[key], `approval.bound_artifacts.${key}`);
  }
  assertNonemptyString(approval.reason, "approval.reason");
  return approval;
}

export function assertApprovalCovers({
  approval,
  requiredScope,
  requiredAction,
  environment,
  releaseId,
  manifestSha256,
  audienceSha256 = null,
  contentSha256 = null,
  recipientCount = null,
  now,
}) {
  assertApproval(approval);
  const at = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(at.getTime())) fail("NOW_INVALID", "approval verification time is invalid");
  if (approval.decision !== "APPROVED") fail("NOT_APPROVED", "approval decision is not APPROVED");
  if (approval.scope !== requiredScope) fail("SCOPE_MISMATCH", `approval does not cover ${requiredScope}`);
  if (approval.environment !== environment) fail("ENVIRONMENT_MISMATCH", "approval environment does not match");
  if (approval.release_id !== releaseId) fail("RELEASE_MISMATCH", "approval release_id does not match");
  if (approval.bound_artifacts.manifest_sha256 !== manifestSha256) fail("MANIFEST_MISMATCH", "approval manifest digest does not match");
  if (audienceSha256 !== null && approval.bound_artifacts.audience_sha256 !== audienceSha256) {
    fail("AUDIENCE_MISMATCH", "approval audience digest does not match");
  }
  if (contentSha256 !== null && approval.bound_artifacts.content_sha256 !== contentSha256) {
    fail("CONTENT_MISMATCH", "approval content digest does not match");
  }
  if (!approval.allowed_actions.includes(requiredAction)) fail("ACTION_NOT_ALLOWED", `approval does not allow ${requiredAction}`);
  if (at.getTime() > Date.parse(approval.expires_at)) fail("APPROVAL_EXPIRED", "approval is expired");
  if (at.getTime() < Date.parse(approval.decided_at)) fail("APPROVAL_NOT_YET_VALID", "approval predates verification time");
  if (recipientCount !== null && approval.recipient_ceiling != null && recipientCount > approval.recipient_ceiling) {
    fail("RECIPIENT_CEILING", "recipient count exceeds approval ceiling");
  }
  if (approval.scheduled_not_before && at.getTime() < Date.parse(approval.scheduled_not_before)) {
    fail("SEND_TOO_EARLY", "current time is before the approved window");
  }
  if (approval.scheduled_not_after && at.getTime() > Date.parse(approval.scheduled_not_after)) {
    fail("SEND_TOO_LATE", "current time is after the approved window");
  }
  return Object.freeze({ ...approval, verified_at: at.toISOString() });
}

export function recipientSetSha256(recipientRefs) {
  if (!Array.isArray(recipientRefs)) fail("RECIPIENTS", "recipientRefs must be an array");
  const sorted = [...recipientRefs].sort();
  if (new Set(sorted).size !== sorted.length) fail("DUPLICATE_RECIPIENT", "recipientRefs contain a duplicate");
  return sha256Canonical(sorted);
}

export function assertAudienceSnapshot(snapshot) {
  assertObject(snapshot, "audience snapshot");
  if (snapshot.schema_version !== "1") fail("SCHEMA_VERSION", "audience schema_version must be 1");
  if (!AUDIENCE_ID_RE.test(snapshot.snapshot_id ?? "")) fail("AUDIENCE_ID", "snapshot_id is invalid");
  assertNonemptyString(snapshot.release_id, "audience.release_id");
  assertIsoDateTime(snapshot.created_at, "audience.created_at");
  assertIsoDateTime(snapshot.eligibility_as_of, "audience.eligibility_as_of");
  assertNonemptyString(snapshot.rule_version, "audience.rule_version");
  if (snapshot.communication_basis !== "contractual_subscriber_delivery") {
    fail("COMMUNICATION_BASIS", "weekly audience must use contractual subscriber delivery basis");
  }
  if (!Array.isArray(snapshot.recipient_refs)) fail("RECIPIENTS", "audience.recipient_refs must be an array");
  const expectedSorted = [...snapshot.recipient_refs].sort();
  if (canonicalJson(expectedSorted) !== canonicalJson(snapshot.recipient_refs)) {
    fail("RECIPIENT_ORDER", "audience recipient_refs must be sorted");
  }
  if (snapshot.recipient_count !== snapshot.recipient_refs.length) fail("RECIPIENT_COUNT", "audience recipient count does not match");
  const expectedSha = recipientSetSha256(snapshot.recipient_refs);
  if (snapshot.recipient_set_sha256 !== expectedSha) fail("RECIPIENT_DIGEST", "audience recipient digest does not match");
  assertObject(snapshot.exclusions, "audience.exclusions");
  for (const [reason, count] of Object.entries(snapshot.exclusions)) {
    if (!Number.isInteger(count) || count < 0) fail("EXCLUSION_COUNT", `audience exclusion ${reason} is invalid`);
  }
  return snapshot;
}

export function buildWeeklySendKey(releaseId, snapshotId, contentSha256) {
  assertNonemptyString(releaseId, "releaseId");
  assertNonemptyString(snapshotId, "snapshotId");
  assertSha256(contentSha256, "contentSha256");
  if (releaseId.includes(":") || snapshotId.includes(":")) fail("IDEMPOTENCY_KEY", "send key components cannot contain colons");
  return `weekly:${releaseId}:${snapshotId}:${contentSha256}`;
}

export function buildRecipientDeliveryId(weeklySendKey, userId) {
  assertNonemptyString(weeklySendKey, "weeklySendKey");
  assertNonemptyString(userId, "userId");
  return `del_${sha256Text(`${weeklySendKey}:${userId}`)}`;
}

export function assertDeliveryPlan(plan) {
  assertObject(plan, "delivery plan");
  if (plan.schema_version !== "1") fail("SCHEMA_VERSION", "delivery plan schema_version must be 1");
  assertNonemptyString(plan.delivery_plan_id, "delivery_plan_id");
  assertNonemptyString(plan.release_id, "delivery.release_id");
  assertSha256(plan.manifest_sha256, "delivery.manifest_sha256");
  assertNonemptyString(plan.audience_snapshot_id, "delivery.audience_snapshot_id");
  assertSha256(plan.audience_sha256, "delivery.audience_sha256");
  if (!Number.isInteger(plan.recipient_count) || plan.recipient_count < 0) fail("RECIPIENT_COUNT", "delivery recipient_count is invalid");
  assertObject(plan.content, "delivery.content");
  assertNonemptyString(plan.content.subject, "delivery.content.subject");
  assertSha256(plan.content.body_sha256, "delivery.content.body_sha256");
  if (!/^https:\/\//.test(plan.content.access_url_origin ?? "")) fail("ACCESS_ORIGIN", "access URL origin must use HTTPS");
  assertObject(plan.window, "delivery.window");
  assertIsoDateTime(plan.window.not_before, "delivery.window.not_before");
  assertIsoDateTime(plan.window.not_after, "delivery.window.not_after");
  if (Date.parse(plan.window.not_after) <= Date.parse(plan.window.not_before)) fail("DELIVERY_WINDOW", "delivery window is invalid");
  if (plan.window.timezone !== "America/Los_Angeles") fail("TIMEZONE", "delivery timezone is invalid");
  const expected = buildWeeklySendKey(plan.release_id, plan.audience_snapshot_id, plan.content.body_sha256);
  if (plan.weekly_send_key !== expected) fail("SEND_KEY", "weekly send key does not match the bound artifacts");
  return plan;
}

export function assertPromotionReceipt(receipt) {
  assertObject(receipt, "promotion receipt");
  assertNonemptyString(receipt.release_id, "promotion.release_id");
  assertSha256(receipt.manifest_sha256, "promotion.manifest_sha256");
  assertNonemptyString(receipt.approval_id, "promotion.approval_id");
  assertNonemptyString(receipt.object_key, "promotion.object_key");
  assertObject(receipt.expected, "promotion.expected");
  assertObject(receipt.observed, "promotion.observed");
  for (const evidence of [receipt.expected, receipt.observed]) {
    assertSha256(evidence.sha256, "promotion object sha256");
    if (!Number.isInteger(evidence.byte_count) || evidence.byte_count < 1) fail("PROMOTION_BYTES", "promotion byte count is invalid");
    if (evidence.content_type !== "application/pdf") fail("PROMOTION_MIME", "promotion MIME type is invalid");
    assertNonemptyString(evidence.filename, "promotion filename");
  }
  if (canonicalJson(receipt.expected) !== canonicalJson(receipt.observed)) {
    fail("PROMOTION_MISMATCH", "private object verification does not match the approved bytes");
  }
  assertIsoDateTime(receipt.verified_at, "promotion.verified_at");
  assertNonemptyString(receipt.database_receipt_ref, "promotion.database_receipt_ref");
  return receipt;
}

export function assertTransition(from, to) {
  if (!Object.hasOwn(STATE_TRANSITIONS, from)) fail("UNKNOWN_STATE", `unknown release state ${from}`);
  if (!STATE_TRANSITIONS[from].includes(to)) fail("INVALID_TRANSITION", `transition ${from} -> ${to} is not allowed`);
  return true;
}

function assertNoForbiddenData(value, path = "event") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenData(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replaceAll("-", "_");
    if (FORBIDDEN_DATA_KEYS.has(normalized)) fail("FORBIDDEN_DATA", `${path}.${key} is forbidden`);
    assertNoForbiddenData(child, `${path}.${key}`);
  }
}

export function assertAnalyticsEvent(event) {
  assertObject(event, "analytics event");
  if (event.schema_version !== "1") fail("SCHEMA_VERSION", "analytics schema_version must be 1");
  if (!ANALYTICS_EVENTS.includes(event.event_name)) fail("EVENT_NAME", "analytics event name is not allowed");
  assertNonemptyString(event.event_id, "analytics.event_id");
  assertIsoDateTime(event.occurred_at, "analytics.occurred_at");
  const hasActor = typeof event.actor_ref === "string" && event.actor_ref !== "";
  const hasAnonymous = typeof event.anonymous_ref === "string" && event.anonymous_ref !== "";
  if (hasActor === hasAnonymous) fail("IDENTITY_CARDINALITY", "analytics event must have exactly one actor_ref or anonymous_ref");
  assertObject(event.source, "analytics.source");
  assertObject(event.properties, "analytics.properties");
  assertNoForbiddenData(event);
  const requiredProperties = ANALYTICS_EVENT_DEFINITIONS[event.event_name];
  for (const property of requiredProperties) {
    if (!Object.hasOwn(event.properties, property) || event.properties[property] === null || event.properties[property] === "") {
      fail("EVENT_PROPERTY_MISSING", `${event.event_name} requires properties.${property}`);
    }
    const value = event.properties[property];
    if (["billing_cycle_number", "amount_minor"].includes(property) && (!Number.isInteger(value) || value < 0)) {
      fail("EVENT_PROPERTY_TYPE", `${event.event_name} properties.${property} must be a non-negative integer`);
    }
    if (property === "billing_cycle_number" && value < 2) {
      fail("EVENT_PROPERTY_TYPE", "billing.renewal_paid billing_cycle_number must be at least 2");
    }
    if (property === "first_charge" && typeof value !== "boolean") {
      fail("EVENT_PROPERTY_TYPE", `${event.event_name} properties.first_charge must be boolean`);
    }
    if (property === "currency" && (typeof value !== "string" || !/^[a-z]{3}$/.test(value))) {
      fail("EVENT_PROPERTY_TYPE", `${event.event_name} properties.currency must be a lowercase three-letter currency code`);
    }
    if (property === "provider_result" && value !== "accepted") {
      fail("EVENT_PROPERTY_TYPE", "subscriber.weekly_delivery_accepted provider_result must be accepted");
    }
    if (!["billing_cycle_number", "amount_minor", "first_charge"].includes(property) && (typeof value !== "string" || value === "")) {
      fail("EVENT_PROPERTY_TYPE", `${event.event_name} properties.${property} must be a non-empty string`);
    }
  }
  for (const property of Object.keys(event.properties)) {
    if (!requiredProperties.includes(property)) {
      fail("EVENT_PROPERTY_UNKNOWN", `${event.event_name} does not allow properties.${property}`);
    }
  }
  return event;
}

export function appendAuditEvent(chain, input) {
  if (!Array.isArray(chain)) fail("AUDIT_CHAIN", "audit chain must be an array");
  assertObject(input, "audit input");
  const previous = chain.at(-1) ?? null;
  const event = {
    schema_version: "1",
    event_id: input.event_id,
    aggregate_id: input.aggregate_id,
    sequence: chain.length + 1,
    event_type: input.event_type,
    occurred_at: input.occurred_at,
    actor: input.actor,
    idempotency_key: input.idempotency_key,
    payload: input.payload ?? {},
    previous_event_sha256: previous?.event_sha256 ?? null,
  };
  assertNoForbiddenData(event);
  event.event_sha256 = sha256Canonical(event);
  return [...chain, event];
}

export function verifyAuditChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) fail("AUDIT_CHAIN", "audit chain must not be empty");
  let previousSha = null;
  for (let index = 0; index < chain.length; index += 1) {
    const event = chain[index];
    assertObject(event, `audit[${index}]`);
    if (event.sequence !== index + 1) fail("AUDIT_SEQUENCE", `audit sequence mismatch at ${index + 1}`);
    if (event.previous_event_sha256 !== previousSha) fail("AUDIT_PREVIOUS", `audit previous hash mismatch at ${index + 1}`);
    const { event_sha256: recorded, ...unsigned } = event;
    assertSha256(recorded, `audit[${index}].event_sha256`);
    const expected = sha256Canonical(unsigned);
    if (recorded !== expected) fail("AUDIT_HASH", `audit hash mismatch at ${index + 1}`);
    assertNoForbiddenData(event);
    previousSha = recorded;
  }
  return previousSha;
}
