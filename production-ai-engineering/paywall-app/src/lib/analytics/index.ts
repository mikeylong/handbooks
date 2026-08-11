import { randomUUID } from "node:crypto";

import { readRuntimeConfig } from "../config";

import { assertAnalyticsEvent } from "./contract";
import { LocalJsonlAnalyticsSink } from "./local";
import { NeonAnalyticsOutboxSink } from "./neon";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperty,
  AnalyticsSink,
  AnalyticsSource,
} from "./types";

let sink: AnalyticsSink | undefined;

export function getAnalyticsSink(): AnalyticsSink {
  if (sink) return sink;
  const config = readRuntimeConfig();
  sink =
    config.APP_MODE === "production"
      ? new NeonAnalyticsOutboxSink(config.DATABASE_URL)
      : new LocalJsonlAnalyticsSink();
  return sink;
}

function safeSourceValue(value: string | null) {
  if (!value) return null;
  const sanitized = value.trim().slice(0, 100);
  return /^[A-Za-z0-9_.-]+$/.test(sanitized) ? sanitized : null;
}

export function analyticsSourceFromRequest(request?: Request): AnalyticsSource {
  if (!request) {
    return { channel: "direct", campaign: null, content: null, referrer_host: null };
  }
  const referrer = request.headers.get("referer");
  let url: URL | null = null;
  try {
    url = referrer ? new URL(referrer) : null;
  } catch {
    url = null;
  }
  const source = safeSourceValue(url?.searchParams.get("utm_source") ?? null);
  const host = url?.hostname.toLowerCase().slice(0, 253) ?? null;
  const channel =
    source === "linkedin" || host?.endsWith("linkedin.com")
      ? "linkedin"
      : source === "reddit" || host?.endsWith("reddit.com")
        ? "reddit"
        : source === "hacker_news" || host === "news.ycombinator.com"
          ? "hacker_news"
          : source === "email"
            ? "email"
            : source === "search"
              ? "search"
              : source === "referral"
                ? "referral"
                : source
                  ? "other"
                  : "direct";
  return {
    channel,
    campaign: safeSourceValue(url?.searchParams.get("utm_campaign") ?? null),
    content: safeSourceValue(url?.searchParams.get("utm_content") ?? null),
    referrer_host: host,
  };
}

export function createAnalyticsEvent(input: {
  eventName: AnalyticsEventName;
  actorRef?: string | null;
  anonymousRef?: string | null;
  sessionRef?: string | null;
  releaseId?: string | null;
  source?: AnalyticsSource;
  properties: Record<string, AnalyticsProperty>;
  now?: Date;
}): AnalyticsEvent {
  const config = readRuntimeConfig();
  return assertAnalyticsEvent({
    schema_version: "1",
    event_id: `evt_${randomUUID().replaceAll("-", "")}`,
    event_name: input.eventName,
    occurred_at: (input.now ?? new Date()).toISOString(),
    actor_ref: input.actorRef ?? null,
    anonymous_ref: input.anonymousRef ?? null,
    session_ref: input.sessionRef ?? null,
    release_id: input.releaseId ?? config.CURRENT_RELEASE_ID ?? null,
    source: input.source ?? {
      channel: "direct",
      campaign: null,
      content: null,
      referrer_host: null,
    },
    properties: input.properties,
  });
}

export async function captureAnalytics(
  input: Parameters<typeof createAnalyticsEvent>[0],
  analyticsSink: AnalyticsSink = getAnalyticsSink(),
) {
  try {
    const event = createAnalyticsEvent(input);
    return await analyticsSink.capture(event);
  } catch {
    console.warn("Analytics capture failed", { eventName: input.eventName });
    return { accepted: false };
  }
}

export { assertAnalyticsEvent } from "./contract";
export { MemoryAnalyticsSink } from "./local";
export { ANALYTICS_EVENT_DEFINITIONS } from "./types";
export type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperty,
  AnalyticsSink,
  AnalyticsSource,
} from "./types";
