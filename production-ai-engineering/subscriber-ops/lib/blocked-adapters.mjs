import { ContractError, assertSha256 } from "./contracts.mjs";

export class ExternalMutationBlockedError extends Error {
  constructor(operation) {
    super(`${operation} is blocked in the local subscriber-ops scaffold; a production adapter and bound human approval are required`);
    this.name = "ExternalMutationBlockedError";
    this.code = "EXTERNAL_MUTATION_BLOCKED";
    this.operation = operation;
  }
}

function blocked(operation) {
  throw new ExternalMutationBlockedError(operation);
}

export function createBlockedProviderAdapters({ authSession = null } = {}) {
  return Object.freeze({
    AuthAdapter: Object.freeze({
      async getSession() {
        if (!authSession) throw new ContractError("AUTH_REQUIRED", "no synthetic auth session is configured");
        return { ...authSession };
      },
    }),
    BillingAdapter: Object.freeze({
      async createSubscriptionCheckout() {
        blocked("BillingAdapter.createSubscriptionCheckout");
      },
      async createCustomerPortal() {
        blocked("BillingAdapter.createCustomerPortal");
      },
      async constructWebhookEvent() {
        blocked("BillingAdapter.constructWebhookEvent");
      },
    }),
    EntitlementRepository: Object.freeze({
      async applyStripeEvent() {
        blocked("EntitlementRepository.applyStripeEvent");
      },
      async getByUserId() {
        blocked("EntitlementRepository.getByUserId");
      },
      async hasDownloadAccess() {
        blocked("EntitlementRepository.hasDownloadAccess");
      },
    }),
    PrivateAssetStore: Object.freeze({
      async getHandbook() {
        blocked("PrivateAssetStore.getHandbook");
      },
    }),
    PrivateReleaseStore: Object.freeze({
      async putPrivateIfAbsent() {
        blocked("PrivateReleaseStore.putPrivateIfAbsent");
      },
      async headPrivate() {
        blocked("PrivateReleaseStore.headPrivate");
      },
    }),
    DeliveryNotifier: Object.freeze({
      async sendSubscriberUpdate() {
        blocked("DeliveryNotifier.sendSubscriberUpdate");
      },
    }),
    AnalyticsSink: Object.freeze({
      async capture() {
        blocked("AnalyticsSink.capture");
      },
    }),
  });
}

function deriveState(event, policy, existing = null) {
  const status = event.status;
  if (["active", "trialing"].includes(status)) return { state: "ACTIVE", accessUntil: event.currentPeriodEnd };
  if (status === "past_due") {
    const pastDueSince = existing?.pastDueSince ?? event.eventCreated;
    return {
      state: "GRACE",
      accessUntil: pastDueSince + Math.round(policy.pastDueGraceHours * 3600),
      pastDueSince,
    };
  }
  if (status === "refunded" || status === "disputed") return { state: "SUSPENDED", accessUntil: event.eventCreated };
  if (status === "canceled" && Number.isFinite(event.currentPeriodEnd) && event.eventCreated < event.currentPeriodEnd) {
    return { state: "CANCELED_PAID_PERIOD", accessUntil: event.currentPeriodEnd };
  }
  return { state: "REVOKED", accessUntil: event.currentPeriodEnd };
}

export function createInMemoryEntitlementRepository({ pastDueGraceHours = 168 } = {}) {
  const events = new Map();
  const entitlements = new Map();

  return Object.freeze({
    async applyStripeEvent(event) {
      if (!event || typeof event !== "object") throw new ContractError("EVENT_INVALID", "Stripe event must be an object");
      for (const key of ["eventId", "eventType", "customerId", "userId", "status", "payloadSha256"]) {
        if (typeof event[key] !== "string" || event[key] === "") throw new ContractError("EVENT_INVALID", `Stripe event ${key} is required`);
      }
      assertSha256(event.payloadSha256, "Stripe payloadSha256");
      if (!Number.isInteger(event.eventCreated) || event.eventCreated < 1) throw new ContractError("EVENT_INVALID", "Stripe eventCreated is invalid");

      const existingEvent = events.get(event.eventId);
      if (existingEvent) {
        if (existingEvent.payloadSha256 !== event.payloadSha256) {
          throw new ContractError("EVENT_ID_REUSE", "Stripe event ID was reused with a different payload hash");
        }
        return { applied: false, duplicate: true, stale: false, entitlementState: entitlements.get(event.userId)?.state ?? "NONE" };
      }

      const existingEntitlement = entitlements.get(event.userId);
      const stale = existingEntitlement && event.eventCreated < existingEntitlement.lastEventCreated;
      events.set(event.eventId, { payloadSha256: event.payloadSha256, received: true });
      if (stale) {
        return { applied: false, duplicate: false, stale: true, entitlementState: existingEntitlement.state };
      }

      const derived = deriveState(event, { pastDueGraceHours }, existingEntitlement);
      entitlements.set(event.userId, {
        userId: event.userId,
        customerId: event.customerId,
        subscriptionId: event.subscriptionId ?? null,
        providerStatus: event.status,
        state: derived.state,
        accessUntil: derived.accessUntil,
        pastDueSince: derived.pastDueSince ?? null,
        lastEventCreated: event.eventCreated,
        lastEventId: event.eventId,
      });
      return { applied: true, duplicate: false, stale: false, entitlementState: derived.state };
    },

    async getByUserId(userId) {
      const record = entitlements.get(userId);
      return record ? { ...record } : null;
    },

    async hasDownloadAccess(userId, at) {
      const record = entitlements.get(userId);
      if (!record || !["ACTIVE", "GRACE", "CANCELED_PAID_PERIOD"].includes(record.state)) return false;
      if (record.accessUntil == null) return true;
      const epochSeconds = Math.floor(new Date(at).getTime() / 1000);
      return Number.isFinite(epochSeconds) && epochSeconds < record.accessUntil;
    },

    inspectForTest() {
      return {
        eventCount: events.size,
        entitlementCount: entitlements.size,
      };
    },
  });
}
