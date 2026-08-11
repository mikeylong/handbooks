import { readRuntimeConfig } from "@/lib/config";

import { FileEntitlementRepository } from "./file";
import { NeonEntitlementRepository } from "./neon";
import type { Entitlement, EntitlementRepository } from "./types";

let repository: EntitlementRepository | undefined;

export function getEntitlementRepository(): EntitlementRepository {
  if (repository) return repository;
  const config = readRuntimeConfig();
  repository =
    config.APP_MODE === "production"
      ? new NeonEntitlementRepository(config.DATABASE_URL)
      : new FileEntitlementRepository(config.LOCAL_ENTITLEMENT_FILE);
  return repository;
}

export async function getEntitlementForUser(
  userId: string,
  email: string,
): Promise<Entitlement | null> {
  const config = readRuntimeConfig();
  const stored = await getEntitlementRepository().getByUserId(userId);
  if (stored || config.APP_MODE === "production") return stored;

  if (
    config.LOCAL_DEMO_ENTITLED &&
    userId === config.LOCAL_DEMO_USER_ID
  ) {
    return {
      userId,
      email,
      stripeCustomerId: "cus_mock_subscriber",
      stripeSubscriptionId: "sub_mock_subscriber",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      revocationReason: null,
      paidBillingCycles: 0,
      pastDueSince: null,
      latestEventCreated: 0,
      latestEventId: "evt_local_demo",
      updatedAt: new Date(0).toISOString(),
    };
  }

  return null;
}

export { accessDenialReason, hasDownloadAccess } from "./policy";
export type {
  ApplyStripeEventResult,
  Entitlement,
  EntitlementRepository,
  NormalizedBillingEvent,
  SubscriptionStatus,
} from "./types";
