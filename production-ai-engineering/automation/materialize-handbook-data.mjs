#!/usr/bin/env node

import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "book-json": { type: "string" },
    "index-json": { type: "string" },
    "book-output": { type: "string" },
    "index-output": { type: "string" },
  },
  strict: true,
});

for (const key of ["book-json", "index-json", "book-output", "index-output"]) {
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
const assertString = (value, name, max = 4000) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    fail(`${name} must be a non-empty string no longer than ${max} characters`);
  }
};
const assertStringArray = (value, name) => {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) {
    fail(`${name} must be an array of non-empty strings`);
  }
  if (new Set(value).size !== value.length) fail(`${name} contains duplicates`);
};

async function readJson(pathValue, name) {
  const path = resolve(pathValue);
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) fail(`${name} must be a regular file`);
  if (metadata.size > 2_000_000) fail(`${name} exceeds the 2 MB limit`);
  return JSON.parse(await readFile(path, "utf8"));
}

const book = await readJson(values["book-json"], "book-data.json");
const index = await readJson(values["index-json"], "index-data.json");

assertObject(book, "book-data.json");
assertKeys(book, ["version", "citationGroups", "sectionSources"], "book-data.json");
if (book.version !== 1) fail("book-data.json version must be 1");
if (!Array.isArray(book.citationGroups) || !book.citationGroups.length) {
  fail("citationGroups must be a non-empty array");
}

const labels = new Set();
const urls = new Set();
for (const [groupIndex, group] of book.citationGroups.entries()) {
  const groupName = `citationGroups[${groupIndex}]`;
  assertObject(group, groupName);
  assertKeys(group, ["title", "entries"], groupName);
  assertString(group.title, `${groupName}.title`, 200);
  if (!Array.isArray(group.entries) || !group.entries.length) fail(`${groupName}.entries must not be empty`);
  for (const [entryIndex, entry] of group.entries.entries()) {
    const entryName = `${groupName}.entries[${entryIndex}]`;
    assertObject(entry, entryName);
    assertKeys(entry, ["label", "citation", "url", "accessed"], entryName);
    assertString(entry.label, `${entryName}.label`, 32);
    if (!/^[A-Z][A-Z0-9]*-[0-9]{2,3}$/.test(entry.label)) fail(`${entryName}.label has an invalid format`);
    if (labels.has(entry.label)) fail(`Duplicate citation label: ${entry.label}`);
    labels.add(entry.label);
    assertString(entry.citation, `${entryName}.citation`);
    assertString(entry.url, `${entryName}.url`, 2000);
    const parsedUrl = new URL(entry.url);
    if (parsedUrl.protocol !== "https:") fail(`${entryName}.url must use HTTPS`);
    if (urls.has(entry.url)) fail(`Duplicate citation URL: ${entry.url}`);
    urls.add(entry.url);
    if (entry.accessed !== undefined && typeof entry.accessed !== "boolean") {
      fail(`${entryName}.accessed must be boolean when present`);
    }
  }
}

assertObject(book.sectionSources, "sectionSources");
const sectionKeys = Object.keys(book.sectionSources).sort((a, b) => Number(a) - Number(b));
const expectedSectionKeys = Array.from({ length: 25 }, (_, indexValue) => String(indexValue + 1));
if (JSON.stringify(sectionKeys) !== JSON.stringify(expectedSectionKeys)) {
  fail("sectionSources must contain every section from 1 through 25 exactly once");
}
const usedCitationLabels = new Set();
for (const sectionKey of sectionKeys) {
  const sourceMap = book.sectionSources[sectionKey];
  const sourceName = `sectionSources.${sectionKey}`;
  assertObject(sourceMap, sourceName);
  assertKeys(sourceMap, ["labels", "note"], sourceName);
  assertStringArray(sourceMap.labels, `${sourceName}.labels`);
  if (!sourceMap.labels.length) fail(`${sourceName}.labels must not be empty`);
  for (const label of sourceMap.labels) {
    if (!labels.has(label)) fail(`${sourceName} references unknown citation label ${label}`);
    usedCitationLabels.add(label);
  }
  if (sourceMap.note !== undefined) assertString(sourceMap.note, `${sourceName}.note`, 1000);
}
const unusedCitationLabels = [...labels].filter((label) => !usedCitationLabels.has(label));
if (unusedCitationLabels.length) fail(`Citations are not mapped to a section: ${unusedCitationLabels.join(", ")}`);

assertObject(index, "index-data.json");
assertKeys(index, ["version", "indexEntries"], "index-data.json");
if (index.version !== 1) fail("index-data.json version must be 1");
if (!Array.isArray(index.indexEntries) || !index.indexEntries.length) {
  fail("indexEntries must be a non-empty array");
}

const indexIds = new Set();
for (const [entryIndex, entry] of index.indexEntries.entries()) {
  const entryName = `indexEntries[${entryIndex}]`;
  assertObject(entry, entryName);
  assertKeys(entry, ["id", "label", "sections", "seeAlso", "see"], entryName);
  assertString(entry.id, `${entryName}.id`, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) fail(`${entryName}.id has an invalid format`);
  if (indexIds.has(entry.id)) fail(`Duplicate index id: ${entry.id}`);
  indexIds.add(entry.id);
  assertString(entry.label, `${entryName}.label`, 200);
  if (entry.sections !== undefined) {
    if (!Array.isArray(entry.sections) || !entry.sections.length) fail(`${entryName}.sections must not be empty`);
    if (entry.sections.some((section) => !Number.isInteger(section) || section < 1 || section > 25)) {
      fail(`${entryName}.sections contains an invalid section`);
    }
    if (new Set(entry.sections).size !== entry.sections.length) fail(`${entryName}.sections contains duplicates`);
  }
  if (entry.seeAlso !== undefined) assertStringArray(entry.seeAlso, `${entryName}.seeAlso`);
  if (entry.see !== undefined) assertString(entry.see, `${entryName}.see`, 100);
  if (entry.sections === undefined && entry.see === undefined) {
    fail(`${entryName} must contain sections or see`);
  }
}
for (const [entryIndex, entry] of index.indexEntries.entries()) {
  for (const referencedId of [...(entry.seeAlso ?? []), ...(entry.see ? [entry.see] : [])]) {
    if (!indexIds.has(referencedId)) fail(`indexEntries[${entryIndex}] references unknown id ${referencedId}`);
    if (referencedId === entry.id) fail(`indexEntries[${entryIndex}] references itself`);
  }
}

const serialize = (value) => JSON.stringify(value, null, 2)
  .replaceAll("\u2028", "\\u2028")
  .replaceAll("\u2029", "\\u2029");
const bookOutput = resolve(values["book-output"]);
const indexOutput = resolve(values["index-output"]);
await mkdir(dirname(bookOutput), { recursive: true });
await mkdir(dirname(indexOutput), { recursive: true });

await writeFile(
  bookOutput,
  `export const CITATION_GROUPS = ${serialize(book.citationGroups)};\n\n`
    + `export const SECTION_SOURCES = ${serialize(book.sectionSources)};\n\n`
    + "export const citationEntries = CITATION_GROUPS.flatMap(({ entries }) => entries);\n"
    + "export const citationByUrl = new Map(citationEntries.map((entry) => [entry.url, entry]));\n"
    + "export const citationByLabel = new Map(citationEntries.map((entry) => [entry.label, entry]));\n",
  { encoding: "utf8", mode: 0o600 },
);
await writeFile(
  indexOutput,
  `export const INDEX_ENTRIES = ${serialize(index.indexEntries)};\n`,
  { encoding: "utf8", mode: 0o600 },
);

console.log(JSON.stringify({
  citations: labels.size,
  sections: sectionKeys.length,
  indexEntries: index.indexEntries.length,
}));
