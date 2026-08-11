import { describe, expect, it } from "vitest";

import { readRuntimeConfig, resolveAppOrigin } from "../src/lib/config";

const productionEnvironment = {
  APP_MODE: "production",
  VERCEL_URL: "production-ai-handbook-staging-preview.vercel.app",
  CLERK_SECRET_KEY: "sk_test_clerk",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_ID: "price_test",
  STRIPE_PORTAL_CONFIGURATION_ID: "bpc_test",
  DATABASE_URL: "postgresql://example.com/paywall",
  BLOB_READ_WRITE_TOKEN: "blob_test",
  HANDBOOK_BLOB_URL: "https://example.com/private.pdf",
  CURRENT_RELEASE_ID: "rel_staging_test",
};

describe("runtime configuration", () => {
  it("builds a complete credential-free mock configuration", () => {
    const config = readRuntimeConfig({});
    expect(config.APP_MODE).toBe("mock");
    if (config.APP_MODE === "mock") {
      expect(config.LOCAL_DEMO_ENTITLED).toBe(true);
    }
  });

  it("fails closed when production credentials are missing", () => {
    expect(() => readRuntimeConfig({ APP_MODE: "production" })).toThrow();
  });

  it("refuses mock mode in a production Vercel runtime", () => {
    expect(() => readRuntimeConfig({ VERCEL_ENV: "production" })).toThrow(
      /APP_MODE=production/,
    );
  });

  it("prefers the safe request origin for Vercel previews", () => {
    expect(
      resolveAppOrigin(
        "https://branch-123.vercel.app/api/checkout",
        productionEnvironment,
      ),
    ).toBe("https://branch-123.vercel.app");
  });

  it("falls back to VERCEL_URL and rejects an untrusted request host", () => {
    expect(
      resolveAppOrigin("https://attacker.example/api/checkout", productionEnvironment),
    ).toBe("https://production-ai-handbook-staging-preview.vercel.app");
  });
});
