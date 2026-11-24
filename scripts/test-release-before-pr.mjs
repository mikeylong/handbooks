import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {test} from 'node:test';
import {installReaderDownloads} from '../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {digest} from '../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {verifyReleaseBeforePr} from './verify-release-before-pr.mjs';

test('release gate checks committed PDFs and the final reader', t => {
  const root = mkdtempSync(join(tmpdir(), 'handbook-release-fixture-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const checkout = join(root, 'checkout');
  const site = join(root, 'site');
  const write = (dir, path, contents) => {
    const file = join(dir, path);
    mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, contents);
  };
  mkdirSync(checkout);
  const git = (...args) => execFileSync('git', ['-C', checkout, '-c', 'user.name=Release fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], {encoding: 'utf8'}).trim();
  const commit = message => {
    git('commit', '--quiet', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  git('init', '--quiet');

  const id = 'fixture-book';
  const version = '1.0.0';
  const date = '2026-11-23';
  const editionRoute = `/${id}/editions/v${version}/`;
  const variants = ['light', 'dark'].map(theme => {
    const suffix = theme === 'light' ? 'daytime' : 'late-night';
    const downloadFilename = `${id}-v${version}-${date}-${suffix}-r1.pdf`;
    const path = `${id}/output/pdf/${downloadFilename}`;
    const content = `%PDF-1.7\n${theme} fixture\n`;
    write(checkout, path, content);
    return {theme, displayName: theme === 'light' ? 'Daytime version' : 'Late night version', appearanceRevision: 1, approvalStatus: 'approved',
      path, publicUrl: editionRoute + downloadFilename, downloadFilename, sha256: digest(content), bytes: Buffer.byteLength(content), pages: 1,
      pageMap: {path: 'unused-fixture-map.json', sha256: 'a'.repeat(64)}};
  });
  const [light, dark] = variants;
  const appearances = Object.fromEntries(variants.map(v => [v.theme, {pdf: v.path.slice(id.length + 1), sha256: v.sha256, pages: 1}]));
  const manifest = {id, title: 'Fixture book', version, date, pdf: appearances.light.pdf, sha256: light.sha256, pages: 1,
    approvalStatus: 'approved', publicationApproved: true, appearances};
  const book = {id, directory: id, title: manifest.title, status: 'published', version, pdf: manifest.pdf, pdfSha256: light.sha256, pages: 1};
  const variantManifest = JSON.stringify({schemaVersion: 1, book: id, ...manifest, variants});
  const variantPath = `${id}/pdf-variants.json`;
  write(checkout, '.gitignore', '*/output/\n');
  write(checkout, 'catalog.json', JSON.stringify({books: [book, {id: 'private-draft', status: 'draft'}], approvedPublicEditions: {[id]: version}}));
  write(checkout, 'site/approval-registry.json', JSON.stringify({books: [{id, version, variantManifest: {path: variantPath, sha256: digest(variantManifest)}}]}));
  write(checkout, `${id}/release-manifest.json`, JSON.stringify(manifest));
  write(checkout, variantPath, variantManifest);

  const markdown = '# Fixture book\n';
  const downloadFilename = `${id}-v${version}.md`;
  const publicUrl = editionRoute + downloadFilename;
  write(site, publicUrl.slice(1), markdown);
  const edition = {...manifest, markdown: {version, downloadFilename, publicUrl, sha256: digest(markdown), bytes: Buffer.byteLength(markdown)}};
  const link = '<a href="book.pdf" download>PDF</a>';
  const raw = `<aside class="sidebar">${link}</aside><main id="main-content"><section class="cover">${link}</section></main><dialog id="toc-dialog"><div class="dialog-footer">${link}</div></dialog>`;
  const reader = installReaderDownloads(raw, edition, variants);
  write(site, `${id}/index.html`, reader);

  git('add', '.');
  git('add', '-f', '--', light.path, dark.path);
  const complete = commit('Complete release fixture');
  const verify = commitSha => verifyReleaseBeforePr({checkout, commit: commitSha, site});
  assert.equal(verify(complete).books[0].pdfs.length, 2);

  git('rm', '--cached', '--quiet', '--', dark.path);
  const missing = commit('The Late night PDF is present only as an ignored file');
  assert.throws(() => verify(missing), /Late night version: missing from commit/);
  git('add', '-f', '--', dark.path);
  assert.throws(() => verify(missing), /Late night version: missing from commit/);

  write(checkout, dark.path, '%PDF-1.7\nDARK fixture\n');
  git('add', '-f', '--', dark.path);
  const different = commit('The Late night PDF is a different blob of the same length');
  assert.throws(() => verify(different), /Late night version: committed PDF SHA-256 differs/);
  assert.equal(verify(complete).books[0].pdfs.length, 2);

  write(site, `${id}/index.html`, reader.replace('</main>', '<span data-pdf-downloads></span></main>'));
  assert.throws(() => verify(complete), /assembled reader: Reader requires exactly three download groups/);
});
