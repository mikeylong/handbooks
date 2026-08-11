import { z } from "zod";

export type AppMode = "mock" | "production";
type Environment = Record<string, string | undefined>;

const productionSchema = z.object({
  APP_MODE: z.literal("production"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().min(1).optional(),
  SELLER_NAME: z.string().min(1).default("Surfaces"),
  SUPPORT_EMAIL: z.string().email().default("hello@surfaces.systems"),
  BASE_DOMAIN: z.string().min(1).default("surfaces.systems"),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID: z.string().startsWith("price_"),
  STRIPE_PORTAL_CONFIGURATION_ID: z.string().startsWith("bpc_"),
  DATABASE_URL: z.string().url(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  HANDBOOK_BLOB_URL: z.string().url(),
  CURRENT_RELEASE_ID: z.string().min(8),
});

const mockSchema = z.object({
  APP_MODE: z.literal("mock").default("mock"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  VERCEL_URL: z.string().min(1).optional(),
  SELLER_NAME: z.string().min(1).default("Surfaces"),
  SUPPORT_EMAIL: z.string().email().default("hello@surfaces.systems"),
  BASE_DOMAIN: z.string().min(1).default("surfaces.systems"),
  LOCAL_AUTH_SECRET: z
    .string()
    .min(32)
    .default("local-only-auth-secret-change-before-sharing"),
  LOCAL_DEMO_USER_ID: z.string().min(1).default("demo-subscriber"),
  LOCAL_DEMO_EMAIL: z.string().email().default("reader@example.com"),
  LOCAL_DEMO_ENTITLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  LOCAL_ENTITLEMENT_FILE: z
    .string()
    .min(1)
    .default(".data/entitlements.json"),
  LOCAL_HANDBOOK_PATH: z
    .string()
    .min(1)
    .default("private/demo-handbook.pdf"),
  MOCK_WEBHOOK_SECRET: z
    .string()
    .min(32)
    .default("local-only-webhook-secret-change-before-sharing"),
  CURRENT_RELEASE_ID: z.string().min(8).default("rel_local_demo_20260804"),
});

export type ProductionConfig = z.infer<typeof productionSchema>;
export type MockConfig = z.infer<typeof mockSchema>;
export type RuntimeConfig = ProductionConfig | MockConfig;

export function getAppMode(environment: Environment = process.env): AppMode {
  return environment.APP_MODE === "production" ? "production" : "mock";
}

export function readRuntimeConfig(
  environment: Environment = process.env,
): RuntimeConfig {
  const mode = getAppMode(environment);
  if (mode === "production") {
    return productionSchema.parse({ ...environment, APP_MODE: mode });
  }

  if (environment.VERCEL_ENV === "production") {
    throw new Error(
      "APP_MODE=production is required for a production Vercel deployment.",
    );
  }

  return mockSchema.parse({ ...environment, APP_MODE: mode });
}

export function resolveAppOrigin(
  requestUrl?: string,
  environment: Environment = process.env,
) {
  const config = readRuntimeConfig(environment);
  const candidates = [
    requestUrl,
    config.NEXT_PUBLIC_APP_URL,
    config.VERCEL_URL ? `https://${config.VERCEL_URL}` : undefined,
    config.APP_MODE === "mock" ? "http://localhost:3000" : undefined,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (!new Set(["http:", "https:"]).has(url.protocol)) continue;
      if (config.APP_MODE === "production") {
        const permittedHost =
          url.hostname === config.BASE_DOMAIN ||
          url.hostname.endsWith(`.${config.BASE_DOMAIN}`) ||
          url.hostname.endsWith(".vercel.app");
        if (!permittedHost || url.protocol !== "https:") continue;
      }
      return url.origin;
    } catch {
      continue;
    }
  }
  throw new Error("No safe application origin is configured for this request.");
}
