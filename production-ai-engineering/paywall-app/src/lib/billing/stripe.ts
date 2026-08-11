import { createHash } from "node:crypto";

import Stripe from "stripe";

import type { ProductionConfig } from "@/lib/config";

import { normalizeStripeEvent } from "./normalize-stripe-event";
import type { BillingAdapter, CheckoutInput } from "./types";

export class StripeBillingAdapter implements BillingAdapter {
  private client: Stripe | undefined;

  constructor(private readonly config: ProductionConfig) {}

  private stripe() {
    this.client ??= new Stripe(this.config.STRIPE_SECRET_KEY, {
      typescript: true,
    });
    return this.client;
  }

  async createSubscriptionCheckout(input: CheckoutInput) {
    const customer = input.customerId
      ? { customer: input.customerId }
      : { customer_email: input.email };
    const session = await this.stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: this.config.STRIPE_PRICE_ID, quantity: 1 }],
      client_reference_id: input.userId,
      metadata: { userId: input.userId, email: input.email },
      subscription_data: {
        metadata: { userId: input.userId, email: input.email },
      },
      success_url: `${input.appOrigin}/dashboard?checkout=success`,
      cancel_url: `${input.appOrigin}/?checkout=canceled`,
      allow_promotion_codes: true,
      ...customer,
    });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    return { url: session.url };
  }

  async createCustomerPortal(customerId: string, appOrigin: string) {
    const session = await this.stripe().billingPortal.sessions.create({
      customer: customerId,
      configuration: this.config.STRIPE_PORTAL_CONFIGURATION_ID,
      return_url: `${appOrigin}/dashboard`,
    });
    return { url: session.url };
  }

  async constructWebhookEvent(rawBody: string, signature: string) {
    let event = this.stripe().webhooks.constructEvent(
      rawBody,
      signature,
      this.config.STRIPE_WEBHOOK_SECRET,
    );
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      if (typeof dispute.charge === "string") {
        const charge = await this.stripe().charges.retrieve(dispute.charge);
        event = {
          ...event,
          data: { ...event.data, object: { ...dispute, charge } },
        } as Stripe.Event;
      }
    }
    const payloadSha256 = createHash("sha256")
      .update(rawBody, "utf8")
      .digest("hex");
    return normalizeStripeEvent(event, payloadSha256);
  }
}
