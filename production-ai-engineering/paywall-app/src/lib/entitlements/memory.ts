import type {
  ApplyStripeEventResult,
  Entitlement,
  EntitlementRepository,
  NormalizedBillingEvent,
} from "./types";
import {
  StripeEventIntegrityError,
  UnresolvedBillingIdentityError,
} from "./types";

type MemorySeed = {
  entitlements?: Entitlement[];
  processedEventIds?: string[];
  processedEvents?: Record<string, string>;
};

export class InMemoryEntitlementRepository
  implements EntitlementRepository
{
  private readonly entitlements = new Map<string, Entitlement>();
  private readonly processedEvents = new Map<string, string>();

  constructor(seed: MemorySeed = {}) {
    for (const entitlement of seed.entitlements ?? []) {
      this.entitlements.set(entitlement.userId, {
        ...entitlement,
        revocationReason: entitlement.revocationReason ?? null,
        paidBillingCycles: entitlement.paidBillingCycles ?? 0,
        pastDueSince: entitlement.pastDueSince ?? null,
      });
    }
    for (const eventId of seed.processedEventIds ?? []) {
      this.processedEvents.set(eventId, "legacy");
    }
    for (const [eventId, payloadSha256] of Object.entries(
      seed.processedEvents ?? {},
    )) {
      this.processedEvents.set(eventId, payloadSha256);
    }
  }

  async getByUserId(userId: string) {
    const entitlement = this.entitlements.get(userId);
    return entitlement ? { ...entitlement } : null;
  }

  private resolveUserId(event: NormalizedBillingEvent) {
    if (event.userId) return event.userId;
    for (const entitlement of this.entitlements.values()) {
      if (
        (event.subscriptionId &&
          entitlement.stripeSubscriptionId === event.subscriptionId) ||
        (event.customerId &&
          entitlement.stripeCustomerId === event.customerId)
      ) {
        return entitlement.userId;
      }
    }
    throw new UnresolvedBillingIdentityError(event.eventId);
  }

  async applyStripeEvent(
    event: NormalizedBillingEvent,
  ): Promise<ApplyStripeEventResult> {
    const existingPayload = this.processedEvents.get(event.eventId);
    if (existingPayload) {
      if (
        existingPayload !== "legacy" &&
        existingPayload !== event.payloadSha256
      ) {
        throw new StripeEventIntegrityError(event.eventId);
      }
      const userId = event.userId;
      return {
        outcome: "duplicate",
        entitlement: userId ? await this.getByUserId(userId) : null,
      };
    }

    const userId = this.resolveUserId(event);
    const current = this.entitlements.get(userId);
    this.processedEvents.set(event.eventId, event.payloadSha256);

    if (current && event.eventCreated < current.latestEventCreated) {
      return { outcome: "stale", entitlement: { ...current } };
    }

    const entitlement: Entitlement = {
      userId,
      email: event.email ?? current?.email ?? null,
      stripeCustomerId:
        event.customerId ?? current?.stripeCustomerId ?? null,
      stripeSubscriptionId:
        event.subscriptionId ?? current?.stripeSubscriptionId ?? null,
      status: event.status,
      currentPeriodEnd:
        event.currentPeriodEnd ?? current?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd:
        event.cancelAtPeriodEnd ?? current?.cancelAtPeriodEnd ?? false,
      revocationReason: event.revocationReason,
      paidBillingCycles:
        event.eventType === "invoice.payment_succeeded"
          ? event.billingReason === "subscription_cycle"
            ? Math.max((current?.paidBillingCycles ?? 0) + 1, 2)
            : Math.max(current?.paidBillingCycles ?? 0, 1)
          : (current?.paidBillingCycles ?? 0),
      pastDueSince:
        event.status === "past_due"
          ? (current?.pastDueSince ?? event.eventCreated)
          : event.status === "active" || event.status === "trialing"
            ? null
            : (current?.pastDueSince ?? null),
      latestEventCreated: event.eventCreated,
      latestEventId: event.eventId,
      updatedAt: new Date().toISOString(),
    };
    this.entitlements.set(userId, entitlement);
    return { outcome: "applied", entitlement: { ...entitlement } };
  }

  snapshot() {
    return {
      entitlements: Array.from(this.entitlements.values()).map((item) => ({
        ...item,
      })),
      processedEvents: Object.fromEntries(this.processedEvents),
    };
  }
}
