#!/usr/bin/env node

// Validate current generation without rewriting the frozen publication package.
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const book = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryBook = await mkdtemp(resolve(tmpdir(), "production-ai-html-validation-"));
try {
  for (const path of ["handbook", "AI_ENGINEERING_FIELD_GUIDE.md", "publication.json"]) {
    await cp(resolve(book, path), resolve(temporaryBook, path), { recursive: true });
  }
  const { pdfPath } = JSON.parse(await readFile(resolve(book, "reader-edition.json"), "utf8"));
  await mkdir(dirname(resolve(temporaryBook, pdfPath)), { recursive: true });
  await cp(resolve(book, pdfPath), resolve(temporaryBook, pdfPath));
  const env = {
    ...process.env,
    HANDBOOK_PUBLISHING_TOOLKIT: process.env.HANDBOOK_PUBLISHING_TOOLKIT ?? resolve(book, "../publish-evidence-backed-handbook"),
    HANDBOOK_AUTOMATION_PATH: process.env.HANDBOOK_AUTOMATION_PATH ?? resolve(book, "automation/automation.toml"),
    HANDBOOK_RELEASE_POLICY_PATH: process.env.HANDBOOK_RELEASE_POLICY_PATH ?? resolve(book, "automation/release-policy.json"),
  };
  for (const script of ["build-handbook.mjs", "validate-handbook.mjs"]) {
    const result = spawnSync(process.execPath, [resolve(temporaryBook, "handbook", script)], { env, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${script} failed (${result.signal ?? result.status})`);
  }
} finally {
  await rm(temporaryBook, { recursive: true, force: true });
}
