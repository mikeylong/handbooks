import definitions from "./contract.json";

export const ANALYTICS_EVENT_DEFINITIONS = definitions;
export type AnalyticsEventName = keyof typeof definitions;
export type AnalyticsProperty = string | number | boolean;
export type AnalyticsChannel =
  | "linkedin"
  | "reddit"
  | "hacker_news"
  | "direct"
  | "referral"
  | "email"
  | "search"
  | "other";

export type AnalyticsSource = {
  channel: AnalyticsChannel;
  campaign: string | null;
  content: string | null;
  referrer_host: string | null;
};

export type AnalyticsEvent = {
  schema_version: "1";
  event_id: string;
  event_name: AnalyticsEventName;
  occurred_at: string;
  actor_ref: string | null;
  anonymous_ref: string | null;
  session_ref: string | null;
  release_id: string | null;
  source: AnalyticsSource;
  properties: Record<string, AnalyticsProperty>;
};

export interface AnalyticsSink {
  capture(event: AnalyticsEvent): Promise<{ accepted: boolean }>;
}
