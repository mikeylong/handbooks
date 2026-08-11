import type { Entitlement } from "./types";
import {
  ENTITLEMENT_POLICY,
  SECONDS_PER_DAY,
} from "../product-policy";

export function hasDownloadAccess(
  entitlement: Entitlement | null,
  at: Date = new Date(),
) {
  if (!entitlement) return false;
  if (
    entitlement.revocationReason === "refund" ||
    entitlement.revocationReason === "chargeback"
  ) {
    return false;
  }
  const epochSeconds = Math.floor(at.getTime() / 1000);
  if (entitlement.status === "active" || entitlement.status === "trialing") {
    return (
      entitlement.currentPeriodEnd === null ||
      epochSeconds < entitlement.currentPeriodEnd
    );
  }
  if (entitlement.status === "past_due") {
    const graceEnd =
      (entitlement.pastDueSince ?? entitlement.latestEventCreated) +
      ENTITLEMENT_POLICY.pastDueGraceDays * SECONDS_PER_DAY;
    return epochSeconds < graceEnd;
  }
  if (
    entitlement.status === "canceled" &&
    ENTITLEMENT_POLICY.accessThroughCanceledPaidPeriod
  ) {
    return (
      entitlement.currentPeriodEnd !== null &&
      epochSeconds < entitlement.currentPeriodEnd
    );
  }
  return false;
}

export function accessDenialReason(entitlement: Entitlement | null, at = new Date()) {
  if (!entitlement) return "no_entitlement";
  if (entitlement.revocationReason === "refund") return "refunded";
  if (entitlement.revocationReason === "chargeback") return "chargeback";
  if (entitlement.status === "past_due") return "past_due_grace_expired";
  if (entitlement.status === "canceled") return "subscription_ended";
  if (
    entitlement.currentPeriodEnd !== null &&
    Math.floor(at.getTime() / 1000) >= entitlement.currentPeriodEnd
  ) {
    return "paid_period_ended";
  }
  return "inactive_entitlement";
}
