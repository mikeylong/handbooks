import { createStripeTestClient, runStagingCommand } from "./stripe-cli.mjs";
import { provisionStripePortal } from "./stripe-staging.mjs";

await runStagingCommand("stripe_portal", async () =>
  provisionStripePortal(createStripeTestClient()),
);
