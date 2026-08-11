import { describe, expect, it } from "vitest";

import {
  OFFER,
  PUBLIC_SAMPLE,
  REFUND_POLICY,
  isFirstChargeRefundEligible,
} from "../src/lib/product-policy";

describe("approved product defaults", () => {
  it("encodes the $5 monthly offer and free Sections 1-3", () => {
    expect(OFFER).toMatchObject({
      amountMinor: 500,
      currency: "usd",
      billingInterval: "month",
    });
    expect(PUBLIC_SAMPLE.sections).toEqual([1, 2, 3]);
  });

  it("keeps the first-charge refund window inclusive through day seven", () => {
    const paidAt = new Date("2026-08-04T00:00:00.000Z");
    expect(REFUND_POLICY.firstChargeWindowDays).toBe(7);
    expect(
      isFirstChargeRefundEligible({
        firstCharge: true,
        paidAt,
        requestedAt: new Date("2026-08-11T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isFirstChargeRefundEligible({
        firstCharge: true,
        paidAt,
        requestedAt: new Date("2026-08-11T00:00:00.001Z"),
      }),
    ).toBe(false);
    expect(
      isFirstChargeRefundEligible({
        firstCharge: false,
        paidAt,
        requestedAt: paidAt,
      }),
    ).toBe(false);
  });
});
