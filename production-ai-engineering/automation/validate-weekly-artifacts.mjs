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
    "run-start": { type: "string" },
    "run-date": { type: "string" },
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
  "run-start",
  "run-date",
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
const coverageJsonText = await readRegular(resolve(artifactDir, "coverage.json"), "coverage.json");
const releaseJsonText = await readRegular(
  resolve(artifactDir, "release-recommendation.json"),
  "release-recommendation.json",
);
const researchSummaryText = await readRegular(
  resolve(artifactDir, "research-agent-summary.md"),
  "research-agent-summary.md",
);

for (const [name, text] of [
  ["sources.md", sourcesText],
  ["blocked-sources.md", blockedText],
  ["change-report.md", changesText],
]) {
  if (!text.trim().startsWith("#")) fail(`${name} must begin with a Markdown heading`);
  if (text.includes("# Missing research artifact")) fail(`${name} is a generated missing-artifact placeholder`);
}
if (!researchSummaryText.trim() || researchSummaryText.includes("# Missing research artifact")) {
  fail("research-agent-summary.md must be non-empty and must not be a generated placeholder");
}

const sources = JSON.parse(sourcesJsonText);
const changes = JSON.parse(changesJsonText);
const coverage = JSON.parse(coverageJsonText);
const releaseRecommendation = JSON.parse(releaseJsonText);
if (!Array.isArray(sources) || !sources.length) fail("sources.json must contain at least one consulted source");
if (!Array.isArray(changes)) fail("changes.json must be an array");
if (!Array.isArray(coverage)) fail("coverage.json must be an array");

const runStart = Date.parse(values["run-start"]);
if (Number.isNaN(runStart)) fail("--run-start must be an ISO-8601 timestamp");
const runDate = values["run-date"];
const parsedRunDate = new Date(`${runDate}T00:00:00Z`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)
  || Number.isNaN(parsedRunDate.getTime())
  || parsedRunDate.toISOString().slice(0, 10) !== runDate) {
  fail("--run-date must be a valid YYYY-MM-DD calendar date");
}
const earliestAccess = runStart - 10 * 60 * 1000;
const latestAccess = Date.now() + 10 * 60 * 1000;

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
  "evidence_locator",
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
  for (const key of ["source_id", "title", "authority", "source_type", "url", "evidence_locator", "publication_date", "last_updated", "accessed_at", "claim_evaluated"]) {
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
  const accessedAt = Date.parse(source.accessed_at);
  if (Number.isNaN(accessedAt)) fail(`${sourceName}.accessed_at must be an ISO-8601 timestamp`);
  if (accessedAt < earliestAccess || accessedAt > latestAccess) {
    fail(`${sourceName}.accessed_at is outside the current research run window`);
  }
  if (!new Set(["accessible", "partially_accessible", "blocked"]).has(source.access_status)) {
    fail(`${sourceName}.access_status is invalid`);
  }
  assertStringArray(source.handbook_sections, `${sourceName}.handbook_sections`);
  if (!new Set(["supports_change", "supports_no_change", "conflicting", "insufficient"]).has(source.conclusion)) {
    fail(`${sourceName}.conclusion is invalid`);
  }
  if (source.notes !== undefined) assertString(source.notes, `${sourceName}.notes`, { allowEmpty: true, max: 4000 });
  if (source.access_status !== "accessible") {
    assertString(source.notes, `${sourceName}.notes`, { max: 4000 });
    if (source.conclusion === "supports_change") {
      fail(`${sourceName} cannot support a change because it is not fully accessible`);
    }
  }
  if (source.access_status === "blocked" && source.conclusion !== "insufficient") {
    fail(`${sourceName} must be classified as insufficient when access is blocked`);
  }
  if (!sourcesText.includes(source.source_id)) fail(`sources.md does not include ${source.source_id}`);
  if (source.access_status !== "accessible" && !blockedText.includes(source.source_id)) {
    fail(`blocked-sources.md does not include limited source ${source.source_id}`);
  }
}

const requiredCoverageAreas = [
  "model_api_lifecycle",
  "serving_inference_runtime",
  "context_caching_retrieval",
  "structured_output_tools_agents",
  "evaluation_observability_cost_reliability",
  "safety_security_privacy",
  "original_research",
];
if (coverage.length !== requiredCoverageAreas.length) {
  fail(`coverage.json must contain exactly ${requiredCoverageAreas.length} research areas`);
}
const seenCoverageAreas = new Set();
for (const [coverageIndex, area] of coverage.entries()) {
  const areaName = `coverage[${coverageIndex}]`;
  assertObject(area, areaName);
  assertKeys(area, ["area_id", "status", "source_ids", "conclusion", "notes"], areaName);
  assertString(area.area_id, `${areaName}.area_id`);
  assertStringArray(area.source_ids, `${areaName}.source_ids`);
  assertString(area.notes, `${areaName}.notes`, { allowEmpty: area.status === "checked", max: 4000 });
  if (!requiredCoverageAreas.includes(area.area_id)) fail(`${areaName}.area_id is invalid`);
  if (seenCoverageAreas.has(area.area_id)) fail(`Duplicate coverage area: ${area.area_id}`);
  seenCoverageAreas.add(area.area_id);
  if (!new Set(["checked", "limited"]).has(area.status)) fail(`${areaName}.status is invalid`);
  if (!new Set(["change_warranted", "no_change_warranted", "insufficient_evidence"]).has(area.conclusion)) {
    fail(`${areaName}.conclusion is invalid`);
  }
  const areaSources = area.source_ids.map((sourceId) => {
    if (!sourcesById.has(sourceId)) fail(`${areaName} references unknown source ${sourceId}`);
    return sourcesById.get(sourceId);
  });
  if (area.status === "checked" && !areaSources.some((source) => source.access_status === "accessible")) {
    fail(`${areaName} needs at least one accessible primary source`);
  }
  if (area.area_id === "original_research"
    && !areaSources.some((source) => source.access_status === "accessible"
      && source.source_type === "original_research_paper")) {
    fail(`${areaName} needs at least one accessible original research paper`);
  }
  if (area.status === "limited" && area.conclusion !== "insufficient_evidence") {
    fail(`${areaName} must use insufficient_evidence when status is limited`);
  }
}
for (const areaId of requiredCoverageAreas) {
  if (!seenCoverageAreas.has(areaId)) fail(`Missing research coverage area: ${areaId}`);
}

const baselineBookJsonText = await readRegular(values["baseline-book-json"], "baseline book data");
const baselineIndexJsonText = await readRegular(values["baseline-index-json"], "baseline index data");
const candidateBookJsonText = await readRegular(values["candidate-book-json"], "candidate book data");
const candidateIndexJsonText = await readRegular(values["candidate-index-json"], "candidate index data");
const baselineBook = JSON.parse(baselineBookJsonText);
const baselineIndex = JSON.parse(baselineIndexJsonText);
const candidateBook = JSON.parse(candidateBookJsonText);
const candidateIndex = JSON.parse(candidateIndexJsonText);
const baselineGuideText = await readRegular(values["baseline-guide"], "baseline guide");
const candidateGuideText = await readRegular(values["candidate-guide"], "candidate guide");
const baselineCorpus = [
  baselineGuideText,
  ...collectStrings(baselineBook),
  ...collectStrings(baselineIndex),
].join("\n");
const candidateCorpus = [
  candidateGuideText,
  ...collectStrings(candidateBook),
  ...collectStrings(candidateIndex),
].join("\n");
const patchText = await readRegular(values.patch, "exact-changes.patch", 20_000_000);

assertObject(releaseRecommendation, "release-recommendation.json");
assertKeys(releaseRecommendation, ["version", "recommended_bump", "reason"], "release-recommendation.json");
if (releaseRecommendation.version !== 1) fail("release-recommendation.json version must be 1");
if (!new Set(["none", "patch", "minor", "major"]).has(releaseRecommendation.recommended_bump)) {
  fail("release-recommendation.json recommended_bump is invalid");
}
assertString(releaseRecommendation.reason, "release-recommendation.json.reason", { max: 4000 });
if (changes.length === 0 && releaseRecommendation.recommended_bump !== "none") {
  fail("A no-change candidate must recommend version bump none");
}
if (changes.length > 0 && releaseRecommendation.recommended_bump === "none") {
  fail("A changed candidate must recommend patch, minor, or major");
}
const candidateEvidenceReviewDate = candidateGuideText.match(
  /Last evidence review:\s*\*\*([^*]+)\*\*/,
)?.[1];
if (changes.length > 0 && candidateEvidenceReviewDate !== runDate) {
  fail(`A changed candidate must set Last evidence review to the run date ${runDate}`);
}
if (!changesText.toLowerCase().includes(releaseRecommendation.recommended_bump)) {
  fail("change-report.md does not include the structured release recommendation");
}

const changeIds = new Set();
const acceptedSourceIds = new Set();
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
    "reader_title",
    "reader_what_changed",
    "reader_why",
  ], changeName);
  for (const key of [
    "change_id",
    "section",
    "before_text",
    "reason",
    "consequence_accept",
    "consequence_reject",
    "reader_title",
    "reader_what_changed",
    "reader_why",
  ]) {
    assertString(change[key], `${changeName}.${key}`);
  }
  for (const key of ["reader_title", "reader_what_changed", "reader_why"]) {
    if (/https?:\/\//i.test(change[key])) {
      fail(`${changeName}.${key} must not contain URLs; use source_ids`);
    }
  }
  assertString(change.after_text, `${changeName}.after_text`, {
    allowEmpty: change.classification === "removal",
  });
  if (!/^CHG-[0-9]{3}$/.test(change.change_id)) fail(`${changeName}.change_id has an invalid format`);
  if (changeIds.has(change.change_id)) fail(`Duplicate change_id: ${change.change_id}`);
  changeIds.add(change.change_id);
  if (!classifications.has(change.classification)) fail(`${changeName}.classification is invalid`);
  if (change.before_text === change.after_text) {
    fail(`${changeName} must describe an actual before-and-after difference`);
  }
  if (change.classification === "removal" && change.after_text !== "") {
    fail(`${changeName}.after_text must be empty for a removal`);
  }
  assertStringArray(change.source_ids, `${changeName}.source_ids`);
  if (!new Set(["high", "medium", "low"]).has(change.confidence)) fail(`${changeName}.confidence is invalid`);
  const supportingSources = change.source_ids.map((sourceId) => {
    if (!sourcesById.has(sourceId)) fail(`${changeName} references unknown source ${sourceId}`);
    acceptedSourceIds.add(sourceId);
    return sourcesById.get(sourceId);
  });
  if (supportingSources.some((source) => source.access_status !== "accessible" || source.conclusion !== "supports_change")) {
    fail(`${changeName} may reference only accessible sources classified as supports_change`);
  }
  if (!baselineCorpus.includes(change.before_text)) fail(`${changeName}.before_text is not exact baseline text`);
  if (change.classification !== "removal" && !candidateCorpus.includes(change.after_text)) {
    fail(`${changeName}.after_text is not exact candidate text`);
  }
  if (change.classification === "removal" && candidateCorpus.includes(change.before_text)) {
    fail(`${changeName}.before_text is still present in the candidate corpus`);
  }
  if (!changesText.includes(change.change_id)) fail(`change-report.md does not include ${change.change_id}`);
  if (!changesText.includes(change.reader_title)) {
    fail(`change-report.md does not include the reader-facing title for ${change.change_id}`);
  }
}

const patchHasChanges = patchText.trim().length > 0;
if (changes.length === 0 && patchHasChanges) fail("exact-changes.patch is non-empty but changes.json has no changes");
if (changes.length > 0 && !patchHasChanges) fail("changes.json has changes but exact-changes.patch is empty");

const citationEntries = (book) => (book.citationGroups ?? []).flatMap(({ entries = [] }) => entries);
const baselineCitationsByUrl = new Map(citationEntries(baselineBook).map((entry) => [entry.url, entry]));
const candidateCitationsByUrl = new Map(citationEntries(candidateBook).map((entry) => [entry.url, entry]));
const candidateCitationsByLabel = new Map(citationEntries(candidateBook).map((entry) => [entry.label, entry]));
const candidateMappedLabels = new Set(
  Object.values(candidateBook.sectionSources ?? {}).flatMap(({ labels = [] }) => labels),
);
for (const sourceId of acceptedSourceIds) {
  const source = sourcesById.get(sourceId);
  const citation = candidateCitationsByLabel.get(sourceId);
  if (!citation || citation.url !== source.url) {
    fail(`Accepted source ${sourceId} is missing from the candidate appendix with the same label and URL`);
  }
  if (!candidateMappedLabels.has(sourceId)) {
    fail(`Accepted source ${sourceId} is not mapped to a candidate handbook section`);
  }
}

const changeBeforeCorpus = changes.map((change) => `${change.before_text}\n${change.reason}\n${change.section}`).join("\n");
const changeAfterCorpus = changes.map((change) => `${change.after_text}\n${change.reason}\n${change.section}`).join("\n");
for (const [url, entry] of candidateCitationsByUrl) {
  const baselineEntry = baselineCitationsByUrl.get(url);
  if (!baselineEntry) {
    const source = sources.find((candidateSource) => candidateSource.url === url);
    if (!source || source.access_status !== "accessible" || source.conclusion !== "supports_change") {
      fail(`New citation URL is not backed by an accessible supports_change source: ${url}`);
    }
    if (!acceptedSourceIds.has(source.source_id)) {
      fail(`New citation URL is not linked to an accepted change: ${url}`);
    }
  } else if (JSON.stringify(baselineEntry) !== JSON.stringify(entry)
    && !changeBeforeCorpus.includes(url)
    && !changeAfterCorpus.includes(url)
    && !acceptedSourceIds.has(entry.label)) {
    fail(`Modified citation metadata is not linked to a change: ${url}`);
  }
}
for (const [url, entry] of baselineCitationsByUrl) {
  if (candidateCitationsByUrl.has(url)) continue;
  if (!changeBeforeCorpus.includes(url) && !changeBeforeCorpus.includes(entry.label)) {
    fail(`Removed citation is not represented by an exact change record: ${url}`);
  }
}

const sectionKeys = new Set([
  ...Object.keys(baselineBook.sectionSources ?? {}),
  ...Object.keys(candidateBook.sectionSources ?? {}),
]);
for (const sectionKey of sectionKeys) {
  const baselineLabels = new Set(baselineBook.sectionSources?.[sectionKey]?.labels ?? []);
  const candidateLabels = new Set(candidateBook.sectionSources?.[sectionKey]?.labels ?? []);
  for (const label of candidateLabels) {
    if (baselineLabels.has(label)) continue;
    if (!acceptedSourceIds.has(label) && !changeAfterCorpus.includes(label)) {
      fail(`Added section-source mapping is not linked to an accepted change: section ${sectionKey}, ${label}`);
    }
  }
  for (const label of baselineLabels) {
    if (candidateLabels.has(label)) continue;
    const baselineCitation = citationEntries(baselineBook).find((entry) => entry.label === label);
    if (!changeBeforeCorpus.includes(label) && !changeBeforeCorpus.includes(baselineCitation?.url ?? "__missing__")) {
      fail(`Removed section-source mapping is not represented by a change: section ${sectionKey}, ${label}`);
    }
  }
}

const indexEntriesById = (index) => new Map((index.indexEntries ?? []).map((entry) => [entry.id, entry]));
const baselineIndexById = indexEntriesById(baselineIndex);
const candidateIndexById = indexEntriesById(candidateIndex);
for (const [id, entry] of candidateIndexById) {
  const baselineEntry = baselineIndexById.get(id);
  if (!baselineEntry || JSON.stringify(baselineEntry) !== JSON.stringify(entry)) {
    if (!changeAfterCorpus.toLowerCase().includes(id.toLowerCase())
      && !changeAfterCorpus.toLowerCase().includes(String(entry.label ?? "").toLowerCase())) {
      fail(`Added or modified index entry is not linked to a change: ${id}`);
    }
  }
}
for (const [id, entry] of baselineIndexById) {
  if (candidateIndexById.has(id)) continue;
  if (!changeBeforeCorpus.toLowerCase().includes(id.toLowerCase())
    && !changeBeforeCorpus.toLowerCase().includes(String(entry.label ?? "").toLowerCase())) {
    fail(`Removed index entry is not linked to a change: ${id}`);
  }
}

let currentPatchFile = "";
const removedPatchLines = [];
const addedPatchLines = [];
for (const patchLine of patchText.split("\n")) {
  if (patchLine.startsWith("+++ ")) {
    currentPatchFile = patchLine.slice(4);
    continue;
  }
  if (!patchLine.startsWith("+") && !patchLine.startsWith("-")) continue;
  if (patchLine.startsWith("+++") || patchLine.startsWith("---")) continue;
  const changedText = patchLine.slice(1).trim();
  if (!changedText) continue;
  if (patchLine.startsWith("+")) addedPatchLines.push(changedText);
  else removedPatchLines.push(changedText);
  if (!currentPatchFile.endsWith("AI_ENGINEERING_FIELD_GUIDE.md")) continue;
  const field = patchLine.startsWith("+") ? "after_text" : "before_text";
  const covered = changes.some((change) =>
    change[field].includes(changedText) || changedText.includes(change[field]),
  );
  if (!covered) fail(`Unreported manuscript diff line: ${changedText.slice(0, 160)}`);
}
const hasChangedLine = (text, lines) => lines.some((line) =>
  line.length >= 4 && (text.includes(line) || line.includes(text.trim())),
);
for (const change of changes) {
  const hasBeforeDiff = hasChangedLine(change.before_text, removedPatchLines);
  const hasAfterDiff = change.after_text ? hasChangedLine(change.after_text, addedPatchLines) : false;
  if (change.classification === "addition" && !hasAfterDiff) {
    fail(`${change.change_id} does not map to an added diff line`);
  }
  if (change.classification === "removal" && !hasBeforeDiff) {
    fail(`${change.change_id} does not map to a removed diff line`);
  }
  if (!new Set(["addition", "removal"]).has(change.classification) && (!hasBeforeDiff || !hasAfterDiff)) {
    fail(`${change.change_id} does not map bidirectionally to removed and added diff lines`);
  }
}
if (!/version bump/i.test(changesText)) fail("change-report.md is missing a release-version recommendation");

console.log(JSON.stringify({
  sources: sources.length,
  changes: changes.length,
  blockedSources: sources.filter((source) => source.access_status === "blocked").length,
  coverageAreas: coverage.length,
  patchHasChanges,
  recommendedBump: releaseRecommendation.recommended_bump,
}));
