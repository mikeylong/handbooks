import { ContractError } from "./contracts.mjs";

const DAY_SECONDS = 24 * 60 * 60;
const ACCESS_STATES = new Set(["ACTIVE", "CANCELED_PAID_PERIOD", "PAST_DUE_GRACE"]);

function fail(code, message) {
  throw new ContractError(code, message);
}

function epoch(value, label) {
  const parsed = typeof value === "number" ? value : Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(parsed)) fail("POLICY_TIME", `${label} is invalid`);
  return parsed;
}

export function assertSubscriberPolicy(policy) {
  if (!policy || typeof policy !== "object") fail("POLICY_INVALID", "subscriber policy must be an object");
  if (policy.schema_version !== "1" || policy.policy_id !== "subscriber-access-v1") fail("POLICY_VERSION", "subscriber policy version is invalid");
  if (policy.refund?.first_charge_window_days !== 7 || policy.refund?.window_anchor !== "first_charge_paid_at" || policy.refund?.boundary !== "inclusive" || policy.refund?.suspend_on !== "refund_completed") {
    fail("REFUND_POLICY", "first-charge refund policy must be inclusive seven days with suspension on completion");
  }
  if (policy.cancellation?.access_until !== "current_paid_period_end" || policy.cancellation?.renewal_after_cancel !== false) {
    fail("CANCELLATION_POLICY", "cancellation must preserve access through the paid period without renewal");
  }
  if (policy.past_due?.grace_days !== 7 || policy.past_due?.grace_anchor !== "first_past_due_event" || policy.past_due?.repeat_event_resets_grace !== false || policy.past_due?.after_grace !== "suspend") {
    fail("PAST_DUE_POLICY", "past_due policy must provide one non-resetting seven-day grace period then suspend");
  }
  if (policy.chargeback?.suspend_on !== "chargeback_created") fail("CHARGEBACK_POLICY", "chargeback must suspend immediately when created");
  const asset = policy.initial_asset;
  if (!asset || asset.source_path !== "output/pdf/production-ai-engineering.pdf" || asset.selection_status !== "APPROVED_INITIAL_ASSET" || asset.staging_status !== "PRIVATE_STAGING_UPLOADED" || asset.production_status !== "UNAPPROVED") {
    fail("INITIAL_ASSET_POLICY", "initial asset policy is invalid");
  }
  if (asset.staging_receipt_path !== "subscriber-ops/fixtures/initial-staging-upload-receipt.json") {
    fail("INITIAL_ASSET_RECEIPT", "initial staging asset receipt path is invalid");
  }
  if (asset.required_approval?.scope !== "PROMOTION" || asset.required_approval?.environment !== "production" || asset.required_approval?.action !== "promote_initial_canonical_pdf_to_production") {
    fail("INITIAL_ASSET_APPROVAL", "production promotion requires a new explicit scoped approval");
  }
  return policy;
}

export function isFirstChargeRefundEligible({ firstCharge, paidAt, requestedAt, policy }) {
  assertSubscriberPolicy(policy);
  if (firstCharge !== true) return false;
  const paid = epoch(paidAt, "paidAt");
  const requested = epoch(requestedAt, "requestedAt");
  const windowSeconds = policy.refund.first_charge_window_days * DAY_SECONDS;
  return requested >= paid && requested <= paid + windowSeconds;
}

export function emptyEntitlement(userId) {
  return {
    user_id: userId,
    state: "NONE",
    current_period_end: null,
    past_due_since: null,
    grace_ends_at: null,
    suspended_reason: null,
    last_event_created: 0,
    processed_event_ids: [],
  };
}

export function applyEntitlementEvent(current, event, policy) {
  assertSubscriberPolicy(policy);
  if (!current || typeof current !== "object" || !event || typeof event !== "object") fail("ENTITLEMENT_EVENT", "entitlement state and event are required");
  if (!event.event_id || !event.type) fail("ENTITLEMENT_EVENT", "event_id and type are required");
  const created = epoch(event.created_at, "event.created_at");
  if (current.processed_event_ids.includes(event.event_id)) return { ...current, duplicate: true };
  if (created < current.last_event_created) return { ...current, stale: true };

  const next = {
    ...current,
    processed_event_ids: [...current.processed_event_ids, event.event_id],
    last_event_created: created,
    duplicate: false,
    stale: false,
  };
  if (event.current_period_end != null) next.current_period_end = epoch(event.current_period_end, "event.current_period_end");

  switch (event.type) {
    case "subscription.activated":
    case "billing.renewal_paid":
      next.state = "ACTIVE";
      next.past_due_since = null;
      next.grace_ends_at = null;
      next.suspended_reason = null;
      break;
    case "subscription.canceled":
      next.state = created < next.current_period_end ? "CANCELED_PAID_PERIOD" : "SUSPENDED";
      next.suspended_reason = next.state === "SUSPENDED" ? "canceled_period_ended" : null;
      break;
    case "billing.payment_failed": {
      const firstPastDue = current.past_due_since ?? created;
      next.state = "PAST_DUE_GRACE";
      next.past_due_since = firstPastDue;
      next.grace_ends_at = firstPastDue + policy.past_due.grace_days * DAY_SECONDS;
      next.suspended_reason = null;
      break;
    }
    case "billing.refund_completed":
      next.state = "SUSPENDED";
      next.suspended_reason = "refund_completed";
      break;
    case "billing.chargeback_created":
      next.state = "SUSPENDED";
      next.suspended_reason = "chargeback_created";
      break;
    default:
      fail("ENTITLEMENT_EVENT_TYPE", `unsupported entitlement event ${event.type}`);
  }
  return next;
}

export function projectEntitlementAt(current, at, policy) {
  assertSubscriberPolicy(policy);
  const now = epoch(at, "projection time");
  const next = { ...current, duplicate: false, stale: false };
  if (next.state === "PAST_DUE_GRACE" && now >= next.grace_ends_at) {
    next.state = "SUSPENDED";
    next.suspended_reason = "past_due_grace_expired";
  }
  if (["ACTIVE", "CANCELED_PAID_PERIOD"].includes(next.state) && next.current_period_end != null && now >= next.current_period_end) {
    const expiredState = next.state;
    next.state = "SUSPENDED";
    next.suspended_reason = expiredState === "CANCELED_PAID_PERIOD" ? "canceled_period_ended" : "paid_period_ended";
  }
  return next;
}

export function hasEntitledAccess(current, at, policy) {
  return ACCESS_STATES.has(projectEntitlementAt(current, at, policy).state);
}

export function createLocalReleaseProjection(initialRelease) {
  let currentRelease = initialRelease;
  const history = initialRelease ? [initialRelease] : [];
  return Object.freeze({
    current() {
      return currentRelease;
    },
    replace(release) {
      if (!release?.release_id || !release?.sha256) fail("RELEASE_REPLACEMENT", "replacement release is invalid");
      if (!history.some((entry) => entry.release_id === release.release_id)) history.push({ ...release });
      currentRelease = { ...release };
      return currentRelease;
    },
    rollback(releaseId) {
      const target = history.find((entry) => entry.release_id === releaseId);
      if (!target) fail("ROLLBACK_TARGET", "rollback target is unknown");
      currentRelease = { ...target };
      return currentRelease;
    },
    history() {
      return history.map((entry) => ({ ...entry }));
    },
  });
}
