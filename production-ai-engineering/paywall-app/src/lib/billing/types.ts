import type { NormalizedBillingEvent } from "@/lib/entitlements/types";

export type CheckoutInput = {
  userId: string;
  email: string;
  customerId?: string | null;
  appOrigin: string;
};

export interface BillingAdapter {
  createSubscriptionCheckout(input: CheckoutInput): Promise<{ url: string }>;
  createCustomerPortal(customerId: string, appOrigin: string): Promise<{ url: string }>;
  constructWebhookEvent(
    rawBody: string,
    signature: string,
  ): Promise<NormalizedBillingEvent | null>;
}
