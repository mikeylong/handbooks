import { describe, expect, it, vi } from "vitest";

import {
  STAGING_PRODUCT,
  STAGING_WEBHOOK_EVENTS,
  assertProtectedPreviewUrl,
  assertStripeTestKey,
  ensureStagingCatalog,
  ensureStagingPortal,
  ensureStagingWebhook,
} from "../scripts/lib/stripe-staging.mjs";

describe("Stripe staging provisioning guardrails", () => {
  it("accepts only test or sandbox secret keys", () => {
    expect(() => assertStripeTestKey("sk_test_example")).not.toThrow();
    expect(() => assertStripeTestKey("sk_sbx_example")).not.toThrow();
    expect(() => assertStripeTestKey("sk_live_example")).toThrow(
      /non-test Stripe secret key/,
    );
  });

  it("accepts only the exact webhook path on an HTTPS Vercel preview", () => {
    const url = assertProtectedPreviewUrl(
      "https://production-ai-handbook-staging-abc.vercel.app/api/webhooks/stripe?x-vercel-protection-bypass=staging-secret",
    );
    expect(url.hostname).toContain("production-ai-handbook-staging");
    expect(url.searchParams.get("x-vercel-protection-bypass")).toBe(
      "staging-secret",
    );
    expect(() =>
      assertProtectedPreviewUrl(
        "https://surfaces.systems/api/webhooks/stripe",
      ),
    ).toThrow(/HTTPS Vercel preview URL/);
    expect(() =>
      assertProtectedPreviewUrl(
        "https://preview.vercel.app/api/webhooks/not-stripe",
      ),
    ).toThrow(/must use \/api\/webhooks\/stripe exactly/);
  });

  it("creates the one approved test product and recurring price", async () => {
    const createProduct = vi.fn().mockResolvedValue({ id: "prod_staging" });
    const createPrice = vi.fn().mockResolvedValue({ id: "price_staging" });
    const stripe = {
      products: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: createProduct,
      },
      prices: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: createPrice,
      },
    };

    await expect(ensureStagingCatalog(stripe)).resolves.toEqual({
      productId: "prod_staging",
      priceId: "price_staging",
    });
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        name: STAGING_PRODUCT.name,
        metadata: STAGING_PRODUCT.metadata,
      }),
    );
    expect(createPrice).toHaveBeenCalledWith(
      expect.objectContaining({
        product: "prod_staging",
        currency: "usd",
        unit_amount: 500,
        recurring: { interval: "month" },
        lookup_key: STAGING_PRODUCT.lookupKey,
      }),
    );
  });

  it("creates an explicit staging portal that cancels at period end", async () => {
    const create = vi.fn().mockResolvedValue({ id: "bpc_staging" });
    const stripe = {
      billingPortal: {
        configurations: {
          list: vi.fn().mockResolvedValue({ data: [] }),
          create,
          update: vi.fn(),
        },
      },
    };

    await expect(ensureStagingPortal(stripe)).resolves.toEqual({
      portalConfigurationId: "bpc_staging",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Production AI Engineering staging",
        features: expect.objectContaining({
          subscription_cancel: expect.objectContaining({
            enabled: true,
            mode: "at_period_end",
          }),
        }),
      }),
    );
  });

  it("creates the exact staging webhook event set", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "we_staging",
      secret: "whsec_staging",
    });
    const stripe = {
      webhookEndpoints: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create,
        update: vi.fn(),
      },
    };

    await expect(
      ensureStagingWebhook(
        stripe,
        "https://production-ai-handbook-staging-abc.vercel.app/api/webhooks/stripe",
      ),
    ).resolves.toEqual({
      endpointId: "we_staging",
      created: true,
      secret: "whsec_staging",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ enabled_events: [...STAGING_WEBHOOK_EVENTS] }),
    );
  });
});
