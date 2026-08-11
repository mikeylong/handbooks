import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type { AnalyticsEvent, AnalyticsSink } from "./types";

export class NeonAnalyticsOutboxSink implements AnalyticsSink {
  private sqlClient: NeonQueryFunction<false, false> | undefined;

  constructor(private readonly databaseUrl: string) {}

  private sql() {
    this.sqlClient ??= neon(this.databaseUrl);
    return this.sqlClient;
  }

  async capture(event: AnalyticsEvent) {
    const rows = await this.sql()`
      INSERT INTO paywall.analytics_outbox (
        event_id, occurred_at, event_name, payload
      ) VALUES (
        ${event.event_id},
        ${event.occurred_at},
        ${event.event_name},
        ${JSON.stringify(event)}::jsonb
      )
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `;
    return { accepted: rows.length === 1 };
  }
}
