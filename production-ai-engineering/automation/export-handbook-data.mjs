#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    "book-data": { type: "string" },
    "index-data": { type: "string" },
    "output-dir": { type: "string" },
  },
  strict: true,
});

for (const key of ["book-data", "index-data", "output-dir"]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

const bookModule = await import(pathToFileURL(resolve(values["book-data"])).href);
const indexModule = await import(pathToFileURL(resolve(values["index-data"])).href);
const outputDir = resolve(values["output-dir"]);

await mkdir(outputDir, { recursive: true });
await writeFile(
  resolve(outputDir, "book-data.json"),
  `${JSON.stringify({
    version: 1,
    citationGroups: bookModule.CITATION_GROUPS,
    sectionSources: bookModule.SECTION_SOURCES,
  }, null, 2)}\n`,
  { encoding: "utf8", mode: 0o600 },
);
await writeFile(
  resolve(outputDir, "index-data.json"),
  `${JSON.stringify({
    version: 1,
    indexEntries: indexModule.INDEX_ENTRIES,
  }, null, 2)}\n`,
  { encoding: "utf8", mode: 0o600 },
);

console.log(`Exported handbook data to ${outputDir}`);
