#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "artifact-dir": { type: "string" },
    "baseline-guide": { type: "string" },
    "candidate-guide": { type: "string" },
    "baseline-book-json": { type: "string" },
    "candidate-book-json": { type: "string" },
    "baseline-index-json": { type: "string" },
    "candidate-index-json": { type: "string" },
    patch: { type: "string" },
  },
  strict: true,
});

const requiredOptions = [
  "artifact-dir",
  "baseline-guide",
  "candidate-guide",
  "baseline-book-json",
  "candidate-book-json",
  "baseline-index-json",
  "candidate-index-json",
  "patch",
];
for (const key of requiredOptions) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

const fail = (message) => {
  throw new Error(message);
};
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const assertObject = (value, name) => {
  if (!isObject(value)) fail(`${name} must be an object`);
};
const assertKeys = (value, allowed, name) => {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) fail(`${name} has unknown keys: ${unknown.join(", ")}`);
};
const assertString = (value, name, { allowEmpty = false, max = 20_000 } = {}) => {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max) {
    fail(`${name} must be ${allowEmpty ? "a" : "a non-empty"} string no longer than ${max} characters`);
  }
};
const assertStringArray = (value, name, { allowEmpty = false } = {}) => {
  if (!Array.isArray(value) || (!allowEmpty && !value.length)) fail(`${name} must be a non-empty array`);
  if (value.some((item) => typeof item !== "string" || !item.trim())) fail(`${name} must contain strings`);
  if (new Set(value).size !== value.length) fail(`${name} contains duplicates`);
};
const collectStrings = (value, output = []) => {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (isObject(value)) Object.values(value).forEach((item) => collectStrings(item, output));
  return output;
};

async function readRegular(pathValue, name, maxBytes = 5_000_000) {
  const path = resolve(pathValue);
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`${name} must be a regular file`);
  if (metadata.size > maxBytes) fail(`${name} exceeds ${maxBytes} bytes`);
  return readFile(path, "utf8");
}

const artifactDir = resolve(values["artifact-dir"]);
const sourcesText = await readRegular(resolve(artifactDir, "sources.md"), "sources.md");
const sourcesJsonText = await readRegular(resolve(artifactDir, "sources.json"), "sources.json");
const blockedText = await readRegular(resolve(artifactDir, "blocked-sources.md"), "blocked-sources.md");
const changesText = await readRegular(resolve(artifactDir, "change-report.md"), "change-report.md");
const changesJsonText = await readRegular(resolve(artifactDir, "changes.json"), "changes.json");
const researchSummaryText = await readRegular(
  resolve(artifactDir, "research-agent-summary.md"),
  "research-agent-summary.md",
);

for (const [name, text] of [
  ["sources.md", sourcesText],
  ["blocked-sources.md", blockedText],
  ["change-report.md", changesText],
  ["research-agent-summary.md", researchSummaryText],
]) {
  if (!text.trim().startsWith("#")) fail(`${name} must begin with a Markdown heading`);
  if (text.includes("# Missing research artifact")) fail(`${name} is a generated missing-artifact placeholder`);
}

const sources = JSON.parse(sourcesJsonText);
const changes = JSON.parse(changesJsonText);
if (!Array.isArray(sources) || !sources.length) fail("sources.json must contain at least one consulted source");
if (!Array.isArray(changes)) fail("changes.json must be an array");

const sourceIds = new Set();
const sourceUrls = new Set();
const sourcesById = new Map();
const primarySourceTypes = new Set([
  "official_documentation",
  "official_release_notes",
  "official_deprecation_notice",
  "standard_or_specification",
  "original_research_paper",
  "authoritative_repository",
  "official_security_guidance",
  "official_engineering_post",
  "official_policy",
  "other_primary",
]);
const sourceKeys = [
  "source_id",
  "source_status",
  "title",
  "authority",
  "source_type",
  "url",
  "publication_date",
  "last_updated",
  "accessed_at",
  "access_status",
  "handbook_sections",
  "claim_evaluated",
  "conclusion",
  "notes",
];
for (const [sourceIndex, source] of sources.entries()) {
  const sourceName = `sources[${sourceIndex}]`;
  assertObject(source, sourceName);
  assertKeys(source, sourceKeys, sourceName);
  for (const key of ["source_id", "title", "authority", "source_type", "url", "publication_date", "last_updated", "accessed_at", "claim_evaluated"]) {
    assertString(source[key], `${sourceName}.${key}`, { max: key === "url" ? 2000 : 4000 });
  }
  if (!/^[A-Z][A-Z0-9]*-[0-9]{2,3}$/.test(source.source_id)) fail(`${sourceName}.source_id has an invalid format`);
  if (sourceIds.has(source.source_id)) fail(`Duplicate source_id: ${source.source_id}`);
  sourceIds.add(source.source_id);
  sourcesById.set(source.source_id, source);
  if (!new Set(["existing", "new"]).has(source.source_status)) fail(`${sourceName}.source_status is invalid`);
  if (!primarySourceTypes.has(source.source_type)) fail(`${sourceName}.source_type is not an allowed primary-source type`);
  if (source.source_type === "other_primary" && !source.notes?.trim()) {
    fail(`${sourceName}.notes must explain why an other_primary source is authoritative`);
  }
  const parsedUrl = new URL(source.url);
  if (parsedUrl.protocol !== "https:") fail(`${sourceName}.url must use HTTPS`);
  if (sourceUrls.has(source.url)) fail(`Duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  if (Number.isNaN(Date.parse(source.accessed_at))) fail(`${sourceName}.accessed_at must be an ISO-8601 timestamp`);
  if (!new Set(["accessible", "partially_accessible", "blocked"]).has(source.access_status)) {
    fail(`${sourceName}.access_status is invalid`);
  }
  assertStringArray(source.handbook_sections, `${sourceName}.handbook_sections`);
  if (!new Set(["supports_change", "supports_no_change", "conflicting", "insufficient"]).has(source.conclusion)) {
    fail(`${sourceName}.conclusion is invalid`);
  }
  if (source.notes !== undefined) assertString(source.notes, `${sourceName}.notes`, { allowEmpty: true, max: 4000 });
  if (!sourcesText.includes(source.source_id)) fail(`sources.md does not include ${source.source_id}`);
  if (source.access_status === "blocked" && !blockedText.includes(source.source_id)) {
    fail(`blocked-sources.md does not include blocked source ${source.source_id}`);
  }
}

const baselineBookJsonText = await readRegular(values["baseline-book-json"], "baseline book data");
const baselineIndexJsonText = await readRegular(values["baseline-index-json"], "baseline index data");
const candidateBookJsonText = await readRegular(values["candidate-book-json"], "candidate book data");
const candidateIndexJsonText = await readRegular(values["candidate-index-json"], "candidate index data");
const baselineCorpus = [
  await readRegular(values["baseline-guide"], "baseline guide"),
  ...collectStrings(JSON.parse(baselineBookJsonText)),
  ...collectStrings(JSON.parse(baselineIndexJsonText)),
].join("\n");
const candidateCorpus = [
  await readRegular(values["candidate-guide"], "candidate guide"),
  ...collectStrings(JSON.parse(candidateBookJsonText)),
  ...collectStrings(JSON.parse(candidateIndexJsonText)),
].join("\n");
const patchText = await readRegular(values.patch, "exact-changes.patch", 20_000_000);

const changeIds = new Set();
const classifications = new Set(["addition", "deprecation", "removal", "correction", "clarification"]);
for (const [changeIndex, change] of changes.entries()) {
  const changeName = `changes[${changeIndex}]`;
  assertObject(change, changeName);
  assertKeys(change, [
    "change_id",
    "classification",
    "section",
    "before_text",
    "after_text",
    "reason",
    "source_ids",
    "confidence",
    "consequence_accept",
    "consequence_reject",
  ], changeName);
  for (const key of ["change_id", "section", "before_text", "reason", "consequence_accept", "consequence_reject"]) {
    assertString(change[key], `${changeName}.${key}`);
  }
  assertString(change.after_text, `${changeName}.after_text`, {
    allowEmpty: change.classification === "removal",
  });
  if (!/^CHG-[0-9]{3}$/.test(change.change_id)) fail(`${changeName}.change_id has an invalid format`);
  if (changeIds.has(change.change_id)) fail(`Duplicate change_id: ${change.change_id}`);
  changeIds.add(change.change_id);
  if (!classifications.has(change.classification)) fail(`${changeName}.classification is invalid`);
  assertStringArray(change.source_ids, `${changeName}.source_ids`);
  if (!new Set(["high", "medium", "low"]).has(change.confidence)) fail(`${changeName}.confidence is invalid`);
  const supportingSources = change.source_ids.map((sourceId) => {
    if (!sourcesById.has(sourceId)) fail(`${changeName} references unknown source ${sourceId}`);
    return sourcesById.get(sourceId);
  });
  if (!supportingSources.some((source) => source.access_status === "accessible" && source.conclusion === "supports_change")) {
    fail(`${changeName} lacks an accessible source that supports the change`);
  }
  if (!baselineCorpus.includes(change.before_text)) fail(`${changeName}.before_text is not exact baseline text`);
  if (change.classification !== "removal" && !candidateCorpus.includes(change.after_text)) {
    fail(`${changeName}.after_text is not exact candidate text`);
  }
  if (!changesText.includes(change.change_id)) fail(`change-report.md does not include ${change.change_id}`);
}

const patchHasChanges = patchText.trim().length > 0;
if (changes.length === 0 && patchHasChanges) fail("exact-changes.patch is non-empty but changes.json has no changes");
if (changes.length > 0 && !patchHasChanges) fail("changes.json has changes but exact-changes.patch is empty");
let currentPatchFile = "";
for (const patchLine of patchText.split("\n")) {
  if (patchLine.startsWith("+++ ")) {
    currentPatchFile = patchLine.slice(4);
    continue;
  }
  if (!currentPatchFile.endsWith("AI_ENGINEERING_FIELD_GUIDE.md")) continue;
  if (!patchLine.startsWith("+") && !patchLine.startsWith("-")) continue;
  if (patchLine.startsWith("+++") || patchLine.startsWith("---")) continue;
  const changedText = patchLine.slice(1).trim();
  if (!changedText) continue;
  const field = patchLine.startsWith("+") ? "after_text" : "before_text";
  const covered = changes.some((change) =>
    change[field].includes(changedText) || changedText.includes(change[field]),
  );
  if (!covered) fail(`Unreported manuscript diff line: ${changedText.slice(0, 160)}`);
}
if (!/version bump/i.test(changesText)) fail("change-report.md is missing a release-version recommendation");

console.log(JSON.stringify({
  sources: sources.length,
  changes: changes.length,
  blockedSources: sources.filter((source) => source.access_status === "blocked").length,
  patchHasChanges,
}));
