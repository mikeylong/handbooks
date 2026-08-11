import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import type { ProductionConfig } from "../src/lib/config";
import { StripeBillingAdapter } from "../src/lib/billing/stripe";

const webhookSecret = "whsec_test_contract_secret";
const config: ProductionConfig = {
  APP_MODE: "production",
  NEXT_PUBLIC_APP_URL: "https://example.com",
  SELLER_NAME: "Surfaces",
  SUPPORT_EMAIL: "hello@surfaces.systems",
  BASE_DOMAIN: "surfaces.systems",
  CLERK_SECRET_KEY: "sk_test_clerk",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk",
  STRIPE_SECRET_KEY: "sk_test_placeholder",
  STRIPE_WEBHOOK_SECRET: webhookSecret,
  STRIPE_PRICE_ID: "price_test",
  STRIPE_PORTAL_CONFIGURATION_ID: "bpc_test",
  DATABASE_URL: "postgresql://example.com/paywall",
  BLOB_READ_WRITE_TOKEN: "blob_test",
  HANDBOOK_BLOB_URL: "https://example.com/private.pdf",
  CURRENT_RELEASE_ID: "rel_staging_test",
};

const payload = JSON.stringify({
  id: "evt_signed",
  object: "event",
  api_version: "2026-06-30.basil",
  created: 1234,
  data: {
    object: {
      id: "sub_123",
      object: "subscription",
      customer: "cus_123",
      status: "active",
      current_period_end: 5678,
      cancel_at_period_end: false,
      metadata: { userId: "user_123", email: "reader@example.com" },
    },
  },
  livemode: false,
  pending_webhooks: 0,
  request: null,
  type: "customer.subscription.updated",
});

describe("Stripe raw-body webhook contract", () => {
  it("verifies the exact raw body before normalization", async () => {
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    const normalized = await new StripeBillingAdapter(
      config,
    ).constructWebhookEvent(payload, signature);
    expect(normalized).toMatchObject({
      eventId: "evt_signed",
      userId: "user_123",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      status: "active",
    });
  });

  it("rejects a body changed after signing", async () => {
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });
    await expect(
      new StripeBillingAdapter(config).constructWebhookEvent(
        `${payload} `,
        signature,
      ),
    ).rejects.toThrow();
  });
});
