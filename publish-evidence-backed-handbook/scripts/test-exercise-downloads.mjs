import assert from 'node:assert/strict';
import {copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {exerciseDownloadLinks} from './exercise-downloads.mjs';
import {digest} from './reader-paths.mjs';

const root = await realpath(await mkdtemp(join(tmpdir(), 'handbook-exercise-downloads-')));
const results = [];
let fixtureNumber = 0;

async function fixture({definition = true} = {}) {
  const source = join(root, 'case-' + ++fixtureNumber);
  const edition = {id: 'fixture-book', version: '2.4.0'};
  const filename = 'fixture-book-v2.4.0.fig';
  const path = 'reader/editions/v2.4.0/' + filename;
  const bytes = Buffer.from([0, 1, 2, 127, 128, 254, 255, 10]);
  const row = {
    label: 'Practice "one" & <two>',
    filename,
    url: '/fixture-book/editions/v2.4.0/' + filename,
    path,
    sha256: digest(bytes),
    bytes: bytes.length,
  };
  const record = {schemaVersion: 1, book: edition.id, version: edition.version, downloads: [row]};
  const pkg = {readerDirectory: 'reader', files: {[path]: row.sha256}};
  const file = join(source, path);
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, bytes);
  const context = {source, edition, pkg, row, record, file, bytes};
  if (definition) await saveDefinition(context);
  return context;
}

async function saveDefinition(f) {
  await writeFile(join(f.source, 'exercise-downloads.json'), JSON.stringify(f.record));
}

async function rejected(name, change, expected) {
  const f = await fixture();
  await change(f);
  await saveDefinition(f);
  await assert.rejects(() => exerciseDownloadLinks(f.source, f.edition, f.pkg), expected, name);
  results.push(name);
}

try {
  // Older editions have no definition and do not need new package fields.
  const legacy = await fixture({definition: false});
  assert.equal(await exerciseDownloadLinks(legacy.source, legacy.edition, {}), '');
  assert.deepEqual(await readFile(legacy.file), legacy.bytes);
  results.push('missing definition preserves existing-edition behavior');

  const valid = await fixture();
  const expected = '<section class="exercise-materials" aria-label="Exercise materials"><h2>Exercise materials</h2>'
    + '<p><a href="/fixture-book/editions/v2.4.0/fixture-book-v2.4.0.fig" download="fixture-book-v2.4.0.fig">'
    + 'Practice &quot;one&quot; &amp; &lt;two></a></p></section>';
  assert.equal(await exerciseDownloadLinks(valid.source, valid.edition, valid.pkg), expected);
  assert.deepEqual(await readFile(valid.file), valid.bytes);
  results.push('exact pinned binary bytes render one escaped edition download');

  // A second independent artifact must retain its own pin and manifest order.
  const secondFilename = 'exercise-notes.txt';
  const secondPath = 'reader/editions/v2.4.0/' + secondFilename;
  const secondBytes = Buffer.from('Independent exercise notes.\n');
  await writeFile(join(valid.source, secondPath), secondBytes);
  valid.record.downloads.push({
    label: 'Notes', filename: secondFilename,
    url: '/fixture-book/editions/v2.4.0/' + secondFilename,
    path: secondPath, sha256: digest(secondBytes), bytes: secondBytes.length,
  });
  valid.pkg.files[secondPath] = digest(secondBytes);
  await saveDefinition(valid);
  const ordered = await exerciseDownloadLinks(valid.source, valid.edition, valid.pkg);
  assert.equal((ordered.match(/<a /g) || []).length, 2);
  assert.ok(ordered.indexOf('fixture-book-v2.4.0.fig') < ordered.indexOf('exercise-notes.txt'));
  assert.match(ordered, /download="exercise-notes\.txt">Notes<\/a>/);
  results.push('multiple independently pinned downloads preserve definition order');

  await rejected('wrong schema', f => {f.record.schemaVersion = 2;}, assert.AssertionError);
  await rejected('wrong book identity', f => {f.record.book = 'another-book';}, /Exercise book mismatch/);
  await rejected('wrong edition version', f => {f.record.version = '2.5.0';}, /Exercise edition mismatch/);
  await rejected('missing downloads', f => {delete f.record.downloads;}, /Exercise downloads required/);
  await rejected('empty downloads', f => {f.record.downloads = [];}, /Exercise downloads required/);
  await rejected('blank label', f => {f.row.label = '  ';}, /Exercise label required/);
  await rejected('another book route', f => {f.row.url = f.row.url.replace('/fixture-book/', '/another-book/');}, /Exercise route/);
  await rejected('another edition route', f => {f.row.url = f.row.url.replace('v2.4.0', 'v2.5.0');}, /Exercise route/);
  await rejected('nested route', f => {f.row.url = f.row.url.replace(f.row.filename, 'private/' + f.row.filename);}, /Exercise route/);
  await rejected('traversal route', f => {f.row.url = '/fixture-book/editions/v2.4.0/../private.fig';}, /Exercise route/);
  await rejected('unsafe filename', f => {f.row.filename = '../private.fig';}, /Safe exercise filename/);
  await rejected('filename-route disagreement', f => {f.row.filename = 'other.fig';}, /Exercise filename mismatch/);
  await rejected('duplicate download route', f => {f.record.downloads.push({...f.row});}, /Duplicate exercise route/);
  await rejected('artifact path disagreement', f => {f.row.path = 'reader/private.fig';}, /Exercise path mismatch/);
  await rejected('missing hash', f => {delete f.row.sha256;}, assert.AssertionError);
  await rejected('invalid hash', f => {f.row.sha256 = 'A'.repeat(64);}, /Exercise hash required/);
  await rejected('zero size', f => {f.row.bytes = 0;}, /Exercise size required/);
  await rejected('fractional size', f => {f.row.bytes = 1.5;}, /Exercise size required/);
  await rejected('unsafe integer size', f => {f.row.bytes = Number.MAX_SAFE_INTEGER + 1;}, /Exercise size required/);
  await rejected('unlisted artifact pin', f => {delete f.pkg.files[f.row.path];}, /Unpinned exercise download/);
  await rejected('different package pin', f => {f.pkg.files[f.row.path] = 'b'.repeat(64);}, /Unpinned exercise download/);
  await rejected('stale measured size', f => {f.row.bytes++;}, /Stale exercise size/);
  await rejected('same-size changed file bytes', async f => {
    const changed = Buffer.from(f.bytes);
    changed[0] ^= 1;
    await writeFile(f.file, changed);
  }, /Stale exercise hash/);
  await rejected('jointly repinned false hash', f => {
    f.row.sha256 = 'c'.repeat(64);
    f.pkg.files[f.row.path] = f.row.sha256;
  }, /Stale exercise hash/);
  await rejected('unsafe reader directory', f => {
    const oldPath = f.row.path;
    f.pkg.readerDirectory = '../outside';
    f.row.path = '../outside/editions/v2.4.0/' + f.row.filename;
    delete f.pkg.files[oldPath];
    f.pkg.files[f.row.path] = f.row.sha256;
  }, /Unsafe collection path/);
  await rejected('missing artifact', async f => {await rm(f.file);}, {code: 'ENOENT'});
  await rejected('directory instead of artifact', async f => {
    await rm(f.file);
    await mkdir(f.file);
  }, /Exercise must be a regular local file/);
  await rejected('file symlink even with exact target bytes', async f => {
    const target = join(f.source, 'exact-target.fig');
    await copyFile(f.file, target);
    await rm(f.file);
    await symlink(target, f.file);
  }, /Exercise must be a regular local file/);
  await rejected('symlinked parent even with regular artifact bytes', async f => {
    const parent = dirname(f.file);
    const target = join(f.source, 'exact-target-directory');
    await rename(parent, target);
    await symlink(target, parent, 'dir');
  }, /Exercise must be a regular local file/);

  const malformed = await fixture();
  await writeFile(join(malformed.source, 'exercise-downloads.json'), '{unfinished');
  await assert.rejects(() => exerciseDownloadLinks(malformed.source, malformed.edition, malformed.pkg), SyntaxError);
  results.push('malformed definition fails instead of silently omitting download');

  console.log(JSON.stringify({status: 'passed',cases: results.length,checks: results}, null, 2));
} finally {
  await rm(root, {recursive: true, force: true});
}
