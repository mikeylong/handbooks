#!/usr/bin/env node

import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged.";

const { values } = parseArgs({
  options: {
    baseline: { type: "string" },
    "baseline-source": { type: "string" },
    changes: { type: "string" },
    patch: { type: "string" },
    source: { type: "string" },
    "production-hash": { type: "string" },
    "entry-date": { type: "string" },
    output: { type: "string" },
  },
  strict: true,
});

for (const key of ["baseline", "baseline-source", "changes", "patch", "source", "production-hash", "entry-date", "output"]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

async function readRegular(pathValue, name, maxBytes = 20_000_000) {
  const path = resolve(pathValue);
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > maxBytes) {
    throw new Error(`${name} must be a regular file no larger than ${maxBytes} bytes`);
  }
  return readFile(path, "utf8");
}

const baseline = JSON.parse(await readRegular(values.baseline, "baseline changelog"));
const baselineSourceText = await readRegular(values["baseline-source"], "baseline source");
const changes = JSON.parse(await readRegular(values.changes, "changes.json"));
const patchText = await readRegular(values.patch, "exact-changes.patch");
const sourceText = await readRegular(values.source, "candidate source");
const productionHashText = await readRegular(values["production-hash"], "production PDF hash");

if (!Array.isArray(changes)) throw new Error("changes.json must be an array");
const patchHasChanges = patchText.trim().length > 0;
if ((changes.length > 0) !== patchHasChanges) {
  throw new Error("changes.json and exact-changes.patch disagree about whether reader-facing content changed");
}

const productionPdfSha256 = productionHashText.match(/^[a-f0-9]{64}\b/)?.[0];
if (!productionPdfSha256) throw new Error("Could not parse the production PDF SHA-256");
if (baseline.previousPdfSha256 !== productionPdfSha256) {
  throw new Error("The baseline changelog does not match the current production PDF");
}
const baselineSourceSha256 = createHash("sha256").update(baselineSourceText).digest("hex");
if (baseline.currentSourceSha256 !== baselineSourceSha256) {
  throw new Error("The baseline changelog does not match the pristine canonical source");
}

const entryDate = new Date(`${values["entry-date"]}T12:00:00Z`);
if (Number.isNaN(entryDate.valueOf())) throw new Error("--entry-date must be YYYY-MM-DD");
const entryDateLabel = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
}).format(entryDate);

const classificationGroups = [
  { category: "Additions", values: new Set(["addition"]) },
  { category: "Deprecations and removals", values: new Set(["deprecation", "removal"]) },
  { category: "Corrections and clarifications", values: new Set(["correction", "clarification"]) },
];
const allowedClassifications = new Set(classificationGroups.flatMap(({ values: groupValues }) => [...groupValues]));
for (const [index, change] of changes.entries()) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new Error(`changes[${index}] must be an object`);
  }
  if (!/^CHG-[0-9]{3}$/.test(change.change_id ?? "")) {
    throw new Error(`changes[${index}].change_id is invalid`);
  }
  if (!allowedClassifications.has(change.classification)) {
    throw new Error(`changes[${index}].classification is invalid`);
  }
  if (typeof change.section !== "string" || !change.section.trim()) {
    throw new Error(`changes[${index}].section is required`);
  }
}

const concise = (value, max = 40) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1).trimEnd()}…`;
};
const sectionReference = (section) => {
  const normalized = section.replace(/\s+/g, " ").trim();
  const withoutNumber = normalized.replace(/^\d+(?:\.\d+)?\.?\s*/, "");
  if (/metadata/i.test(normalized)) return "handbook metadata";
  if (/index/i.test(normalized)) return "the index";
  if (/appendix|citation|source trail/i.test(normalized)) return "appendix and source trails";
  return concise(withoutNumber || normalized);
};
const items = classificationGroups.flatMap(({ category, values: groupValues }) => {
  const matching = changes.filter(({ classification }) => groupValues.has(classification));
  if (!matching.length) return [];
  const sections = [...new Set(matching.map(({ section }) => sectionReference(section)))];
  const shownSections = sections.slice(0, 6).join(", ");
  const remaining = sections.length > 6 ? `, and ${sections.length - 6} more area${sections.length - 6 === 1 ? "" : "s"}` : "";
  const prefix = category === "Additions"
    ? "Added or expanded guidance in"
    : category === "Deprecations and removals"
      ? "Deprecated or removed guidance in"
      : "Corrected or clarified guidance in";
  return [{
    category,
    text: `${prefix} ${shownSections}${remaining}. Exact wording and primary-source evidence are in the candidate change report.`,
  }];
});

const countLabel = (count, singular) => `${count} ${singular}${count === 1 ? "" : "s"}`;
const counts = {
  additions: changes.filter(({ classification }) => classification === "addition").length,
  deprecations: changes.filter(({ classification }) => classification === "deprecation").length,
  removals: changes.filter(({ classification }) => classification === "removal").length,
  corrections: changes.filter(({ classification }) => classification === "correction").length,
  clarifications: changes.filter(({ classification }) => classification === "clarification").length,
};
const summaryParts = [
  counts.additions ? countLabel(counts.additions, "addition") : "",
  counts.deprecations ? countLabel(counts.deprecations, "deprecation") : "",
  counts.removals ? countLabel(counts.removals, "removal") : "",
  counts.corrections ? countLabel(counts.corrections, "correction") : "",
  counts.clarifications ? countLabel(counts.clarifications, "clarification") : "",
].filter(Boolean);

const output = {
  schemaVersion: 1,
  entryDate: entryDateLabel,
  previousVersion: baseline.previousVersion,
  previousPublicationDate: baseline.previousPublicationDate,
  previousPdfSha256: productionPdfSha256,
  currentSourceSha256: createHash("sha256").update(sourceText).digest("hex"),
  summary: changes.length
    ? `This candidate proposes ${changes.length} reader-facing update${changes.length === 1 ? "" : "s"}: ${summaryParts.join(", ")}.`
    : UNCHANGED_SUMMARY,
  items,
};

await writeFile(resolve(values.output), `${JSON.stringify(output, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});

console.log(JSON.stringify({
  changes: changes.length,
  changelog_included: changes.length > 0,
  items: items.length,
  summary: output.summary,
}));
