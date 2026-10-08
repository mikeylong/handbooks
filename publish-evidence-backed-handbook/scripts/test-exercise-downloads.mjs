import assert from 'node:assert/strict';
import {copyFile, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {exerciseDownloadLinks} from './exercise-downloads.mjs';
import {digest} from './reader-paths.mjs';

const root = await realpath(await mkdtemp(join(tmpdir(), 'handbook-exercise-downloads-')));
const results = [];
let fixtureNumber = 0;

async function fixture({definition = true, exerciseEdition} = {}) {
  const source = join(root, 'case-' + ++fixtureNumber);
  const edition = {id: 'fixture-book', version: '2.4.0'};
  const artifactVersion = exerciseEdition ?? edition.version;
  const filename = 'fixture-book-v' + artifactVersion + '.fig';
  const path = 'reader/editions/v' + artifactVersion + '/' + filename;
  const bytes = Buffer.from([0, 1, 2, 127, 128, 254, 255, 10]);
  const row = {
    label: 'Practice "one" & <two>',
    filename,
    url: '/fixture-book/editions/v' + artifactVersion + '/' + filename,
    path,
    sha256: digest(bytes),
    bytes: bytes.length,
  };
  const record = {schemaVersion: 1, book: edition.id, version: edition.version, downloads: [row]};
  if (exerciseEdition !== undefined) record.exerciseEdition = exerciseEdition;
  const pkg = {readerDirectory: 'reader', files: {[path]: row.sha256}};
  const file = join(source, path);
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, bytes);
  const context = {source, edition, pkg, row, record, file, bytes};
  if (definition) {
    await saveDefinition(context);
    await approveDefinition(context);
  }
  return context;
}

async function saveDefinition(f) {
  await writeFile(join(f.source, 'exercise-downloads.json'), JSON.stringify(f.record));
}

async function approveDefinition(f) {
  f.pkg.files['exercise-downloads.json'] = digest(await readFile(join(f.source, 'exercise-downloads.json')));
}

async function addSecondArtifact(f) {
  const filename = 'exercise-notes.txt';
  const artifactVersion = f.record.exerciseEdition ?? f.record.version;
  const path = 'reader/editions/v' + artifactVersion + '/' + filename;
  const bytes = Buffer.from('Independent exercise notes.\n');
  await writeFile(join(f.source, path), bytes);
  f.record.downloads.push({label: 'Notes', filename,
    url: '/fixture-book/editions/v' + artifactVersion + '/' + filename,
    path, sha256: digest(bytes), bytes: bytes.length});
  f.pkg.files[path] = digest(bytes);
  await saveDefinition(f);
  await approveDefinition(f);
}

async function rejected(name, change, expected, options) {
  const f = await fixture(options);
  await change(f);
  await saveDefinition(f);
  // These original cases approve the altered definition to exercise its specific semantic/artifact guard.
  await approveDefinition(f);
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
  await addSecondArtifact(valid);
  const ordered = await exerciseDownloadLinks(valid.source, valid.edition, valid.pkg);
  assert.equal((ordered.match(/<a /g) || []).length, 2);
  assert.ok(ordered.indexOf('fixture-book-v2.4.0.fig') < ordered.indexOf('exercise-notes.txt'));
  assert.match(ordered, /download="exercise-notes\.txt">Notes<\/a>/);
  results.push('multiple independently pinned downloads preserve definition order');

  const explicitCurrent = await fixture({exerciseEdition: '2.4.0'});
  assert.equal(await exerciseDownloadLinks(explicitCurrent.source, explicitCurrent.edition, explicitCurrent.pkg), expected);
  results.push('explicit current exercise edition preserves legacy output exactly');

  const retainedOptions = {exerciseEdition: '2.3.9'};
  const retained = await fixture(retainedOptions);
  await addSecondArtifact(retained);
  const retainedRows = retained.record.downloads.map(row => ({...row}));
  const retainedFiles = await Promise.all(retainedRows.map(row => readFile(join(retained.source, row.path))));
  const retainedLinks = await exerciseDownloadLinks(retained.source, retained.edition, retained.pkg);
  assert.ok(retainedLinks.includes('href="/fixture-book/editions/v2.3.9/fixture-book-v2.3.9.fig"'));
  assert.ok(retainedLinks.includes('href="/fixture-book/editions/v2.3.9/exercise-notes.txt"'));
  assert.ok(!retainedLinks.includes('/editions/v2.4.0/'));
  assert.ok(retainedLinks.indexOf('fixture-book-v2.3.9.fig') < retainedLinks.indexOf('exercise-notes.txt'));
  for (const [i, row] of retainedRows.entries()) {
    assert.deepEqual(await readFile(join(retained.source, row.path)), retainedFiles[i]);
    assert.equal(retained.pkg.files[row.path], row.sha256);
  }
  results.push('approved older exercise routes render without relabeling or changing artifact bytes');

  // Numeric comparison must handle component boundaries rather than lexical order or Number rounding.
  const numericOlder = await fixture({exerciseEdition: '2.3.10'});
  assert.match(await exerciseDownloadLinks(numericOlder.source, numericOlder.edition, numericOlder.pkg), /editions\/v2[.]3[.]10\//);
  results.push('numeric older exercise edition is accepted');
  for (const value of [false, '', 0, null, '2.3', '02.3.9', '2.3.9-beta', '2.3.9/../private']) {
    await rejected('invalid explicit exercise edition ' + String(value), f => {f.record.exerciseEdition = value;}, /Invalid exercise edition/);
  }
  for (const value of ['2.4.1', '2.5.0', '3.0.0', '2.10.0', '9007199254740993.0.0']) {
    await rejected('future exercise edition ' + value, f => {f.record.exerciseEdition = value;}, /Exercise edition cannot follow/);
  }
  await rejected('explicit exercise edition requires valid current version', f => {
    f.edition.version = f.record.version = '2.4'; f.record.exerciseEdition = '2.3.9';
  }, /Invalid current exercise edition/);
  await rejected('future edition comparison preserves integer precision', f => {
    f.edition.version = f.record.version = '9007199254740992.0.0';
    f.record.exerciseEdition = '9007199254740993.0.0';
  }, /Exercise edition cannot follow/);
  await rejected('older exercise cannot change current definition identity', f => {f.record.version = '2.3.9';}, /Exercise edition mismatch/, retainedOptions);
  await rejected('retained routes require explicit exercise edition', f => {delete f.record.exerciseEdition;}, /Exercise route/, retainedOptions);
  await rejected('retained route must match selected exercise edition', f => {f.record.exerciseEdition = '2.2.0';}, /Exercise route/, retainedOptions);
  await rejected('retained exercise cannot use current-edition route', f => {f.row.url = f.row.url.replace('v2.3.9', 'v2.4.0');}, /Exercise route/, retainedOptions);
  await rejected('retained route cannot belong to another book', f => {f.row.url = f.row.url.replace('/fixture-book/', '/another-book/');}, /Exercise route/, retainedOptions);
  await rejected('retained exercise cannot use traversal route', f => {f.row.url = '/fixture-book/editions/v2.3.9/../private.fig';}, /Exercise route/, retainedOptions);
  await rejected('retained exercise cannot change artifact path', f => {f.row.path = 'reader/editions/v2.4.0/' + f.row.filename;}, /Exercise path mismatch/, retainedOptions);
  await rejected('retained exercise requires approved package pin', f => {delete f.pkg.files[f.row.path];}, /Unpinned exercise download/, retainedOptions);
  await rejected('retained exercise cannot change package pin', f => {f.pkg.files[f.row.path] = 'b'.repeat(64);}, /Unpinned exercise download/, retainedOptions);
  await rejected('retained exercise cannot change measured size', f => {f.row.bytes++;}, /Stale exercise size/, retainedOptions);
  await rejected('retained exercise cannot change exact bytes', async f => {
    const changed = Buffer.from(f.bytes); changed[0] ^= 1; await writeFile(f.file, changed);
  }, /Stale exercise hash/, retainedOptions);
  const changedSelection = await fixture(retainedOptions);
  changedSelection.record.exerciseEdition = '2.3.8';
  await saveDefinition(changedSelection); // Preserve the approved definition hash.
  await assert.rejects(() => exerciseDownloadLinks(changedSelection.source, changedSelection.edition, changedSelection.pkg), /Stale exercise definition hash/);
  results.push('exercise edition selection is bound by exact approved definition bytes');

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
  await approveDefinition(malformed);
  await assert.rejects(() => exerciseDownloadLinks(malformed.source, malformed.edition, malformed.pkg), SyntaxError);
  results.push('malformed definition fails instead of silently omitting download');

  // Package approval binds every raw definition byte, including label/order/row selection.
  for (const [name, change] of [
    ['relabel after approval', f => {f.record.downloads[0].label = 'Unapproved new label';}],
    ['reorder after approval', f => {f.record.downloads.reverse();}],
    ['row omission after approval', f => {f.record.downloads.pop();}],
  ]) {
    const f = await fixture();
    await addSecondArtifact(f);
    const approvedDefinition = f.pkg.files['exercise-downloads.json'];
    const artifactBytes = await Promise.all(f.record.downloads.map(row => readFile(join(f.source, row.path))));
    const artifactRows = f.record.downloads.map(row => ({...row}));
    change(f);
    await saveDefinition(f); // Keep the original approval; do not repin this mutation.
    assert.equal(f.pkg.files['exercise-downloads.json'], approvedDefinition);
    await assert.rejects(() => exerciseDownloadLinks(f.source, f.edition, f.pkg), /Stale exercise definition hash/, name);
    for (const [i, row] of artifactRows.entries()) {
      assert.deepEqual(await readFile(join(f.source, row.path)), artifactBytes[i]);
      assert.equal(f.pkg.files[row.path], row.sha256);
    }
    results.push(name + ' rejected with unchanged independently pinned artifacts');
  }

  for (const [name, change, expected] of [
    ['missing definition pin', f => {delete f.pkg.files['exercise-downloads.json'];}, /Unpinned exercise definition/],
    ['stale definition pin', f => {f.pkg.files['exercise-downloads.json'] = 'a'.repeat(64);}, /Stale exercise definition hash/],
    ['definition pin under another path', f => {f.pkg.files['reader/exercise-downloads.json'] = f.pkg.files['exercise-downloads.json']; delete f.pkg.files['exercise-downloads.json'];}, /Unpinned exercise definition/],
    ['deleted pinned definition', f => rm(join(f.source, 'exercise-downloads.json')), /Pinned exercise definition is missing/],
    ['directory instead of definition', async f => {const path = join(f.source, 'exercise-downloads.json'); await rm(path); await mkdir(path);}, /Exercise definition must be a regular local file/],
    ['definition file symlink with exact target bytes', async f => {const path = join(f.source, 'exercise-downloads.json'); const target = join(f.source, 'exact-definition.json'); await copyFile(path, target); await rm(path); await symlink(target, path);}, /Exercise definition must be a regular local file/],
    ['symlinked definition parent with exact bytes', async f => {const target = f.source + '-target'; await rename(f.source, target); await symlink(target, f.source, 'dir');}, /Exercise definition must be a regular local file/],
    ['unapproved malformed bytes rejected before parsing', f => writeFile(join(f.source, 'exercise-downloads.json'), '{unfinished'), /Stale exercise definition hash/],
  ]) {
    const f = await fixture();
    await change(f);
    await assert.rejects(() => exerciseDownloadLinks(f.source, f.edition, f.pkg), expected, name);
    results.push(name);
  }

  console.log(JSON.stringify({status: 'passed',cases: results.length,checks: results}, null, 2));
} finally {
  await rm(root, {recursive: true, force: true});
}
