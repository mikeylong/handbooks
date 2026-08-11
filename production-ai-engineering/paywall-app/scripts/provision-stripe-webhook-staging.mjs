import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Stripe from "stripe";

import {
  assertStripeTestKey,
  ensureStagingWebhook,
} from "./lib/stripe-staging.mjs";

const secretKey = process.env.STRIPE_SECRET_KEY;
let webhookUrl = process.env.STAGING_STRIPE_WEBHOOK_URL;
assertStripeTestKey(secretKey);
if (!webhookUrl) {
  const previewUrl = process.env.STAGING_PREVIEW_URL;
  if (!previewUrl) {
    throw new Error(
      "STAGING_STRIPE_WEBHOOK_URL or STAGING_PREVIEW_URL is required.",
    );
  }
  const bypassSecret = (
    await readFile(
      path.resolve(".data/vercel-protection-bypass-secret"),
      "utf8",
    )
  ).trim();
  if (!bypassSecret) {
    throw new Error("The local Vercel protection-bypass secret is empty.");
  }
  const target = new URL("/api/webhooks/stripe", previewUrl);
  target.searchParams.set("x-vercel-protection-bypass", bypassSecret);
  webhookUrl = target.href;
}

const stripe = new Stripe(secretKey, { typescript: true });
const result = await ensureStagingWebhook(stripe, webhookUrl);
if (result.secret) {
  const outputDirectory = path.resolve(".data");
  const outputPath = path.join(outputDirectory, "stripe-webhook-secret");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${result.secret}\n`, { mode: 0o600 });
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ready",
      environment: "staging",
      testMode: true,
      endpointId: result.endpointId,
      created: result.created,
      signingSecretStored: Boolean(result.secret),
      signingSecretPath: result.secret
        ? ".data/stripe-webhook-secret"
        : null,
    },
    null,
    2,
  )}\n`,
);
