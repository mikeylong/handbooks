import { describe, expect, it } from "vitest";

import { InMemoryEntitlementRepository } from "../src/lib/entitlements/memory";
import { hasDownloadAccess } from "../src/lib/entitlements/policy";
import type { NormalizedBillingEvent } from "../src/lib/entitlements/types";
import { SECONDS_PER_DAY } from "../src/lib/product-policy";

const start = 1_000_000;

function event(
  overrides: Partial<NormalizedBillingEvent> = {},
): NormalizedBillingEvent {
  return {
    eventId: "evt_1",
    eventCreated: start,
    eventType: "customer.subscription.updated",
    userId: "user_1",
    email: "reader@example.com",
    customerId: "cus_1",
    subscriptionId: "sub_1",
    status: "active",
    currentPeriodEnd: start + 30 * SECONDS_PER_DAY,
    cancelAtPeriodEnd: false,
    revocationReason: null,
    amountMinor: null,
    currency: null,
    billingReason: null,
    payloadSha256: "a".repeat(64),
    ...overrides,
  };
}

function at(epochSeconds: number) {
  return new Date(epochSeconds * 1000);
}

describe("entitlement event application", () => {
  it("applies an event once and treats a repeat as a duplicate", async () => {
    const repository = new InMemoryEntitlementRepository();
    expect((await repository.applyStripeEvent(event())).outcome).toBe("applied");
    expect((await repository.applyStripeEvent(event())).outcome).toBe("duplicate");
    expect((await repository.getByUserId("user_1"))?.status).toBe("active");
  });

  it("rejects event ID reuse with different signed payload bytes", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    await expect(
      repository.applyStripeEvent(event({ payloadSha256: "b".repeat(64) })),
    ).rejects.toThrow(/different signed payload bytes/);
  });

  it("records but does not apply an older event", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    const result = await repository.applyStripeEvent(
      event({ eventId: "evt_old", eventCreated: start - 1, status: "canceled" }),
    );
    expect(result.outcome).toBe("stale");
    expect((await repository.getByUserId("user_1"))?.status).toBe("active");
  });

  it("resolves invoice events through the stored customer mapping", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    await repository.applyStripeEvent(
      event({
        eventId: "evt_invoice",
        eventCreated: start + 1,
        eventType: "invoice.payment_failed",
        userId: null,
        subscriptionId: null,
        status: "past_due",
        cancelAtPeriodEnd: null,
        billingReason: "subscription_cycle",
      }),
    );
    expect((await repository.getByUserId("user_1"))?.status).toBe("past_due");
  });

  it("counts paid renewal cycles from two onward", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    const renewal = await repository.applyStripeEvent(
      event({
        eventId: "evt_renewal",
        eventCreated: start + 1,
        eventType: "invoice.payment_succeeded",
        billingReason: "subscription_cycle",
        amountMinor: 500,
        currency: "usd",
      }),
    );
    expect(renewal.entitlement?.paidBillingCycles).toBe(2);
  });
});

describe("subscriber-access-v1", () => {
  it("keeps active and canceled subscribers only through paid-period end", async () => {
    const repository = new InMemoryEntitlementRepository();
    const active = (await repository.applyStripeEvent(event())).entitlement;
    expect(hasDownloadAccess(active, at(start + 10))).toBe(true);

    const canceled = (
      await repository.applyStripeEvent(
        event({
          eventId: "evt_cancel",
          eventCreated: start + 20,
          eventType: "customer.subscription.deleted",
          status: "canceled",
          revocationReason: "subscription_ended",
        }),
      )
    ).entitlement;
    const periodEnd = start + 30 * SECONDS_PER_DAY;
    expect(hasDownloadAccess(canceled, at(periodEnd - 1))).toBe(true);
    expect(hasDownloadAccess(canceled, at(periodEnd))).toBe(false);
  });

  it("provides one non-resetting seven-day past-due grace", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    const firstPastDue = start + 100;
    await repository.applyStripeEvent(
      event({
        eventId: "evt_failed_1",
        eventCreated: firstPastDue,
        eventType: "invoice.payment_failed",
        status: "past_due",
      }),
    );
    const repeated = (
      await repository.applyStripeEvent(
        event({
          eventId: "evt_failed_2",
          eventCreated: firstPastDue + 2 * SECONDS_PER_DAY,
          eventType: "invoice.payment_failed",
          status: "past_due",
        }),
      )
    ).entitlement;
    expect(repeated?.pastDueSince).toBe(firstPastDue);
    expect(
      hasDownloadAccess(repeated, at(firstPastDue + 7 * SECONDS_PER_DAY - 1)),
    ).toBe(true);
    expect(
      hasDownloadAccess(repeated, at(firstPastDue + 7 * SECONDS_PER_DAY)),
    ).toBe(false);
  });

  it.each([
    ["refund", "charge.refunded"],
    ["chargeback", "charge.dispute.created"],
  ] as const)("suspends immediately for %s", async (reason, eventType) => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    const revoked = (
      await repository.applyStripeEvent(
        event({
          eventId: `evt_${reason}`,
          eventCreated: start + 1,
          eventType,
          status: "canceled",
          revocationReason: reason,
        }),
      )
    ).entitlement;
    expect(hasDownloadAccess(revoked, at(start + 1))).toBe(false);
  });

  it("restores access and clears grace after a paid renewal", async () => {
    const repository = new InMemoryEntitlementRepository();
    await repository.applyStripeEvent(event());
    await repository.applyStripeEvent(
      event({
        eventId: "evt_failed",
        eventCreated: start + 1,
        eventType: "invoice.payment_failed",
        status: "past_due",
      }),
    );
    const renewed = (
      await repository.applyStripeEvent(
        event({
          eventId: "evt_paid",
          eventCreated: start + 2,
          eventType: "invoice.payment_succeeded",
          status: "active",
          billingReason: "subscription_cycle",
          amountMinor: 500,
          currency: "usd",
        }),
      )
    ).entitlement;
    expect(renewed?.pastDueSince).toBeNull();
    expect(hasDownloadAccess(renewed, at(start + 3))).toBe(true);
  });
});
