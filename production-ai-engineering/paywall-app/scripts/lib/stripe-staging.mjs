export const STAGING_PRODUCT = Object.freeze({
  name: "Production AI Engineering",
  description:
    "Current private handbook PDF, material editions, and Tuesday field notes.",
  lookupKey: "production_ai_handbook_usd_monthly_500",
  amountMinor: 500,
  currency: "usd",
  interval: "month",
  metadata: Object.freeze({
    application: "production-ai-handbook",
    environment: "staging",
    offer_id: "production_ai_handbook_monthly",
    policy_id: "subscriber-access-v1",
  }),
});

export const STAGING_WEBHOOK_EVENTS = Object.freeze([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
]);

const STAGING_PORTAL_METADATA = Object.freeze({
  application: STAGING_PRODUCT.metadata.application,
  environment: STAGING_PRODUCT.metadata.environment,
  configuration: "subscriber-portal-v1",
});

export function assertStripeTestKey(secretKey) {
  if (
    typeof secretKey !== "string" ||
    (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("sk_sbx_"))
  ) {
    throw new Error("Refusing to use a non-test Stripe secret key.");
  }
}

export function assertProtectedPreviewUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".vercel.app") ||
    url.username ||
    url.password
  ) {
    throw new Error("Webhook target must be an HTTPS Vercel preview URL.");
  }
  if (url.pathname !== "/api/webhooks/stripe") {
    throw new Error("Webhook target must use /api/webhooks/stripe exactly.");
  }
  return url;
}

function sameMetadata(actual = {}) {
  return Object.entries(STAGING_PRODUCT.metadata).every(
    ([key, value]) => actual[key] === value,
  );
}

export async function ensureStagingCatalog(stripe) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  const matches = products.data.filter((product) =>
    sameMetadata(product.metadata),
  );
  if (matches.length > 1) {
    throw new Error("Multiple active staging handbook Products exist.");
  }
  const product =
    matches[0] ??
    (await stripe.products.create({
      name: STAGING_PRODUCT.name,
      description: STAGING_PRODUCT.description,
      metadata: STAGING_PRODUCT.metadata,
    }));

  const prices = await stripe.prices.list({
    active: true,
    lookup_keys: [STAGING_PRODUCT.lookupKey],
    limit: 100,
  });
  if (prices.data.length > 1) {
    throw new Error("Multiple active Prices use the staging lookup key.");
  }
  let price = prices.data[0];
  if (price) {
    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    const valid =
      productId === product.id &&
      price.currency === STAGING_PRODUCT.currency &&
      price.unit_amount === STAGING_PRODUCT.amountMinor &&
      price.recurring?.interval === STAGING_PRODUCT.interval;
    if (!valid) {
      throw new Error("The staging Price lookup key has conflicting terms.");
    }
  } else {
    price = await stripe.prices.create({
      product: product.id,
      currency: STAGING_PRODUCT.currency,
      unit_amount: STAGING_PRODUCT.amountMinor,
      recurring: { interval: STAGING_PRODUCT.interval },
      lookup_key: STAGING_PRODUCT.lookupKey,
      metadata: STAGING_PRODUCT.metadata,
    });
  }

  return { productId: product.id, priceId: price.id };
}

export async function ensureStagingPortal(stripe) {
  const configurations = await stripe.billingPortal.configurations.list({
    limit: 100,
  });
  const matches = configurations.data.filter(
    (candidate) =>
      candidate.metadata?.application === STAGING_PORTAL_METADATA.application &&
      candidate.metadata?.environment === STAGING_PORTAL_METADATA.environment &&
      candidate.metadata?.configuration === STAGING_PORTAL_METADATA.configuration,
  );
  if (matches.length > 1) {
    throw new Error("Multiple handbook staging portal configurations exist.");
  }

  const settings = {
    business_profile: {
      headline: "Manage your Production AI Engineering subscription",
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "switched_service",
            "unused",
            "other",
          ],
        },
      },
    },
    metadata: STAGING_PORTAL_METADATA,
  };

  const configuration = matches[0]
    ? await stripe.billingPortal.configurations.update(matches[0].id, settings)
    : await stripe.billingPortal.configurations.create({
        ...settings,
        name: "Production AI Engineering staging",
      });
  return { portalConfigurationId: configuration.id };
}

export async function ensureStagingWebhook(stripe, rawUrl) {
  const target = assertProtectedPreviewUrl(rawUrl);
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const matches = endpoints.data.filter((endpoint) => endpoint.url === target.href);
  if (matches.length > 1) {
    throw new Error("Multiple Stripe webhook endpoints use the preview URL.");
  }
  const enabledEvents = [...STAGING_WEBHOOK_EVENTS];
  if (matches[0]) {
    const endpoint = await stripe.webhookEndpoints.update(matches[0].id, {
      enabled_events: enabledEvents,
      description: "Production AI Engineering protected staging preview",
    });
    return { endpointId: endpoint.id, created: false, secret: null };
  }
  const endpoint = await stripe.webhookEndpoints.create({
    url: target.href,
    enabled_events: enabledEvents,
    description: "Production AI Engineering protected staging preview",
  });
  if (!endpoint.secret) {
    throw new Error("Stripe did not return a signing secret for the new endpoint.");
  }
  return { endpointId: endpoint.id, created: true, secret: endpoint.secret };
}
