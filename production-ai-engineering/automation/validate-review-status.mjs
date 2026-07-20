#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    "candidate-id": { type: "string" },
    "proof-dir": { type: "string" },
  },
  strict: true,
});
if (!values.file || !values["candidate-id"] || !values["proof-dir"]) {
  throw new Error("Missing --file, --candidate-id, or --proof-dir");
}

const path = resolve(values.file);
const metadata = await lstat(path);
if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 65_536) {
  throw new Error("review-status.json must be a regular file smaller than 64 KB");
}
const status = JSON.parse(await readFile(path, "utf8"));
if (status === null || typeof status !== "object" || Array.isArray(status)) throw new Error("Invalid review status");
const allowedKeys = [
  "version",
  "candidate_id",
  "status",
  "production_unchanged",
  "validation_passed",
  "visual_proof_passed",
  "notes",
];
const unknownKeys = Object.keys(status).filter((key) => !allowedKeys.includes(key));
if (unknownKeys.length) throw new Error(`Unknown review-status keys: ${unknownKeys.join(", ")}`);
if (status.version !== 1) throw new Error("review-status version must be 1");
if (status.candidate_id !== values["candidate-id"]) throw new Error("review-status candidate_id does not match");
if (!["ready_for_review", "no_update_warranted", "failed_review"].includes(status.status)) {
  throw new Error("Invalid review status value");
}
for (const key of ["production_unchanged", "validation_passed", "visual_proof_passed"]) {
  if (typeof status[key] !== "boolean") throw new Error(`${key} must be boolean`);
}
if (!Array.isArray(status.notes) || status.notes.some((note) => typeof note !== "string")) {
  throw new Error("notes must be an array of strings");
}
if (status.status === "failed_review") process.exit(1);
if (!status.production_unchanged || !status.validation_passed || !status.visual_proof_passed) process.exit(1);
for (const proofName of [
  "cover.png",
  ...Array.from({ length: 12 }, (_, index) => `chapter-${String(index + 1).padStart(2, "0")}.png`),
]) {
  const proofPath = resolve(values["proof-dir"], proofName);
  const proofMetadata = await lstat(proofPath);
  if (!proofMetadata.isFile() || proofMetadata.isSymbolicLink() || proofMetadata.size < 1000) {
    throw new Error(`Missing or invalid visual proof: ${proofName}`);
  }
  const proofBytes = await readFile(proofPath);
  if (proofBytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`Visual proof is not a PNG: ${proofName}`);
  }
  const width = proofBytes.readUInt32BE(16);
  const height = proofBytes.readUInt32BE(20);
  if (width < 420 || height < 595) throw new Error(`Visual proof is too small: ${proofName}`);
}
console.log(JSON.stringify(status));
