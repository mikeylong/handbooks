import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const expectedProject = {
  id: "prj_MeImFDzIFm2AD6SYKoduyFfVsPtd",
  name: "production-ai-handbook-staging",
};
const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
if (
  project.projectId !== expectedProject.id ||
  project.projectName !== expectedProject.name
) {
  throw new Error("Refusing to update an unexpected Vercel project.");
}

const secret = readFileSync(".data/stripe-webhook-secret", "utf8").trim();
if (!secret.startsWith("whsec_")) {
  throw new Error("The local Stripe webhook signing secret is invalid.");
}

function run(args) {
  const result = spawnSync("vercel", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || "unknown error"}`.replaceAll(
      secret,
      "[redacted]",
    );
    throw new Error(`Vercel environment update failed: ${detail}`);
  }
}

run([
  "env",
  "update",
  "STRIPE_WEBHOOK_SECRET",
  "preview",
  "--value",
  secret,
  "--sensitive",
  "--yes",
]);
run([
  "env",
  "add",
  "STRIPE_WEBHOOK_SECRET",
  "development",
  "--value",
  secret,
  "--sensitive",
  "--yes",
]);

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ready",
      projectId: expectedProject.id,
      previewUpdated: true,
      developmentAdded: true,
      secretPrinted: false,
    },
    null,
    2,
  )}\n`,
);
