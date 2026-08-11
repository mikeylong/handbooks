import Stripe from "stripe";

import {
  assertStripeTestKey,
  ensureStagingCatalog,
  ensureStagingPortal,
} from "./lib/stripe-staging.mjs";

const secretKey = process.env.STRIPE_SECRET_KEY;
assertStripeTestKey(secretKey);

const stripe = new Stripe(secretKey, { typescript: true });
const catalog = await ensureStagingCatalog(stripe);
const portal = await ensureStagingPortal(stripe);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ready",
      environment: "staging",
      testMode: true,
      ...catalog,
      ...portal,
    },
    null,
    2,
  )}\n`,
);
