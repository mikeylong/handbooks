import { createStripeTestClient, runStagingCommand } from "./stripe-cli.mjs";
import { provisionStripeOffer } from "./stripe-staging.mjs";

await runStagingCommand("stripe_offer", async () =>
  provisionStripeOffer(createStripeTestClient()),
);
