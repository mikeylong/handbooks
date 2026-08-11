import subscriberPolicy from "./subscriber-policy.v1.json";

export const OFFER = Object.freeze({
  offerId: "production_ai_handbook_monthly",
  pageVersion: "2026-08-04-v1",
  priceKey: "production_ai_handbook_usd_monthly_500",
  amountMinor: 500,
  currency: "usd",
  billingInterval: "month",
  checkoutFlowVersion: "2026-08-04-v1",
});

export const PUBLIC_SAMPLE = Object.freeze({
  sampleVersion: "2026-08-04-v1",
  format: "html",
  sections: [1, 2, 3] as const,
});

export const REFUND_POLICY = Object.freeze({
  policyVersion: subscriberPolicy.policy_id,
  firstChargeWindowDays: subscriberPolicy.refund.first_charge_window_days,
  windowAnchor: subscriberPolicy.refund.window_anchor,
  boundary: subscriberPolicy.refund.boundary,
  suspendOnRefund: true,
  suspendOnChargeback: true,
  customerCopy:
    "Your first monthly charge is refundable when requested within seven days. Duplicate charges and payments that do not produce working access will be corrected.",
});

export const ENTITLEMENT_POLICY = Object.freeze({
  policyVersion: subscriberPolicy.policy_id,
  pastDueGraceDays: subscriberPolicy.past_due.grace_days,
  pastDueGraceAnchor: subscriberPolicy.past_due.grace_anchor,
  repeatPastDueResetsGrace: subscriberPolicy.past_due.repeat_event_resets_grace,
  accessThroughCanceledPaidPeriod: true,
  suspendOnRefund: true,
  suspendOnChargeback: true,
});

export const SECONDS_PER_DAY = 24 * 60 * 60;

export function isFirstChargeRefundEligible(input: {
  firstCharge: boolean;
  paidAt: Date;
  requestedAt: Date;
}) {
  if (!input.firstCharge) return false;
  const paidAt = input.paidAt.getTime();
  const requestedAt = input.requestedAt.getTime();
  const windowMilliseconds =
    REFUND_POLICY.firstChargeWindowDays * SECONDS_PER_DAY * 1000;
  return requestedAt >= paidAt && requestedAt <= paidAt + windowMilliseconds;
}
