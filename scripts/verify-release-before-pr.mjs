#!/usr/bin/env node
/** Verify the immutable release commit and its assembled readers before opening a PR. */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {basename, isAbsolute, posix, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {digest, safePath} from '../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {validateDownloads, validateReaderDownloadPlacements, validateVariantIdentity} from '../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';

export function verifyReleaseBeforePr({checkout, commit, site}) {
  if (!isAbsolute(checkout ?? '') || !isAbsolute(site ?? '') || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit ?? '')) {
    throw Error('Provide an absolute release checkout, a full commit SHA, and an absolute assembled site path');
  }
  const git = (args, options = {}) => execFileSync('git', ['--literal-pathspecs', '-C', checkout, ...args], {
    stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, GIT_NO_REPLACE_OBJECTS: '1'}, ...options,
  });
  if (git(['rev-parse', '--verify', `${commit}^{commit}`]).toString().trim() !== commit) throw Error('Expected an exact commit SHA');

  // A Git-ignored, untracked, staged-only, or symlinked PDF cannot satisfy this gate.
  function committedFile(path, label, bytes) {
    if (typeof path !== 'string' || !path || posix.isAbsolute(path) || posix.normalize(path) !== path || path.split('/').includes('..') || /[\\\x00-\x1f]/.test(path)) {
      throw Error(`${label}: unsafe committed path ${path}`);
    }
    const entry = git(['ls-tree', '--full-tree', '-z', commit, '--', path]).toString();
    if (!entry) throw Error(`${label}: missing from commit ${commit}: ${path}`);
    const blob = /^100(?:644|755) blob ([a-f0-9]+)\t([^\0]+)\0$/.exec(entry);
    if (!blob || blob[2] !== path) throw Error(`${label}: expected a regular Git blob at ${path}`);
    if (bytes !== undefined && Number(git(['cat-file', '-s', blob[1]]).toString().trim()) !== bytes) {
      throw Error(`${label}: committed PDF byte length differs at ${path}`);
    }
    return git(['cat-file', 'blob', blob[1]], bytes === undefined ? {} : {maxBuffer: bytes + 1});
  }
  const catalog = JSON.parse(committedFile('catalog.json', 'Collection catalog'));
  const registry = JSON.parse(committedFile('site/approval-registry.json', 'Approval registry'));
  const books = catalog.books.filter(book => book.status === 'published');
  const publicIds = new Set(books.map(book => book.id));
  const pins = new Map(registry.books.map(pin => [pin.id, pin]));
  const approvedEditions = catalog.approvedPublicEditions ?? {};
  if (!books.length || publicIds.size !== books.length || pins.size !== registry.books.length || pins.size !== books.length ||
      Object.keys(approvedEditions).length !== books.length || books.some(book => approvedEditions[book.id] !== book.version || pins.get(book.id)?.version !== book.version)) {
    throw Error('The committed public catalog and approval registry disagree');
  }

  const verified = [];
  for (const book of books) {
    if (!/^[a-z0-9-]+$/.test(book.id) || book.directory !== book.id) throw Error(`Invalid published book directory for ${book.id}`);
    const label = `${book.id} ${book.version}`;
    const manifest = JSON.parse(committedFile(`${book.directory}/release-manifest.json`, label));
    if (manifest.id !== book.id || manifest.title !== book.title || manifest.version !== book.version || manifest.pdf !== book.pdf ||
        manifest.sha256 !== book.pdfSha256 || manifest.pages !== book.pages || manifest.approvalStatus !== 'approved' || manifest.publicationApproved !== true) {
      throw Error(`${label}: committed release manifest differs from the approved catalog`);
    }
    const variantPin = pins.get(book.id).variantManifest;
    const variantBytes = committedFile(variantPin?.path, `${label} PDF variant manifest`);
    if (digest(variantBytes) !== variantPin.sha256) throw Error(`${label}: committed PDF variant manifest differs from the approval registry hash`);
    const variants = validateVariantIdentity(JSON.parse(variantBytes), manifest);
    const pdfs = variants.map(variant => {
      const appearance = manifest.appearances?.[variant.theme];
      if (!appearance || variant.path !== `${book.directory}/${appearance.pdf}` || variant.sha256 !== appearance.sha256 ||
          (variant.theme === 'light' && appearance.pdf !== book.pdf)) {
        throw Error(`${label} ${variant.displayName}: variant path or hash differs from the approved edition`);
      }
      const artifact = committedFile(variant.path, `${label} ${variant.displayName}`, variant.bytes);
      if (digest(artifact) !== variant.sha256) throw Error(`${label} ${variant.displayName}: committed PDF SHA-256 differs at ${variant.path}`);
      return {theme: variant.theme, path: variant.path, bytes: variant.bytes, sha256: variant.sha256};
    });

    const readerPath = safePath(site, `${book.id}/index.html`);
    const reader = readFileSync(readerPath);
    const publicUrl = `/${book.id}/editions/v${book.version}/${book.id}-v${book.version}.md`;
    const markdown = readFileSync(safePath(site, publicUrl.slice(1)));
    try {
      const placements = validateReaderDownloadPlacements(reader.toString('utf8'));
      validateDownloads(reader.toString('utf8'), {...manifest, markdown: {
        version: book.version, downloadFilename: basename(publicUrl), publicUrl, sha256: digest(markdown), bytes: markdown.length,
      }}, variants);
      verified.push({id: book.id, version: book.version, pdfs, reader: {path: readerPath, sha256: digest(reader), ...placements}});
    } catch (error) {
      throw Error(`${label} assembled reader: ${error.message}`, {cause: error});
    }
  }
  return {status: 'passed', commit, books: verified};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {values} = parseArgs({options: {checkout: {type: 'string'}, commit: {type: 'string'}, site: {type: 'string'}}});
    console.log(JSON.stringify(verifyReleaseBeforePr(values), null, 2));
  } catch (error) {
    console.error(`Release preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
