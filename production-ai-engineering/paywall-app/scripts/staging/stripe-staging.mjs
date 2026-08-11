import { createHash } from "node:crypto";

export const STRIPE_OFFER = Object.freeze({
  productId: "prod_production_ai_engineering_staging_v1",
  productName: "Production AI Engineering",
  productDescription: "Maintained production AI engineering handbook subscription.",
  priceLookupKey: "production_ai_engineering_usd_monthly_500_staging_v1",
  currency: "usd",
  unitAmount: 500,
  interval: "month",
  intervalCount: 1,
});

export const STRIPE_WEBHOOK_EVENTS = Object.freeze([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
]);

const RESOURCE_METADATA = Object.freeze({
  surfaces_resource_key: "production_ai_engineering_subscription",
  environment: "staging",
  contract_version: "subscriber-access-v1",
});

const WEBHOOK_METADATA = Object.freeze({
  surfaces_resource_key: "production_ai_engineering_webhook",
  environment: "staging",
  contract_version: "subscriber-access-v1",
});

const WEBHOOK_DESCRIPTION = "Production AI Engineering staging webhook";
const STAGING_PROJECT = "production-ai-handbook-staging";

export class StagingScriptError extends Error {
  constructor(code) {
    super(code);
    this.name = "StagingScriptError";
    this.code = code;
  }
}

function fail(code) {
  throw new StagingScriptError(code);
}

function requirePage(page, inventoryCode) {
  if (!page || !Array.isArray(page.data)) fail("stripe_response_invalid");
  if (page.has_more) fail(inventoryCode);
  return page.data;
}

function requireTestResource(resource, kind) {
  if (!resource || resource.livemode !== false) {
    fail(`${kind}_is_not_test_mode`);
  }
}

function requireStripeId(value, prefix, kind) {
  if (
    typeof value !== "string" ||
    !value.startsWith(prefix) ||
    !/^[A-Za-z0-9_]+$/.test(value)
  ) {
    fail(`${kind}_id_invalid`);
  }
  return value;
}

function metadataMatches(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual?.[key] === value);
}

function sameStringSet(left, right) {
  if (!Array.isArray(left) || left.length !== right.length) return false;
  return [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function isMissingStripeResource(error) {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error.statusCode === 404 || error.code === "resource_missing"),
  );
}

export function assertStripeTestKey(value) {
  if (
    typeof value !== "string" ||
    value !== value.trim() ||
    !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(value)
  ) {
    fail("stripe_test_key_required");
  }
  return value;
}

export function parseStagingPreviewUrl(value) {
  if (typeof value !== "string" || value !== value.trim()) {
    fail("staging_preview_url_required");
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    fail("staging_preview_url_invalid");
  }

  const hostname = url.hostname.toLowerCase();
  const productionAlias = `${STAGING_PROJECT}.vercel.app`;
  const isBoundedPreview =
    hostname.endsWith(".vercel.app") &&
    hostname.startsWith(`${STAGING_PROJECT}-`) &&
    hostname !== productionAlias;

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    !isBoundedPreview
  ) {
    fail("staging_preview_url_invalid");
  }

  return url;
}

export function buildStripeWebhookUrl(previewUrl) {
  return new URL("/api/webhooks/stripe", parseStagingPreviewUrl(previewUrl)).href;
}

function verifyProduct(product) {
  requireTestResource(product, "product");
  requireStripeId(product.id, "prod_", "product");
  if (
    product.id !== STRIPE_OFFER.productId ||
    product.name !== STRIPE_OFFER.productName ||
    product.active !== true ||
    !metadataMatches(product.metadata, RESOURCE_METADATA)
  ) {
    fail("stripe_product_contract_drift");
  }
  return product;
}

function productIdFromPrice(price) {
  if (typeof price?.product === "string") return price.product;
  return price?.product?.id;
}

function verifyPrice(price) {
  requireTestResource(price, "price");
  requireStripeId(price.id, "price_", "price");
  if (
    price.active !== true ||
    price.lookup_key !== STRIPE_OFFER.priceLookupKey ||
    price.currency !== STRIPE_OFFER.currency ||
    price.unit_amount !== STRIPE_OFFER.unitAmount ||
    price.type !== "recurring" ||
    price.recurring?.interval !== STRIPE_OFFER.interval ||
    price.recurring?.interval_count !== STRIPE_OFFER.intervalCount ||
    price.recurring?.usage_type !== "licensed" ||
    productIdFromPrice(price) !== STRIPE_OFFER.productId ||
    !metadataMatches(price.metadata, RESOURCE_METADATA)
  ) {
    fail("stripe_price_contract_drift");
  }
  return price;
}

async function listLookupPrices(stripe) {
  const request = {
    lookup_keys: [STRIPE_OFFER.priceLookupKey],
    limit: 10,
  };
  const active = requirePage(
    await stripe.prices.list({ ...request, active: true }),
    "stripe_price_inventory_exceeds_bound",
  );
  const inactive = requirePage(
    await stripe.prices.list({ ...request, active: false }),
    "stripe_price_inventory_exceeds_bound",
  );
  return [...new Map([...active, ...inactive].map((price) => [price.id, price])).values()];
}

async function retrieveOrCreateProduct(stripe) {
  try {
    return {
      product: verifyProduct(await stripe.products.retrieve(STRIPE_OFFER.productId)),
      created: false,
    };
  } catch (error) {
    if (!isMissingStripeResource(error)) throw error;
  }

  const product = await stripe.products.create(
    {
      id: STRIPE_OFFER.productId,
      name: STRIPE_OFFER.productName,
      description: STRIPE_OFFER.productDescription,
      active: true,
      metadata: RESOURCE_METADATA,
    },
    { idempotencyKey: "pae-staging-product-v1" },
  );
  return { product: verifyProduct(product), created: true };
}

export async function provisionStripeOffer(stripe) {
  const prices = await listLookupPrices(stripe);
  if (prices.length > 1) fail("stripe_price_lookup_not_unique");

  const { product, created: productCreated } =
    await retrieveOrCreateProduct(stripe);

  let price = prices[0];
  let priceCreated = false;
  if (price) {
    verifyPrice(price);
  } else {
    price = verifyPrice(
      await stripe.prices.create(
        {
          active: true,
          currency: STRIPE_OFFER.currency,
          unit_amount: STRIPE_OFFER.unitAmount,
          product: product.id,
          recurring: {
            interval: STRIPE_OFFER.interval,
            interval_count: STRIPE_OFFER.intervalCount,
            usage_type: "licensed",
          },
          lookup_key: STRIPE_OFFER.priceLookupKey,
          nickname: "Production AI Engineering staging monthly",
          metadata: RESOURCE_METADATA,
        },
        { idempotencyKey: "pae-staging-price-v1" },
      ),
    );
    priceCreated = true;
  }

  return {
    operation: "stripe_offer",
    status: productCreated || priceCreated ? "created" : "verified",
    product_id: requireStripeId(product.id, "prod_", "product"),
    price_id: requireStripeId(price.id, "price_", "price"),
    lookup_key: STRIPE_OFFER.priceLookupKey,
  };
}

function portalCancellationMatches(configuration) {
  const cancellation = configuration?.features?.subscription_cancel;
  return cancellation?.enabled === true && cancellation?.mode === "at_period_end";
}

function verifyPortalConfiguration(configuration) {
  requireTestResource(configuration, "portal_configuration");
  requireStripeId(configuration.id, "bpc_", "portal_configuration");
  if (
    configuration.active !== true ||
    configuration.is_default !== true ||
    !portalCancellationMatches(configuration)
  ) {
    fail("stripe_portal_contract_drift");
  }
  return configuration;
}

export async function provisionStripePortal(stripe) {
  const configurations = requirePage(
    await stripe.billingPortal.configurations.list({ limit: 100 }),
    "stripe_portal_inventory_exceeds_bound",
  );
  const defaults = configurations.filter((configuration) => configuration.is_default);
  if (defaults.length !== 1) fail("stripe_default_portal_configuration_not_unique");

  const current = defaults[0];
  requireTestResource(current, "portal_configuration");
  let configuration = current;
  let status = "verified";
  if (!portalCancellationMatches(current) || current.active !== true) {
    configuration = await stripe.billingPortal.configurations.update(
      current.id,
      {
        active: true,
        features: {
          subscription_cancel: {
            enabled: true,
            mode: "at_period_end",
          },
        },
      },
      { idempotencyKey: "pae-staging-portal-cancel-v1" },
    );
    status = "updated";
  }
  verifyPortalConfiguration(configuration);

  return {
    operation: "stripe_portal",
    status,
    configuration_id: requireStripeId(
      configuration.id,
      "bpc_",
      "portal_configuration",
    ),
    cancellation_mode: "at_period_end",
  };
}

function webhookMatches(endpoint, expectedUrl) {
  return (
    endpoint.url === expectedUrl &&
    endpoint.status === "enabled" &&
    sameStringSet(endpoint.enabled_events, STRIPE_WEBHOOK_EVENTS) &&
    endpoint.description === WEBHOOK_DESCRIPTION &&
    metadataMatches(endpoint.metadata, WEBHOOK_METADATA)
  );
}

function verifyWebhookEndpoint(endpoint, expectedUrl) {
  requireTestResource(endpoint, "webhook_endpoint");
  requireStripeId(endpoint.id, "we_", "webhook_endpoint");
  if (!webhookMatches(endpoint, expectedUrl)) {
    fail("stripe_webhook_contract_drift");
  }
  return endpoint;
}

export async function provisionStripeWebhook(stripe, previewUrl) {
  const expectedUrl = buildStripeWebhookUrl(previewUrl);
  const endpoints = requirePage(
    await stripe.webhookEndpoints.list({ limit: 100 }),
    "stripe_webhook_inventory_exceeds_bound",
  ).filter((endpoint) => endpoint.url === expectedUrl);
  if (endpoints.length > 1) fail("stripe_webhook_url_not_unique");

  let endpoint = endpoints[0];
  let status = "verified";
  if (!endpoint) {
    const idempotencySuffix = createHash("sha256")
      .update(expectedUrl)
      .digest("hex")
      .slice(0, 16);
    endpoint = await stripe.webhookEndpoints.create(
      {
        url: expectedUrl,
        connect: false,
        enabled_events: [...STRIPE_WEBHOOK_EVENTS],
        description: WEBHOOK_DESCRIPTION,
        metadata: WEBHOOK_METADATA,
      },
      { idempotencyKey: `pae-staging-webhook-v1-${idempotencySuffix}` },
    );
    status = "created";
  } else {
    requireTestResource(endpoint, "webhook_endpoint");
    if (!webhookMatches(endpoint, expectedUrl)) {
      endpoint = await stripe.webhookEndpoints.update(
        endpoint.id,
        {
          url: expectedUrl,
          disabled: false,
          enabled_events: [...STRIPE_WEBHOOK_EVENTS],
          description: WEBHOOK_DESCRIPTION,
          metadata: WEBHOOK_METADATA,
        },
        { idempotencyKey: "pae-staging-webhook-update-v1" },
      );
      status = "updated";
    }
  }
  verifyWebhookEndpoint(endpoint, expectedUrl);

  return {
    operation: "stripe_webhook",
    status,
    webhook_endpoint_id: requireStripeId(endpoint.id, "we_", "webhook_endpoint"),
    endpoint_host: new URL(expectedUrl).hostname,
    event_count: STRIPE_WEBHOOK_EVENTS.length,
  };
}

function statusFor(value, validate = (candidate) => Boolean(candidate)) {
  if (value === undefined || value === "") return "missing";
  try {
    return validate(value) ? "ready" : "invalid";
  } catch {
    return "invalid";
  }
}

function urlStatus(value, protocols = new Set(["https:"])) {
  return statusFor(value, (candidate) => protocols.has(new URL(candidate).protocol));
}

export function checkStagingEnvironment(environment = process.env) {
  const stripeKeyStatus = statusFor(environment.STRIPE_SECRET_KEY, (value) => {
    assertStripeTestKey(value);
    return true;
  });
  const previewStatus = statusFor(environment.STAGING_PREVIEW_URL, (value) => {
    parseStagingPreviewUrl(value);
    return true;
  });

  const appRuntime = [
    { name: "APP_MODE", status: statusFor(environment.APP_MODE, (value) => value === "production") },
    {
      name: "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
      status: statusFor(environment.NEXT_PUBLIC_CLERK_SIGN_IN_URL, (value) => value === "/sign-in"),
    },
    {
      name: "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
      status: statusFor(environment.NEXT_PUBLIC_CLERK_SIGN_UP_URL, (value) => value === "/sign-up"),
    },
    {
      name: "CLERK_SECRET_KEY",
      status: statusFor(environment.CLERK_SECRET_KEY, (value) => /^sk_test_[A-Za-z0-9]+$/.test(value)),
    },
    {
      name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      status: statusFor(environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, (value) => /^pk_test_[A-Za-z0-9]+$/.test(value)),
    },
    { name: "STRIPE_SECRET_KEY", status: stripeKeyStatus },
    {
      name: "STRIPE_WEBHOOK_SECRET",
      status: statusFor(environment.STRIPE_WEBHOOK_SECRET, (value) => /^whsec_[A-Za-z0-9]+$/.test(value)),
    },
    {
      name: "STRIPE_PRICE_ID",
      status: statusFor(environment.STRIPE_PRICE_ID, (value) => /^price_[A-Za-z0-9_]+$/.test(value)),
    },
    {
      name: "DATABASE_URL",
      status: statusFor(environment.DATABASE_URL, (value) => new Set(["postgres:", "postgresql:"]).has(new URL(value).protocol)),
    },
    { name: "BLOB_READ_WRITE_TOKEN", status: statusFor(environment.BLOB_READ_WRITE_TOKEN) },
    { name: "HANDBOOK_BLOB_URL", status: urlStatus(environment.HANDBOOK_BLOB_URL) },
    {
      name: "CURRENT_RELEASE_ID",
      status: statusFor(environment.CURRENT_RELEASE_ID, (value) => value.length >= 8),
    },
  ];

  const groups = {
    stripe_offer: [{ name: "STRIPE_SECRET_KEY", status: stripeKeyStatus }],
    stripe_portal: [{ name: "STRIPE_SECRET_KEY", status: stripeKeyStatus }],
    stripe_webhook: [
      { name: "STRIPE_SECRET_KEY", status: stripeKeyStatus },
      { name: "STAGING_PREVIEW_URL", status: previewStatus },
    ],
    app_runtime: appRuntime,
  };
  const ready = Object.fromEntries(
    Object.entries(groups).map(([name, checks]) => [
      name,
      {
        status: checks.every((check) => check.status === "ready")
          ? "ready"
          : "not_ready",
        checks,
      },
    ]),
  );
  return { status: Object.values(ready).every((group) => group.status === "ready") ? "ready" : "not_ready", groups: ready };
}
