export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type Entitlement = {
  userId: string;
  email: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  revocationReason: "refund" | "chargeback" | "subscription_ended" | null;
  paidBillingCycles: number;
  pastDueSince: number | null;
  latestEventCreated: number;
  latestEventId: string;
  updatedAt: string;
};

export type NormalizedBillingEvent = {
  eventId: string;
  eventCreated: number;
  eventType: string;
  userId: string | null;
  email: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  revocationReason: "refund" | "chargeback" | "subscription_ended" | null;
  amountMinor: number | null;
  currency: string | null;
  billingReason: string | null;
  payloadSha256: string;
};

export type ApplyStripeEventResult = {
  outcome: "applied" | "duplicate" | "stale";
  entitlement: Entitlement | null;
};

export interface EntitlementRepository {
  applyStripeEvent(
    event: NormalizedBillingEvent,
  ): Promise<ApplyStripeEventResult>;
  getByUserId(userId: string): Promise<Entitlement | null>;
}

export class UnresolvedBillingIdentityError extends Error {
  constructor(eventId: string) {
    super(`Cannot resolve a subscriber identity for Stripe event ${eventId}.`);
    this.name = "UnresolvedBillingIdentityError";
  }
}

export class StripeEventIntegrityError extends Error {
  constructor(eventId: string) {
    super(`Stripe event ${eventId} was reused with different signed payload bytes.`);
    this.name = "StripeEventIntegrityError";
  }
}
