#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const acquisitionDir = dirname(fileURLToPath(import.meta.url));

const loadJson = async (relativePath) =>
  JSON.parse(await readFile(resolve(acquisitionDir, relativePath), "utf8"));

const acquisitionSchema = await loadJson("event-schema.json");
const crosswalk = await loadJson("event-crosswalk.json");
const canonicalSchema = await loadJson(crosswalk.canonical_schema);

if (acquisitionSchema.$ref !== crosswalk.canonical_schema) {
  throw new Error(
    `event-schema.json must reference ${crosswalk.canonical_schema}; found ${acquisitionSchema.$ref}`,
  );
}

const canonicalEvents = new Set(canonicalSchema.properties?.event_name?.enum ?? []);
if (canonicalEvents.size === 0) {
  throw new Error("Canonical subscriber-ops schema exposes no event_name enum.");
}

const stageEvents = crosswalk.derived_funnel_stages.flatMap(
  ({ raw_events: rawEvents }) => rawEvents,
);
const acquisitionEvents = new Set([
  ...stageEvents,
  ...crosswalk.diagnostic_raw_events,
]);

const duplicates = stageEvents.filter(
  (eventName, index) => stageEvents.indexOf(eventName) !== index,
);
if (duplicates.length > 0) {
  throw new Error(`Crosswalk repeats raw events: ${[...new Set(duplicates)].join(", ")}`);
}

const unsupported = [...acquisitionEvents].filter(
  (eventName) => !canonicalEvents.has(eventName),
);
if (unsupported.length > 0) {
  throw new Error(
    `Acquisition events missing from subscriber-ops schema: ${unsupported.join(", ")}`,
  );
}

const oldRawNames = [
  "teaser_view",
  "sample_view",
  "sample_download",
  "sample_engaged",
  "sales_page_view",
  "checkout_started",
  "subscription_started",
  "access_succeeded",
  "field_note_viewed",
  "retained",
  "cancelled",
  "refunded",
  "email_opt_in",
  "referral_shared",
];
const docs = [
  "README.md",
  "executive-plan.md",
  "channel-playbooks.md",
  "experiment-backlog.md",
  "measurement-schema.md",
];
const shortRawReferences = [];

for (const doc of docs) {
  const text = await readFile(resolve(acquisitionDir, doc), "utf8");
  for (const oldName of oldRawNames) {
    if (text.includes(`\`${oldName}\``)) {
      shortRawReferences.push(`${doc}: \`${oldName}\``);
    }
  }
}

if (shortRawReferences.length > 0) {
  throw new Error(
    `Deprecated unnamespaced raw-event references remain:\n${shortRawReferences.join("\n")}`,
  );
}

console.log(
  `event-contract: pass (${acquisitionEvents.size} acquisition events are present in ${canonicalEvents.size}-event canonical enum)`,
);
