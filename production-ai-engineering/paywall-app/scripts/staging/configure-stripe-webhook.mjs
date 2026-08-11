import { createStripeTestClient, runStagingCommand } from "./stripe-cli.mjs";
import { provisionStripeWebhook } from "./stripe-staging.mjs";

await runStagingCommand("stripe_webhook", async () =>
  provisionStripeWebhook(
    createStripeTestClient(),
    process.env.STAGING_PREVIEW_URL,
  ),
);
