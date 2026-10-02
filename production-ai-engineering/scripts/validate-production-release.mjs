#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const README_PATH = "README.md";
const PDF_DIRECTORY = "output/pdf/";
const LEGACY_PDF_PATH = `${PDF_DIRECTORY}production-ai-engineering.pdf`;
const CHANGELOG_PATH = "handbook/changelog.json";
const SOURCE_PATH = "AI_ENGINEERING_FIELD_GUIDE.md";
const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
const UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged.";
const MONTH_NUMBERS = new Map([
  ["January", "01"],
  ["February", "02"],
  ["March", "03"],
  ["April", "04"],
  ["May", "05"],
  ["June", "06"],
  ["July", "07"],
  ["August", "08"],
  ["September", "09"],
  ["October", "10"],
  ["November", "11"],
  ["December", "12"],
]);

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

const gitPrefix = run('git',['rev-parse','--show-prefix']).stdout.trim();
function bookPaths(output) { return output.split('\n').filter(path=>path.startsWith(gitPrefix)).map(path=>path.slice(gitPrefix.length)); }
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

function expectedPdfPath(version, publicationDate) {
  const versionMatch = /^Version (\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
  const dateMatch = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(publicationDate);
  if (!versionMatch || !dateMatch || !MONTH_NUMBERS.has(dateMatch[1])) {
    fail(`Cannot derive a versioned PDF filename from ${version} and ${publicationDate}`);
  }

  const [, major, minor, patch = "0"] = versionMatch;
  const month = MONTH_NUMBERS.get(dateMatch[1]);
  const day = dateMatch[2].padStart(2, "0");
  const year = dateMatch[3];
  const isoDate = `${year}-${month}-${day}`;
  const parsedDate = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== isoDate) {
    fail(`Cannot derive a valid PDF filename date from ${publicationDate}`);
  }

  return `${PDF_DIRECTORY}production-ai-engineering-v${major}.${minor}.${patch}-${isoDate}.pdf`;
}

function releasePaths(pdfPath) {
  return [pdfPath, README_PATH, CHANGELOG_PATH];
}

function productionPdfChanged(changed) {
  return [...changed].some((path) => path.startsWith(PDF_DIRECTORY) && path.endsWith(".pdf"));
}

function parseReadme(source, label, { allowLegacyPdfPath = false } = {}) {
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
  const linkMatch = markdownLinks.length === 1
    ? /^\[Read the book \(PDF\)\]\(\.\/(output\/pdf\/[^/)]+\.pdf)\)$/.exec(markdownLinks[0])
    : null;
  if (!linkMatch) {
    fail(`${label} must contain exactly one Markdown link to the current production PDF`);
  }

  const version = releaseMatches[0][1];
  const publicationDate = releaseMatches[0][2];
  const pdfPath = linkMatch[1];
  const requiredPdfPath = expectedPdfPath(version, publicationDate);
  if (pdfPath !== requiredPdfPath && !(allowLegacyPdfPath && pdfPath === LEGACY_PDF_PATH)) {
    fail(`${label} PDF link must be ./${requiredPdfPath}, not ./${pdfPath}`);
  }

  return {
    version,
    publicationDate,
    pdfSha256: hashMatches[0][1],
    pdfPath,
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
  const result = git(["show", `${ref}:${gitPrefix}${path}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : null;
}

function fileBufferAtRef(ref, path) {
  const result = gitBuffer(["show", `${ref}:${gitPrefix}${path}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : null;
}

function changedPaths(base, head) {
  if (!base && !head) {
    const output = git(["diff", "--name-only", "HEAD", "--"]).stdout;
    return new Set(bookPaths(output));
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
  return new Set(bookPaths(output));
}

function cleanWorktreeRequired() {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]).stdout.trim();
  if (status) {
    fail("--base/--head validation requires a clean worktree");
  }
}

function pathsChangedBetween(base, head) {
  const output = git(["diff", "--name-only", base, head, "--"]).stdout;
  return new Set(bookPaths(output));
}

function requireReleasePaths(changed, label, pdfPath) {
  const missing = releasePaths(pdfPath).filter((path) => !changed.has(path));
  if (missing.length) {
    fail(
      `${label} must update README.md and handbook/changelog.json with the production PDF. `
      + `Missing: ${missing.join(", ")}`,
    );
  }
}

function requireChangedReleaseIdentity(current, previous, label) {
  const identityUnchanged = (
    previous.version === current.version
    && previous.publicationDate === current.publicationDate
  );
  const checksumUnchanged = previous.pdfSha256 === current.pdfSha256;
  const legacyFilenameMigration = (
    identityUnchanged
    && checksumUnchanged
    && previous.pdfPath === LEGACY_PDF_PATH
    && current.pdfPath === expectedPdfPath(current.version, current.publicationDate)
  );

  if (legacyFilenameMigration) {
    return;
  }
  if (identityUnchanged) {
    fail(`${label} did not change the README release version or publication date`);
  }
  if (checksumUnchanged) {
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
    publishedPdfFilename: (
      readme.pdfPath === LEGACY_PDF_PATH
      || changelog.publishedPdfFilename === basename(readme.pdfPath)
    ),
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
    if (!productionPdfChanged(changed)) {
      continue;
    }

    const label = `Commit ${commit.slice(0, 12)} that changes the production PDF`;
    const currentReadmeSource = fileAtRef(commit, README_PATH);
    const currentChangelogSource = fileAtRef(commit, CHANGELOG_PATH);
    const currentManuscriptBytes = fileBufferAtRef(commit, SOURCE_PATH);
    if (
      currentReadmeSource === null
      || currentChangelogSource === null
      || currentManuscriptBytes === null
    ) {
      fail(`${label} is missing one or more required release files`);
    }
    const currentReadme = parseReadme(
      currentReadmeSource,
      `${README_PATH} at ${commit}`,
      { allowLegacyPdfPath: true },
    );
    requireReleasePaths(changed, label, currentReadme.pdfPath);
    const currentPdfBytes = fileBufferAtRef(commit, currentReadme.pdfPath);
    if (currentPdfBytes === null) {
      fail(`${label} is missing ${currentReadme.pdfPath}`);
    }

    if (firstParent !== EMPTY_TREE) {
      const previousReadmeSource = fileAtRef(firstParent, README_PATH);
      if (!previousReadmeSource) {
        fail(`${label} could not read README.md at the commit and its first parent`);
      }
      const previousReadme = parseReadme(
        previousReadmeSource,
        `${README_PATH} at ${firstParent}`,
        { allowLegacyPdfPath: true },
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
  if (!productionPdfChanged(changed)) {
    return false;
  }

  requireReleasePaths(changed, "A production PDF release", currentReadme.pdfPath);

  const baselineRef = base ? (zeroRef(base) ? null : base) : "HEAD";
  const baselineReadmeSource = baselineRef ? fileAtRef(baselineRef, README_PATH) : null;
  if (baselineReadmeSource) {
    const baselineReadme = parseReadme(
      baselineReadmeSource,
      `${README_PATH} at ${baselineRef}`,
      { allowLegacyPdfPath: true },
    );
    requireChangedReleaseIdentity(currentReadme, baselineReadme, "A production PDF release");
  }
  return true;
}

async function main() {
  const { base, head } = parseArguments(process.argv.slice(2));
  if (base && head) {
    cleanWorktreeRequired();
  }
  const readmeSource = await readFile(resolve(ROOT, README_PATH), "utf8");
  const readme = parseReadme(readmeSource, README_PATH);
  const [pdfBytes, changelogSource, manuscriptBytes] = await Promise.all([
    readFile(resolve(ROOT, readme.pdfPath)),
    readFile(resolve(ROOT, CHANGELOG_PATH), "utf8"),
    readFile(resolve(ROOT, SOURCE_PATH)),
  ]);

  const changed = changedPaths(base, head);
  validateReleaseCommits(base, head);
  const releaseChanged = validateAtomicRelease(changed, readme, base);
  const { pdfSha256 } = validateReleaseState({
    readme,
    pdfBytes,
    changelogSource,
    manuscriptBytes,
    extractedCoverText: coverText(resolve(ROOT, readme.pdfPath)),
    label: "Current production release",
  });

  console.log(JSON.stringify({
    status: "passed",
    releaseChanged,
    version: readme.version,
    publicationDate: readme.publicationDate,
    productionPdfSha256: pdfSha256,
    productionPdfPath: readme.pdfPath,
    changedReleasePaths: releasePaths(readme.pdfPath).filter((path) => changed.has(path)),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Production release validation failed: ${error.message}`);
  process.exitCode = 1;
});
