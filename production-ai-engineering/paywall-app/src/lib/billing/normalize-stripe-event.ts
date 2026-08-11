import type Stripe from "stripe";

import type {
  NormalizedBillingEvent,
  SubscriptionStatus,
} from "@/lib/entitlements/types";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function stringId(value: unknown): string | null {
  if (typeof value === "string") return value;
  const id = record(value).id;
  return typeof id === "string" ? id : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function metadataValue(object: UnknownRecord, key: string): string | null {
  return stringValue(record(object.metadata)[key]);
}

const knownStatuses = new Set<SubscriptionStatus>([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

function subscriptionStatus(value: unknown): SubscriptionStatus {
  return knownStatuses.has(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "incomplete";
}

function invoiceSubscriptionDetails(invoice: UnknownRecord): UnknownRecord {
  return record(record(invoice.parent).subscription_details);
}

export function normalizeStripeEvent(
  event: Stripe.Event,
  payloadSha256: string,
): NormalizedBillingEvent | null {
  const object = record(event.data.object);
  const base = {
    eventId: event.id,
    eventCreated: event.created,
    eventType: event.type,
    payloadSha256,
  };

  if (event.type === "checkout.session.completed") {
    const paymentStatus = stringValue(object.payment_status);
    return {
      ...base,
      userId:
        metadataValue(object, "userId") ??
        stringValue(object.client_reference_id),
      email:
        stringValue(record(object.customer_details).email) ??
        stringValue(object.customer_email),
      customerId: stringId(object.customer),
      subscriptionId: stringId(object.subscription),
      status:
        paymentStatus === "paid" || paymentStatus === "no_payment_required"
          ? "active"
          : "incomplete",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      revocationReason: null,
      amountMinor: null,
      currency: null,
      billingReason: null,
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    return {
      ...base,
      userId: metadataValue(object, "userId"),
      email: metadataValue(object, "email"),
      customerId: stringId(object.customer),
      subscriptionId: stringId(object.id),
      status:
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : subscriptionStatus(object.status),
      currentPeriodEnd: numberValue(object.current_period_end),
      cancelAtPeriodEnd: booleanValue(object.cancel_at_period_end),
      revocationReason:
        event.type === "customer.subscription.deleted"
          ? "subscription_ended"
          : null,
      amountMinor: null,
      currency: null,
      billingReason: null,
    };
  }

  if (
    event.type === "invoice.payment_succeeded" ||
    event.type === "invoice.payment_failed"
  ) {
    const details = invoiceSubscriptionDetails(object);
    return {
      ...base,
      userId:
        metadataValue(details, "userId") ?? metadataValue(object, "userId"),
      email: stringValue(object.customer_email),
      customerId: stringId(object.customer),
      subscriptionId:
        stringId(details.subscription) ?? stringId(object.subscription),
      status:
        event.type === "invoice.payment_succeeded" ? "active" : "past_due",
      currentPeriodEnd: numberValue(object.period_end),
      cancelAtPeriodEnd: null,
      revocationReason: null,
      amountMinor: numberValue(object.amount_paid),
      currency: stringValue(object.currency),
      billingReason: stringValue(object.billing_reason),
    };
  }

  if (event.type === "charge.refunded") {
    return {
      ...base,
      userId: metadataValue(object, "userId"),
      email: null,
      customerId: stringId(object.customer),
      subscriptionId: null,
      status: "canceled",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      revocationReason: "refund",
      amountMinor: numberValue(object.amount_refunded),
      currency: stringValue(object.currency),
      billingReason: null,
    };
  }

  if (event.type === "charge.dispute.created") {
    const charge = record(object.charge);
    return {
      ...base,
      userId:
        metadataValue(object, "userId") ?? metadataValue(charge, "userId"),
      email: null,
      customerId: stringId(charge.customer),
      subscriptionId: null,
      status: "canceled",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      revocationReason: "chargeback",
      amountMinor: numberValue(object.amount),
      currency: stringValue(object.currency),
      billingReason: null,
    };
  }

  return null;
}
