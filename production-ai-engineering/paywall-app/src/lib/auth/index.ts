import { readRuntimeConfig } from "@/lib/config";

import { ClerkAuthAdapter } from "./clerk";
import { LocalAuthAdapter } from "./local";
import type { AuthAdapter, AuthSession } from "./types";

let adapter: AuthAdapter | undefined;

export function getAuthAdapter(): AuthAdapter {
  if (adapter) return adapter;
  const config = readRuntimeConfig();
  adapter =
    config.APP_MODE === "production"
      ? new ClerkAuthAdapter()
      : new LocalAuthAdapter(config);
  return adapter;
}

export async function getSession(): Promise<AuthSession | null> {
  return getAuthAdapter().getSession();
}

export type { AuthAdapter, AuthSession } from "./types";
