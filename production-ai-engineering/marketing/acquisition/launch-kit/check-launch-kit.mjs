#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const kitDir = dirname(fileURLToPath(import.meta.url));
const acquisitionDir = resolve(kitDir, "..");

await import(resolve(acquisitionDir, "check-event-contract.mjs"));

const load = (name) => readFile(resolve(kitDir, name), "utf8");
const files = [
  "README.md",
  "six-week-calendar.md",
  "linkedin-drafts.md",
  "community-prompts.md",
  "hacker-news-draft.md",
  "email-drafts.md",
  "utm-links.md",
  "same-day-community-checklist.md",
  "approval-sheet.md",
];

const documents = new Map(
  await Promise.all(files.map(async (name) => [name, await load(name)])),
);
const allText = [...documents.values()].join("\n");

const csv = (await load("utm-register.csv")).trim().split(/\r?\n/);
const expectedHeader = [
  "link_id",
  "destination",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_id",
  "canonical_channel",
  "artifact_id",
  "approval_status",
];
const header = csv[0].split(",");

if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
  throw new Error(`Unexpected UTM header: ${csv[0]}`);
}

const rows = csv.slice(1).map((line, index) => {
  const values = line.split(",");
  if (values.length !== header.length) {
    throw new Error(`UTM row ${index + 2} has ${values.length} fields; expected ${header.length}`);
  }
  return Object.fromEntries(header.map((key, valueIndex) => [key, values[valueIndex]]));
});

const canonicalSchema = JSON.parse(
  await readFile(
    resolve(kitDir, "../../../subscriber-ops/schemas/analytics-event.schema.json"),
    "utf8",
  ),
);
const canonicalChannels = new Set(
  canonicalSchema.properties?.source?.properties?.channel?.enum ?? [],
);
const allowedMediums = new Set([
  "direct_message",
  "organic_social",
  "owned_content",
  "community",
  "one_to_one",
  "email",
  "referral",
]);
const allowedStatuses = new Set(["pending", "held"]);
const snakeCase = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const experimentId = /^[A-Z]+(?:-[A-Z]+)?-[0-9]{2}$/;
const linkIds = new Set();

for (const row of rows) {
  if (linkIds.has(row.link_id)) {
    throw new Error(`Duplicate UTM link_id: ${row.link_id}`);
  }
  linkIds.add(row.link_id);

  if (row.destination !== "sample") {
    throw new Error(`${row.link_id} points to ${row.destination}; launch acquisition links must lead to the sample`);
  }
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    if (!snakeCase.test(row[key])) {
      throw new Error(`${row.link_id} has invalid ${key}: ${row[key]}`);
    }
  }
  if (!allowedMediums.has(row.utm_medium)) {
    throw new Error(`${row.link_id} has unapproved medium: ${row.utm_medium}`);
  }
  if (!experimentId.test(row.utm_id)) {
    throw new Error(`${row.link_id} has invalid experiment id: ${row.utm_id}`);
  }
  if (!canonicalChannels.has(row.canonical_channel)) {
    throw new Error(`${row.link_id} has noncanonical channel: ${row.canonical_channel}`);
  }
  if (!allowedStatuses.has(row.approval_status)) {
    throw new Error(`${row.link_id} is not pending or held: ${row.approval_status}`);
  }
  if (!allText.includes(row.artifact_id)) {
    throw new Error(`${row.link_id} refers to undocumented artifact ${row.artifact_id}`);
  }
  if (!documents.get("utm-links.md").includes(row.utm_id)) {
    throw new Error(`${row.link_id} experiment ${row.utm_id} is absent from utm-links.md`);
  }
}

const brokenLinks = [];
for (const [name, text] of documents) {
  const markdownLink = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(markdownLink)) {
    const target = match[1].split("#")[0];
    if (!target.startsWith(".")) continue;
    try {
      await stat(resolve(kitDir, target));
    } catch {
      brokenLinks.push(`${name}: ${target}`);
    }
  }
}
if (brokenLinks.length > 0) {
  throw new Error(`Broken local links:\n${brokenLinks.join("\n")}`);
}

const provisionalFiles = [
  "README.md",
  "six-week-calendar.md",
  "hacker-news-draft.md",
  "email-drafts.md",
  "utm-links.md",
  "same-day-community-checklist.md",
  "approval-sheet.md",
];
for (const name of provisionalFiles) {
  if (!documents.get(name).includes("PROVISIONAL")) {
    throw new Error(`${name} must preserve the provisional identity warning`);
  }
}

if (/utm_(?:source|medium|campaign|content|id)=[^\s&}]*(?:email@|stripe|clerk|customer_id|user_id)/i.test(allText)) {
  throw new Error("A tracked-link value appears to contain personal or provider identity data.");
}

console.log(`launch-kit: pass (${files.length} Markdown files; ${rows.length} controlled UTM links)`);
