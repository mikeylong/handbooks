import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { MockConfig } from "@/lib/config";
import type { NormalizedBillingEvent } from "@/lib/entitlements/types";

import type { BillingAdapter } from "./types";

export class MockBillingAdapter implements BillingAdapter {
  constructor(private readonly config: MockConfig) {}

  async createSubscriptionCheckout(input: { appOrigin: string }) {
    return {
      url: `${input.appOrigin}/dashboard?checkout=mock`,
    };
  }

  async createCustomerPortal(_customerId: string, appOrigin: string) {
    return { url: `${appOrigin}/dashboard?portal=mock` };
  }

  async constructWebhookEvent(rawBody: string, signature: string) {
    const expected = createHmac("sha256", this.config.MOCK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    const provided = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (
      provided.length !== expectedBuffer.length ||
      !timingSafeEqual(provided, expectedBuffer)
    ) {
      throw new Error("Invalid mock webhook signature.");
    }

    const parsed = JSON.parse(rawBody) as Omit<
      NormalizedBillingEvent,
      "payloadSha256"
    >;
    return {
      ...parsed,
      payloadSha256: createHash("sha256")
        .update(rawBody, "utf8")
        .digest("hex"),
    };
  }
}
