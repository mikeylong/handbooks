import Stripe from "stripe";

import { StagingScriptError, assertStripeTestKey } from "./stripe-staging.mjs";

export function createStripeTestClient(environment = process.env) {
  const key = assertStripeTestKey(environment.STRIPE_SECRET_KEY);
  return new Stripe(key, {
    maxNetworkRetries: 1,
    timeout: 20_000,
  });
}

export async function runStagingCommand(operation, command) {
  try {
    const result = await command();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code =
      error instanceof StagingScriptError
        ? error.code
        : "stripe_provider_request_failed";
    process.stderr.write(
      `${JSON.stringify({ operation, status: "failed", error: code })}\n`,
    );
    process.exitCode = 1;
  }
}
