import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { AnalyticsEvent, AnalyticsSink } from "./types";

export class LocalJsonlAnalyticsSink implements AnalyticsSink {
  private readonly filePath: string;

  constructor(filePath = "analytics-events.jsonl") {
    this.filePath = path.join(process.cwd(), ".data", path.basename(filePath));
  }

  async capture(event: AnalyticsEvent) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, { mode: 0o600 });
    return { accepted: true };
  }
}

export class MemoryAnalyticsSink implements AnalyticsSink {
  readonly events: AnalyticsEvent[] = [];

  async capture(event: AnalyticsEvent) {
    this.events.push(structuredClone(event));
    return { accepted: true };
  }
}
