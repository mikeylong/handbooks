import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENT_DEFINITIONS,
  MemoryAnalyticsSink,
  analyticsSourceFromRequest,
  assertAnalyticsEvent,
  captureAnalytics,
  createAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsProperty,
  type AnalyticsSink,
} from "../src/lib/analytics";

function valueFor(property: string): AnalyticsProperty {
  if (property === "billing_cycle_number") return 2;
  if (property === "amount_minor") return 500;
  if (property === "first_charge") return true;
  if (property === "currency") return "usd";
  if (property === "provider_result") return "accepted";
  return `value_${property}`;
}

describe("canonical analytics contract", () => {
  it("contains all 23 exact event names and validates each property set", () => {
    expect(Object.keys(ANALYTICS_EVENT_DEFINITIONS)).toHaveLength(23);
    for (const [eventName, required] of Object.entries(
      ANALYTICS_EVENT_DEFINITIONS,
    )) {
      const event = createAnalyticsEvent({
        eventName: eventName as AnalyticsEventName,
        actorRef: "usr_opaque_123",
        now: new Date("2026-08-04T17:00:00.000Z"),
        properties: Object.fromEntries(
          required.map((property) => [property, valueFor(property)]),
        ),
      });
      expect(assertAnalyticsEvent(event)).toBe(event);
    }
  });

  it("rejects unknown properties and forbidden personal-data keys", () => {
    const event = createAnalyticsEvent({
      eventName: "billing.checkout_started",
      actorRef: "usr_opaque_123",
      properties: {
        price_key: "monthly_500",
        checkout_flow_version: "v1",
      },
    });
    expect(() =>
      assertAnalyticsEvent({
        ...event,
        properties: { ...event.properties, unexpected: "value" },
      }),
    ).toThrow(/does not allow/);
    expect(() =>
      assertAnalyticsEvent({
        ...event,
        source: { ...event.source, token: "forbidden" } as never,
      }),
    ).toThrow(/does not allow|forbidden/);
  });

  it("captures privacy-minimized actor events in a local/test sink", async () => {
    const sink = new MemoryAnalyticsSink();
    await captureAnalytics(
      {
        eventName: "subscriber.pdf_access_granted",
        actorRef: "usr_opaque_123",
        properties: { delivery_mode: "authenticated_stream" },
      },
      sink,
    );
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      actor_ref: "usr_opaque_123",
      anonymous_ref: null,
      event_name: "subscriber.pdf_access_granted",
    });
    expect(JSON.stringify(sink.events[0])).not.toContain("reader@example.com");
  });

  it("never blocks product behavior when the sink fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failingSink: AnalyticsSink = {
      async capture() {
        throw new Error("sink unavailable");
      },
    };
    await expect(
      captureAnalytics(
        {
          eventName: "billing.checkout_started",
          actorRef: "usr_opaque_123",
          properties: {
            price_key: "monthly_500",
            checkout_flow_version: "v1",
          },
        },
        failingSink,
      ),
    ).resolves.toEqual({ accepted: false });
    warn.mockRestore();
  });

  it("normalizes source attribution without retaining a full URL", () => {
    const request = new Request("https://staging.surfaces.systems/api/checkout", {
      headers: {
        referer:
          "https://staging.surfaces.systems/?utm_source=linkedin&utm_campaign=founding_cohort&utm_content=systems_lesson&secret=drop-me",
      },
    });
    expect(analyticsSourceFromRequest(request)).toEqual({
      channel: "linkedin",
      campaign: "founding_cohort",
      content: "systems_lesson",
      referrer_host: "staging.surfaces.systems",
    });
  });
});
