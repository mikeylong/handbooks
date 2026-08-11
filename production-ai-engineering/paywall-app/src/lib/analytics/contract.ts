import {
  ANALYTICS_EVENT_DEFINITIONS,
  type AnalyticsChannel,
  type AnalyticsEvent,
} from "./types";

const EVENT_ID = /^evt_[A-Za-z0-9_-]{8,}$/;
const CURRENCY = /^[a-z]{3}$/;
const CHANNELS = new Set<AnalyticsChannel>([
  "linkedin",
  "reddit",
  "hacker_news",
  "direct",
  "referral",
  "email",
  "search",
  "other",
]);
const FORBIDDEN_KEYS = new Set([
  "email",
  "name",
  "ip",
  "ip_address",
  "token",
  "signature",
  "signed_url",
  "signedurl",
  "stripe_customer_id",
  "stripecustomerid",
  "raw_webhook",
  "rawwebhook",
]);
const EVENT_KEYS = new Set([
  "schema_version",
  "event_id",
  "event_name",
  "occurred_at",
  "actor_ref",
  "anonymous_ref",
  "session_ref",
  "release_id",
  "source",
  "properties",
]);
const SOURCE_KEYS = new Set([
  "channel",
  "campaign",
  "content",
  "referrer_host",
]);

function assertExactKeys(value: object, allowed: Set<string>, label: string) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${label} does not allow ${key}.`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) throw new Error(`${label} requires ${key}.`);
  }
}

function assertNoForbiddenData(value: unknown) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenData(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase().replaceAll("-", "_"))) {
      throw new Error(`Analytics property ${key} is forbidden.`);
    }
    assertNoForbiddenData(child);
  }
}

export function assertAnalyticsEvent(event: AnalyticsEvent) {
  assertExactKeys(event, EVENT_KEYS, "Analytics event");
  assertExactKeys(event.source, SOURCE_KEYS, "Analytics source");
  if (event.schema_version !== "1") throw new Error("Invalid analytics schema version.");
  if (!EVENT_ID.test(event.event_id)) throw new Error("Invalid analytics event ID.");
  if (!Object.hasOwn(ANALYTICS_EVENT_DEFINITIONS, event.event_name)) {
    throw new Error("Unknown analytics event name.");
  }
  if (!Number.isFinite(Date.parse(event.occurred_at))) {
    throw new Error("Invalid analytics timestamp.");
  }
  const hasActor = Boolean(event.actor_ref);
  const hasAnonymous = Boolean(event.anonymous_ref);
  if (hasActor === hasAnonymous) {
    throw new Error("Analytics requires exactly one actor or anonymous reference.");
  }
  if (!CHANNELS.has(event.source.channel)) {
    throw new Error("Invalid analytics channel.");
  }
  for (const value of [
    event.source.campaign,
    event.source.content,
    event.source.referrer_host,
  ]) {
    if (value !== null && (typeof value !== "string" || value.length > 253)) {
      throw new Error("Invalid analytics source field.");
    }
  }

  const required = ANALYTICS_EVENT_DEFINITIONS[event.event_name] as string[];
  for (const property of required) {
    const value = event.properties[property];
    if (value === undefined || value === null || value === "") {
      throw new Error(`${event.event_name} requires properties.${property}.`);
    }
    if (
      ["billing_cycle_number", "amount_minor"].includes(property) &&
      (!Number.isInteger(value) || Number(value) < 0)
    ) {
      throw new Error(`${property} must be a non-negative integer.`);
    }
    if (property === "billing_cycle_number" && Number(value) < 2) {
      throw new Error("billing_cycle_number must be at least 2.");
    }
    if (property === "first_charge" && typeof value !== "boolean") {
      throw new Error("first_charge must be boolean.");
    }
    if (property === "currency" && !CURRENCY.test(String(value))) {
      throw new Error("currency must be a lowercase three-letter code.");
    }
    if (property === "provider_result" && value !== "accepted") {
      throw new Error("provider_result must be accepted.");
    }
    if (
      !["billing_cycle_number", "amount_minor", "first_charge"].includes(
        property,
      ) &&
      (typeof value !== "string" || value === "")
    ) {
      throw new Error(`${property} must be a non-empty string.`);
    }
  }
  for (const property of Object.keys(event.properties)) {
    if (!required.includes(property)) {
      throw new Error(`${event.event_name} does not allow ${property}.`);
    }
  }
  assertNoForbiddenData(event);
  return event;
}
