import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type {
  ApplyStripeEventResult,
  Entitlement,
  EntitlementRepository,
  NormalizedBillingEvent,
  SubscriptionStatus,
} from "./types";

type EntitlementRow = {
  user_id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: number | string | null;
  cancel_at_period_end: boolean;
  revocation_reason: Entitlement["revocationReason"];
  paid_billing_cycles: number | string;
  past_due_since: number | string | null;
  latest_event_created: number | string;
  latest_event_id: string;
  updated_at: string | Date;
};

function mapRow(row: EntitlementRow): Entitlement {
  return {
    userId: row.user_id,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    status: row.status,
    currentPeriodEnd:
      row.current_period_end === null ? null : Number(row.current_period_end),
    cancelAtPeriodEnd: row.cancel_at_period_end,
    revocationReason: row.revocation_reason,
    paidBillingCycles: Number(row.paid_billing_cycles),
    pastDueSince:
      row.past_due_since === null ? null : Number(row.past_due_since),
    latestEventCreated: Number(row.latest_event_created),
    latestEventId: row.latest_event_id,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class NeonEntitlementRepository implements EntitlementRepository {
  private sqlClient: NeonQueryFunction<false, false> | undefined;

  constructor(private readonly databaseUrl: string) {}

  private sql() {
    this.sqlClient ??= neon(this.databaseUrl);
    return this.sqlClient;
  }

  async getByUserId(userId: string) {
    const rows = await this.sql()`
      SELECT user_id, email, stripe_customer_id, stripe_subscription_id,
             status, current_period_end, cancel_at_period_end, revocation_reason,
             paid_billing_cycles, past_due_since,
             latest_event_created, latest_event_id, updated_at
      FROM paywall.entitlements
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const row = rows[0] as EntitlementRow | undefined;
    return row ? mapRow(row) : null;
  }

  async applyStripeEvent(
    event: NormalizedBillingEvent,
  ): Promise<ApplyStripeEventResult> {
    const rows = await this.sql()`
      SELECT outcome, resolved_user_id
      FROM paywall.apply_stripe_event(
        ${event.eventId},
        ${event.eventCreated},
        ${event.eventType},
        ${event.payloadSha256},
        ${event.userId},
        ${event.email},
        ${event.customerId},
        ${event.subscriptionId},
        ${event.status},
        ${event.currentPeriodEnd},
        ${event.cancelAtPeriodEnd},
        ${event.revocationReason},
        ${event.billingReason}
      )
    `;
    const result = rows[0] as
      | { outcome: ApplyStripeEventResult["outcome"]; resolved_user_id: string }
      | undefined;
    if (!result) throw new Error("Neon did not return a webhook outcome.");
    return {
      outcome: result.outcome,
      entitlement: await this.getByUserId(result.resolved_user_id),
    };
  }
}
