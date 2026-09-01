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
    sources: { type: "string" },
    patch: { type: "string" },
    source: { type: "string" },
    "production-hash": { type: "string" },
    "entry-date": { type: "string" },
    output: { type: "string" },
  },
  strict: true,
});

for (const key of ["baseline", "baseline-source", "changes", "sources", "patch", "source", "production-hash", "entry-date", "output"]) {
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
const sources = JSON.parse(await readRegular(values.sources, "sources.json"));
const patchText = await readRegular(values.patch, "exact-changes.patch");
const sourceText = await readRegular(values.source, "candidate source");
const productionHashText = await readRegular(values["production-hash"], "production PDF hash");

if (!Array.isArray(changes)) throw new Error("changes.json must be an array");
if (!Array.isArray(sources)) throw new Error("sources.json must be an array");
if (changes.length > 32) throw new Error("changes.json cannot contain more than 32 reader-facing changes");
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

const classificationLabels = new Map([
  ["addition", "Addition"],
  ["deprecation", "Deprecation"],
  ["removal", "Removal"],
  ["correction", "Correction"],
  ["clarification", "Clarification"],
]);
const sourcesById = new Map();
for (const [index, source] of sources.entries()) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`sources[${index}] must be an object`);
  }
  if (!/^[A-Z][A-Z0-9]*-[0-9]{2,3}$/.test(source.source_id ?? "")) {
    throw new Error(`sources[${index}].source_id is invalid`);
  }
  if (sourcesById.has(source.source_id)) {
    throw new Error(`sources.json contains duplicate source_id ${source.source_id}`);
  }
  for (const key of ["title", "authority", "url", "publication_date"]) {
    if (typeof source[key] !== "string" || !source[key].trim()) {
      throw new Error(`sources[${index}].${key} is required`);
    }
  }
  const sourceUrl = new URL(source.url);
  if (sourceUrl.protocol !== "https:") {
    throw new Error(`sources[${index}].url must use HTTPS`);
  }
  sourcesById.set(source.source_id, source);
}

for (const [index, change] of changes.entries()) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new Error(`changes[${index}] must be an object`);
  }
  if (!/^CHG-[0-9]{3}$/.test(change.change_id ?? "")) {
    throw new Error(`changes[${index}].change_id is invalid`);
  }
  if (!classificationLabels.has(change.classification)) {
    throw new Error(`changes[${index}].classification is invalid`);
  }
  if (typeof change.section !== "string" || !change.section.trim()) {
    throw new Error(`changes[${index}].section is required`);
  }
  for (const key of ["reader_title", "reader_what_changed", "reader_why"]) {
    if (typeof change[key] !== "string" || !change[key].trim()) {
      throw new Error(`changes[${index}].${key} is required`);
    }
    if (/https?:\/\//i.test(change[key])) {
      throw new Error(`changes[${index}].${key} must not contain URLs; use source_ids`);
    }
  }
  if (!Array.isArray(change.source_ids) || !change.source_ids.length) {
    throw new Error(`changes[${index}].source_ids must be a non-empty array`);
  }
  for (const sourceId of change.source_ids) {
    const source = sourcesById.get(sourceId);
    if (!source) throw new Error(`changes[${index}] references unknown source ${sourceId}`);
    if (source.access_status !== "accessible" || source.conclusion !== "supports_change") {
      throw new Error(`changes[${index}] source ${sourceId} cannot support a reader-facing change`);
    }
  }
}
const orderedChanges = [...changes].sort((left, right) => {
  const leftIsMetadata = /(^|\b)metadata(\b|$)/i.test(left.section) ? 1 : 0;
  const rightIsMetadata = /(^|\b)metadata(\b|$)/i.test(right.section) ? 1 : 0;
  return leftIsMetadata - rightIsMetadata;
});

const items = orderedChanges.map((change) => ({
  changeId: change.change_id,
  classification: change.classification,
  classificationLabel: classificationLabels.get(change.classification),
  section: change.section,
  title: change.reader_title,
  whatChanged: change.reader_what_changed,
  why: change.reader_why,
  sources: change.source_ids.map((sourceId) => {
    const source = sourcesById.get(sourceId);
    return {
      sourceId,
      title: source.title,
      authority: source.authority,
      publicationDate: source.publication_date,
      url: source.url,
    };
  }),
}));

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
  schemaVersion: 2,
  entryDate: entryDateLabel,
  previousVersion: baseline.previousVersion,
  previousPublicationDate: baseline.previousPublicationDate,
  previousPdfSha256: productionPdfSha256,
  currentSourceSha256: createHash("sha256").update(sourceText).digest("hex"),
  summary: changes.length
    ? `This edition makes ${changes.length} reader-facing change${changes.length === 1 ? "" : "s"}: ${summaryParts.join(", ")}.${counts.removals ? "" : " No guidance was removed."}`
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
