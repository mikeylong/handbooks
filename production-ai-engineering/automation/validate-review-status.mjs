#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    file: { type: "string" },
    "candidate-id": { type: "string" },
    "expected-status": { type: "string" },
    "proof-dir": { type: "string" },
    "wrapper-proof-dir": { type: "string" },
    "page-count": { type: "string" },
    "changelog-required": { type: "string" },
    "changelog-start-page": { type: "string" },
    "changelog-end-page": { type: "string" },
  },
  strict: true,
});
for (const key of [
  "file",
  "candidate-id",
  "proof-dir",
  "wrapper-proof-dir",
  "page-count",
  "changelog-required",
  "changelog-start-page",
  "changelog-end-page",
]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}
const pageCount = Number.parseInt(values["page-count"], 10);
if (!Number.isSafeInteger(pageCount) || pageCount < 1 || pageCount > 1000) {
  throw new Error("--page-count must be an integer from 1 through 1000");
}
if (!new Set(["true", "false"]).has(values["changelog-required"])) {
  throw new Error("--changelog-required must be true or false");
}
const changelogRequired = values["changelog-required"] === "true";
const changelogStartPage = changelogRequired
  ? Number.parseInt(values["changelog-start-page"], 10)
  : null;
const changelogEndPage = changelogRequired
  ? Number.parseInt(values["changelog-end-page"], 10)
  : null;
if (changelogRequired && (
  !Number.isSafeInteger(changelogStartPage)
  || !Number.isSafeInteger(changelogEndPage)
  || changelogStartPage < 1
  || changelogStartPage > changelogEndPage
  || changelogEndPage !== pageCount
)) {
  throw new Error("Invalid changelog physical page range");
}
if (!changelogRequired && (
  values["changelog-start-page"] !== "none"
  || values["changelog-end-page"] !== "none"
)) {
  throw new Error("An unchanged candidate must not report changelog pages");
}
const changelogPageCount = changelogRequired
  ? changelogEndPage - changelogStartPage + 1
  : 0;

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
if (values["expected-status"] && status.status !== values["expected-status"]) {
  throw new Error(`Expected review status ${values["expected-status"]}, received ${status.status}`);
}
for (const key of ["production_unchanged", "validation_passed", "visual_proof_passed"]) {
  if (typeof status[key] !== "boolean") throw new Error(`${key} must be boolean`);
}
if (!Array.isArray(status.notes) || status.notes.some((note) => typeof note !== "string")) {
  throw new Error("notes must be an array of strings");
}
if (status.status === "failed_review") process.exit(1);
if (!status.production_unchanged || !status.validation_passed || !status.visual_proof_passed) process.exit(1);

const validatePng = async (proofPath, proofName) => {
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
};

const finalProofNames = [
  "cover.png",
  ...Array.from({ length: 12 }, (_, index) => `chapter-${String(index + 1).padStart(2, "0")}.png`),
  ...(changelogRequired ? [
    "changelog.png",
    "changelog-final.png",
    ...Array.from(
      { length: changelogPageCount },
      (_, index) => `changelog-page-${String(index + 1).padStart(3, "0")}.png`,
    ),
  ] : []),
];
for (const proofName of finalProofNames) {
  await validatePng(resolve(values["proof-dir"], proofName), `final-review/${proofName}`);
}

const wrapperProofNames = [
  ...Array.from({ length: pageCount }, (_, index) => `page-${String(index + 1).padStart(3, "0")}.png`),
  "cover.png",
  "final-page.png",
  ...Array.from({ length: 12 }, (_, index) => `chapter-${String(index + 1).padStart(2, "0")}.png`),
  ...(changelogRequired ? [
    "changelog.png",
    "changelog-final.png",
    ...Array.from(
      { length: changelogPageCount },
      (_, index) => `changelog-page-${String(index + 1).padStart(3, "0")}.png`,
    ),
  ] : []),
];
for (const proofName of wrapperProofNames) {
  await validatePng(resolve(values["wrapper-proof-dir"], proofName), `wrapper/${proofName}`);
}
if (changelogRequired) {
  const wrapperProofDir = resolve(values["wrapper-proof-dir"]);
  const finalProofDir = resolve(values["proof-dir"]);
  for (let index = 0; index < changelogPageCount; index += 1) {
    const physicalPage = changelogStartPage + index;
    const pageName = `page-${String(physicalPage).padStart(3, "0")}.png`;
    const changelogName = `changelog-page-${String(index + 1).padStart(3, "0")}.png`;
    const [pageBytes, wrapperChangelogBytes, finalChangelogBytes] = await Promise.all([
      readFile(resolve(wrapperProofDir, pageName)),
      readFile(resolve(wrapperProofDir, changelogName)),
      readFile(resolve(finalProofDir, changelogName)),
    ]);
    if (!pageBytes.equals(wrapperChangelogBytes) || !pageBytes.equals(finalChangelogBytes)) {
      throw new Error(`${changelogName} does not match ${pageName}`);
    }
  }
  const [firstPage, changelogAlias, lastPage, finalAlias, finalReviewAlias] = await Promise.all([
    readFile(resolve(wrapperProofDir, `page-${String(changelogStartPage).padStart(3, "0")}.png`)),
    readFile(resolve(wrapperProofDir, "changelog.png")),
    readFile(resolve(wrapperProofDir, `page-${String(changelogEndPage).padStart(3, "0")}.png`)),
    readFile(resolve(wrapperProofDir, "final-page.png")),
    readFile(resolve(finalProofDir, "changelog-final.png")),
  ]);
  if (!firstPage.equals(changelogAlias)) {
    throw new Error("changelog.png does not match the first changelog page");
  }
  if (!lastPage.equals(finalAlias) || !lastPage.equals(finalReviewAlias)) {
    throw new Error("The final-page aliases do not match the last changelog page");
  }
}
console.log(JSON.stringify(status));
