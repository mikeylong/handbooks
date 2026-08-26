#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = "README.md";
const PDF_PATH = "output/pdf/production-ai-engineering.pdf";
const CHANGELOG_PATH = "handbook/changelog.json";
const SOURCE_PATH = "AI_ENGINEERING_FIELD_GUIDE.md";
const RELEASE_PATHS = [PDF_PATH, README_PATH, CHANGELOG_PATH];
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const STABLE_PDF_LINK = "[Read the book (PDF)](./output/pdf/production-ai-engineering.pdf)";
const UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged.";

function fail(message) {
  throw new Error(message);
}

function run(command, args, { allowFailure = false, input } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    input,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "unknown error").trim();
    fail(`${command} ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

function git(args, options) {
  return run("git", args, options);
}

function gitBuffer(args, { allowFailure = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: null,
    env: process.env,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) {
    fail(`git could not start: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || Buffer.from("unknown error"))
      .toString("utf8")
      .trim();
    fail(`git ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArguments(argv) {
  const values = { base: null, head: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--base" || argument === "--head") {
      const value = argv[index + 1];
      if (!value) {
        fail(`${argument} requires a Git ref`);
      }
      values[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${argument}`);
  }
  if (Boolean(values.base) !== Boolean(values.head)) {
    fail("--base and --head must be supplied together");
  }
  return values;
}

function parseReadme(source, label) {
  const releaseMatches = [...source.matchAll(
    /^\*\*Current release:\*\* (Version \d+\.\d+(?:\.\d+)?) · ([A-Z][a-z]+ \d{1,2}, \d{4})$/gm,
  )];
  if (releaseMatches.length !== 1) {
    fail(`${label} must contain exactly one visible current-release line`);
  }

  const hashMatches = [...source.matchAll(
    /<!-- production-pdf-sha256: ([a-f0-9]{64}) -->/g,
  )];
  if (hashMatches.length !== 1) {
    fail(`${label} must contain exactly one production PDF SHA-256 comment`);
  }

  const markdownLinks = source.match(/\[[^\]]+\]\([^)]+\)/g) ?? [];
  if (markdownLinks.length !== 1 || markdownLinks[0] !== STABLE_PDF_LINK) {
    fail(`${label} must keep exactly one Markdown link: ${STABLE_PDF_LINK}`);
  }

  return {
    version: releaseMatches[0][1],
    publicationDate: releaseMatches[0][2],
    pdfSha256: hashMatches[0][1],
  };
}

function coverText(pdfPath) {
  const executable = process.env.PDFTOTEXT_BIN || "pdftotext";
  const result = run(executable, ["-f", "1", "-l", "1", "-layout", pdfPath, "-"]);
  return result.stdout.replace(/\s+/g, " ").trim();
}

function coverTextFromBytes(pdfBytes) {
  const executable = process.env.PDFTOTEXT_BIN || "pdftotext";
  const result = run(
    executable,
    ["-f", "1", "-l", "1", "-layout", "-", "-"],
    { input: pdfBytes },
  );
  return result.stdout.replace(/\s+/g, " ").trim();
}

function zeroRef(ref) {
  return Boolean(ref) && /^0+$/.test(ref);
}

function refExists(ref) {
  if (!ref || zeroRef(ref)) {
    return false;
  }
  return git(["cat-file", "-e", `${ref}^{commit}`], { allowFailure: true }).status === 0;
}

function fileAtRef(ref, path) {
  const result = git(["show", `${ref}:${path}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : null;
}

function fileBufferAtRef(ref, path) {
  const result = gitBuffer(["show", `${ref}:${path}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : null;
}

function changedPaths(base, head) {
  if (!base && !head) {
    const output = git(["diff", "--name-only", "HEAD", "--"]).stdout;
    return new Set(output.split("\n").filter(Boolean));
  }

  const resolvedHead = git(["rev-parse", head]).stdout.trim();
  const checkedOutHead = git(["rev-parse", "HEAD"]).stdout.trim();
  if (resolvedHead !== checkedOutHead) {
    fail(`The checked-out HEAD ${checkedOutHead} does not match --head ${resolvedHead}`);
  }

  if (!zeroRef(base) && !refExists(base)) {
    fail(`Base ref ${base} is unavailable; refusing aggregate-only release validation`);
  }
  const resolvedBase = zeroRef(base) ? EMPTY_TREE : git(["rev-parse", base]).stdout.trim();
  const output = git(["diff", "--name-only", resolvedBase, resolvedHead, "--"]).stdout;
  return new Set(output.split("\n").filter(Boolean));
}

function cleanWorktreeRequired() {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]).stdout.trim();
  if (status) {
    fail("--base/--head validation requires a clean worktree");
  }
}

function pathsChangedBetween(base, head) {
  const output = git(["diff", "--name-only", base, head, "--"]).stdout;
  return new Set(output.split("\n").filter(Boolean));
}

function requireReleasePaths(changed, label) {
  const missing = RELEASE_PATHS.filter((path) => !changed.has(path));
  if (missing.length) {
    fail(
      `${label} must update README.md and handbook/changelog.json with the production PDF. `
      + `Missing: ${missing.join(", ")}`,
    );
  }
}

function requireChangedReleaseIdentity(current, previous, label) {
  if (
    previous.version === current.version
    && previous.publicationDate === current.publicationDate
  ) {
    fail(`${label} did not change the README release version or publication date`);
  }
  if (previous.pdfSha256 === current.pdfSha256) {
    fail(`${label} did not change the README production PDF checksum`);
  }
}

function validateChangelogAlignment(
  changelogSource,
  readme,
  pdfSha256,
  manuscriptSha256,
  label,
) {
  let changelog;
  try {
    changelog = JSON.parse(changelogSource);
  } catch (error) {
    fail(`${label} has invalid handbook/changelog.json: ${error.message}`);
  }
  const changelogChecks = {
    previousVersion: changelog.previousVersion === readme.version,
    previousPublicationDate: changelog.previousPublicationDate === readme.publicationDate,
    previousPdfSha256: changelog.previousPdfSha256 === pdfSha256,
    currentSourceSha256: changelog.currentSourceSha256 === manuscriptSha256,
    resetSummary: changelog.summary === UNCHANGED_SUMMARY,
    resetItems: Array.isArray(changelog.items) && changelog.items.length === 0,
  };
  const failedChangelogChecks = Object.entries(changelogChecks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);
  if (failedChangelogChecks.length) {
    fail(
      `${label} has handbook/changelog.json that is not aligned to the published release: `
      + failedChangelogChecks.join(", "),
    );
  }
}

function validateReleaseState({
  readme,
  pdfBytes,
  changelogSource,
  manuscriptBytes,
  extractedCoverText,
  label,
}) {
  const pdfSha256 = sha256(pdfBytes);
  const manuscriptSha256 = sha256(manuscriptBytes);
  if (readme.pdfSha256 !== pdfSha256) {
    fail(
      `${label} has README production PDF checksum ${readme.pdfSha256}, not ${pdfSha256}`,
    );
  }

  const expectedCoverIdentity = `${readme.publicationDate} · ${readme.version}`;
  const coverReleaseIdentities = extractedCoverText.match(
    /[A-Z][a-z]+ \d{1,2}, \d{4} · Version \d+\.\d+(?:\.\d+)?(?:-[A-Za-z0-9.]+)?/g,
  ) ?? [];
  if (coverReleaseIdentities.length !== 1 || coverReleaseIdentities[0] !== expectedCoverIdentity) {
    fail(
      `${label} PDF cover release identity does not exactly match README: `
      + expectedCoverIdentity,
    );
  }

  validateChangelogAlignment(
    changelogSource,
    readme,
    pdfSha256,
    manuscriptSha256,
    label,
  );
  return { pdfSha256, manuscriptSha256 };
}

function validateReleaseCommits(base, head) {
  if (!base || !head) {
    return;
  }

  const resolvedHead = git(["rev-parse", head]).stdout.trim();
  const revisionRange = zeroRef(base)
    ? resolvedHead
    : `${git(["rev-parse", base]).stdout.trim()}..${resolvedHead}`;
  const commits = git(["rev-list", "--reverse", revisionRange])
    .stdout
    .split("\n")
    .filter(Boolean);

  for (const commit of commits) {
    const commitAndParents = git(["rev-list", "--parents", "-n", "1", commit])
      .stdout
      .trim()
      .split(/\s+/);
    const firstParent = commitAndParents[1] || EMPTY_TREE;
    const changed = pathsChangedBetween(firstParent, commit);
    if (!changed.has(PDF_PATH)) {
      continue;
    }

    const label = `Commit ${commit.slice(0, 12)} that changes the production PDF`;
    requireReleasePaths(changed, label);

    const currentReadmeSource = fileAtRef(commit, README_PATH);
    const currentPdfBytes = fileBufferAtRef(commit, PDF_PATH);
    const currentChangelogSource = fileAtRef(commit, CHANGELOG_PATH);
    const currentManuscriptBytes = fileBufferAtRef(commit, SOURCE_PATH);
    if (
      currentReadmeSource === null
      || currentPdfBytes === null
      || currentChangelogSource === null
      || currentManuscriptBytes === null
    ) {
      fail(`${label} is missing one or more required release files`);
    }
    const currentReadme = parseReadme(currentReadmeSource, `${README_PATH} at ${commit}`);

    if (firstParent !== EMPTY_TREE) {
      const previousReadmeSource = fileAtRef(firstParent, README_PATH);
      if (!previousReadmeSource) {
        fail(`${label} could not read README.md at the commit and its first parent`);
      }
      const previousReadme = parseReadme(
        previousReadmeSource,
        `${README_PATH} at ${firstParent}`,
      );
      requireChangedReleaseIdentity(currentReadme, previousReadme, label);
    }

    validateReleaseState({
      readme: currentReadme,
      pdfBytes: currentPdfBytes,
      changelogSource: currentChangelogSource,
      manuscriptBytes: currentManuscriptBytes,
      extractedCoverText: coverTextFromBytes(currentPdfBytes),
      label,
    });
  }
}

function validateAtomicRelease(changed, currentReadme, base) {
  if (!changed.has(PDF_PATH)) {
    return false;
  }

  requireReleasePaths(changed, "A production PDF release");

  const baselineRef = base ? (zeroRef(base) ? null : base) : "HEAD";
  const baselineReadmeSource = baselineRef ? fileAtRef(baselineRef, README_PATH) : null;
  if (baselineReadmeSource) {
    const baselineReadme = parseReadme(baselineReadmeSource, `${README_PATH} at ${baselineRef}`);
    requireChangedReleaseIdentity(currentReadme, baselineReadme, "A production PDF release");
  }
  return true;
}

async function main() {
  const { base, head } = parseArguments(process.argv.slice(2));
  if (base && head) {
    cleanWorktreeRequired();
  }
  const [readmeSource, pdfBytes, changelogSource, manuscriptBytes] = await Promise.all([
    readFile(resolve(ROOT, README_PATH), "utf8"),
    readFile(resolve(ROOT, PDF_PATH)),
    readFile(resolve(ROOT, CHANGELOG_PATH), "utf8"),
    readFile(resolve(ROOT, SOURCE_PATH)),
  ]);

  const readme = parseReadme(readmeSource, README_PATH);
  const changed = changedPaths(base, head);
  validateReleaseCommits(base, head);
  const releaseChanged = validateAtomicRelease(changed, readme, base);
  const { pdfSha256 } = validateReleaseState({
    readme,
    pdfBytes,
    changelogSource,
    manuscriptBytes,
    extractedCoverText: coverText(resolve(ROOT, PDF_PATH)),
    label: "Current production release",
  });

  console.log(JSON.stringify({
    status: "passed",
    releaseChanged,
    version: readme.version,
    publicationDate: readme.publicationDate,
    productionPdfSha256: pdfSha256,
    changedReleasePaths: RELEASE_PATHS.filter((path) => changed.has(path)),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Production release validation failed: ${error.message}`);
  process.exitCode = 1;
});
