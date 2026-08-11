import { captureAnalytics } from "@/lib/analytics";
import { getBillingAdapter } from "@/lib/billing";
import { getEntitlementRepository } from "@/lib/entitlements";
import type {
  ApplyStripeEventResult,
  Entitlement,
  NormalizedBillingEvent,
} from "@/lib/entitlements";
import { ENTITLEMENT_POLICY, OFFER } from "@/lib/product-policy";

export const runtime = "nodejs";

async function emitCommittedBillingAnalytics(
  event: NormalizedBillingEvent,
  result: ApplyStripeEventResult,
  before: Entitlement | null,
) {
  if (result.outcome !== "applied" || !result.entitlement) return;
  const actorRef = result.entitlement.userId;
  const becameActive =
    ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated"].includes(
      event.eventType,
    ) &&
    ["active", "trialing"].includes(event.status) &&
    !before?.status.match(/^(active|trialing)$/);
  if (becameActive) {
    await captureAnalytics({
      eventName: "billing.subscription_activated",
      actorRef,
      properties: {
        entitlement_policy_version: ENTITLEMENT_POLICY.policyVersion,
        billing_interval: OFFER.billingInterval,
      },
    });
  }

  if (event.eventType === "invoice.payment_failed") {
    await captureAnalytics({
      eventName: "billing.payment_failed",
      actorRef,
      properties: {
        failure_class: "provider_invoice_payment_failed",
        billing_cycle:
          event.billingReason === "subscription_create" ? "initial" : "renewal",
      },
    });
  }

  if (
    event.eventType === "invoice.payment_succeeded" &&
    event.billingReason === "subscription_cycle" &&
    event.amountMinor !== null &&
    event.currency !== null
  ) {
    await captureAnalytics({
      eventName: "billing.renewal_paid",
      actorRef,
      properties: {
        billing_cycle_number: result.entitlement.paidBillingCycles,
        amount_minor: event.amountMinor,
        currency: event.currency.toLowerCase(),
      },
    });
  }

  const endReason =
    event.eventType === "charge.refunded"
      ? "refund_completed"
      : event.eventType === "charge.dispute.created"
        ? "chargeback_created"
        : event.eventType === "customer.subscription.deleted"
          ? "canceled_paid_period"
          : null;
  if (endReason) {
    await captureAnalytics({
      eventName: "billing.subscription_ended",
      actorRef,
      properties: { reason_code: endReason },
    });
  }

  if (
    event.eventType === "charge.refunded" &&
    event.amountMinor !== null &&
    event.currency !== null
  ) {
    await captureAnalytics({
      eventName: "billing.refund_completed",
      actorRef,
      properties: {
        reason_code: "provider_refund",
        amount_minor: event.amountMinor,
        currency: event.currency.toLowerCase(),
      },
    });
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event;
  try {
    event = await getBillingAdapter().constructWebhookEvent(rawBody, signature);
  } catch {
    return Response.json(
      { error: "Invalid webhook signature or payload." },
      { status: 400 },
    );
  }

  if (!event) return Response.json({ received: true, outcome: "ignored" });

  try {
    const repository = getEntitlementRepository();
    const before = event.userId
      ? await repository.getByUserId(event.userId)
      : null;
    const result = await repository.applyStripeEvent(event);
    await emitCommittedBillingAnalytics(event, result, before);
    return Response.json({ received: true, outcome: result.outcome });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.eventId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: "Webhook processing failed and may be retried." },
      { status: 500 },
    );
  }
}
