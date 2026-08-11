export const STAGING_PRODUCT: Readonly<{
  name: string;
  description: string;
  lookupKey: string;
  amountMinor: number;
  currency: string;
  interval: string;
  metadata: Readonly<Record<string, string>>;
}>;

export const STAGING_WEBHOOK_EVENTS: readonly string[];

export function assertStripeTestKey(
  secretKey: unknown,
): asserts secretKey is string;

export function assertProtectedPreviewUrl(rawUrl: string): URL;

export function ensureStagingCatalog(
  stripe: any,
): Promise<{ productId: string; priceId: string }>;

export function ensureStagingPortal(
  stripe: any,
): Promise<{ portalConfigurationId: string }>;

export function ensureStagingWebhook(
  stripe: any,
  rawUrl: string,
): Promise<{
  endpointId: string;
  created: boolean;
  secret: string | null;
}>;
