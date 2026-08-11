import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { InMemoryEntitlementRepository } from "./memory";
import type {
  ApplyStripeEventResult,
  Entitlement,
  EntitlementRepository,
  NormalizedBillingEvent,
} from "./types";

type FileState = {
  entitlements: Entitlement[];
  processedEventIds?: string[];
  processedEvents?: Record<string, string>;
};

const emptyState: FileState = {
  entitlements: [],
  processedEventIds: [],
  processedEvents: {},
};

export class FileEntitlementRepository implements EntitlementRepository {
  private queue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = path.join(process.cwd(), ".data", path.basename(filePath));
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readState(): Promise<FileState> {
    try {
      const state = JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as FileState;
      return {
        entitlements: Array.isArray(state.entitlements)
          ? state.entitlements
          : [],
        processedEventIds: Array.isArray(state.processedEventIds)
          ? state.processedEventIds
          : [],
        processedEvents:
          state.processedEvents && typeof state.processedEvents === "object"
            ? state.processedEvents
            : {},
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState;
      throw error;
    }
  }

  private async writeState(state: FileState) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporaryPath, this.filePath);
  }

  async getByUserId(userId: string): Promise<Entitlement | null> {
    return this.withLock(async () => {
      const state = await this.readState();
      return (
        state.entitlements.find((item) => item.userId === userId) ?? null
      );
    });
  }

  async applyStripeEvent(
    event: NormalizedBillingEvent,
  ): Promise<ApplyStripeEventResult> {
    return this.withLock(async () => {
      const state = await this.readState();
      const memory = new InMemoryEntitlementRepository(state);
      const result = await memory.applyStripeEvent(event);
      await this.writeState(memory.snapshot());
      return result;
    });
  }
}
