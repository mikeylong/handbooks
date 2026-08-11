import { readRuntimeConfig } from "@/lib/config";

import { MockBillingAdapter } from "./mock";
import { StripeBillingAdapter } from "./stripe";
import type { BillingAdapter } from "./types";

let adapter: BillingAdapter | undefined;

export function getBillingAdapter(): BillingAdapter {
  if (adapter) return adapter;
  const config = readRuntimeConfig();
  adapter =
    config.APP_MODE === "production"
      ? new StripeBillingAdapter(config)
      : new MockBillingAdapter(config);
  return adapter;
}

export type { BillingAdapter, CheckoutInput } from "./types";
