#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    "expected-codex-home": { type: "string" },
    "expected-sqlite-home": { type: "string" },
  },
  strict: true,
});

for (const key of ["file", "expected-codex-home", "expected-sqlite-home"]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

const reportPath = resolve(values.file);
const metadata = await lstat(reportPath);
if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 1_000_000) {
  throw new Error("Codex doctor report must be a regular JSON file smaller than 1 MB");
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
const expectedCodexHome = resolve(values["expected-codex-home"]);
const expectedSqliteHome = resolve(values["expected-sqlite-home"]);

const requireHealthyCheck = (id) => {
  const check = report.checks?.[id];
  if (!check || check.status !== "ok") {
    throw new Error(`Codex doctor check ${id} did not pass`);
  }
  return check;
};

const auth = requireHealthyCheck("auth.credentials");
const config = requireHealthyCheck("config.load");
const state = requireHealthyCheck("state.paths");

if (resolve(config.details?.CODEX_HOME ?? "") !== expectedCodexHome) {
  throw new Error("Codex doctor resolved an unexpected CODEX_HOME");
}
if (resolve(config.details?.["sqlite home"] ?? "") !== expectedSqliteHome) {
  throw new Error("Codex doctor did not resolve the configured SQLite home");
}

const authFile = resolve(auth.details?.["auth file"] ?? "");
if (authFile !== resolve(expectedCodexHome, "auth.json")) {
  throw new Error("Codex authentication did not remain in the canonical CODEX_HOME");
}

const stateSqliteHome = String(state.details?.["sqlite home"] ?? "").replace(/ \(dir\)$/, "");
if (resolve(stateSqliteHome) !== expectedSqliteHome) {
  throw new Error("Codex state databases are not routed to the expected SQLite home");
}

console.log(JSON.stringify({
  auth: "ok",
  codex_home: expectedCodexHome,
  sqlite_home: expectedSqliteHome,
  state: "ok",
}));
