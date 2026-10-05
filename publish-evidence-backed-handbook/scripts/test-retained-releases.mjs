import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {digest} from './reader-paths.mjs';
import {installRetainedReleases} from './retained-releases.mjs';
const scratch = await mkdtemp(resolve(tmpdir(), 'handbook-retention-'));
try {
  const source = resolve(scratch, 'collection'), output = resolve(scratch, 'site');
  await mkdir(source); await mkdir(output);
  const paths = ['book/editions/v1.0.0/index.html', 'book/editions/v1.0.0/book.md', 'book/editions/v1.0.0/book.index.json', 'book/old.pdf', 'book/exercise.zip'];
  const inventory = {schemaVersion: 1, routes: []};
  for (const [i, path] of paths.entries()) {
    const bytes = Buffer.from('released content ' + i), name = 'frozen-' + i;
    await writeFile(resolve(source, name), bytes);
    inventory.routes.push({url: '/' + path, source: name, sha256: digest(bytes)});
  }
  await mkdir(resolve(output, 'book/editions/v2.0.0'), {recursive: true});
  await writeFile(resolve(output, 'book/editions/v2.0.0/index.html'), 'new edition');
  await installRetainedReleases(source, output, inventory);
  for (const r of inventory.routes) assert.equal(digest(await readFile(resolve(output, r.url.slice(1)))), r.sha256);
  assert.equal(await readFile(resolve(output, 'book/editions/v2.0.0/index.html'), 'utf8'), 'new edition');
  await installRetainedReleases(source, output, inventory);
  const bad = structuredClone(inventory); bad.routes[0].sha256 = '0'.repeat(64);
  await assert.rejects(installRetainedReleases(source, output, bad), /Retained artifact changed/);
  const duplicate = structuredClone(inventory); duplicate.routes.push(duplicate.routes[0]);
  await assert.rejects(installRetainedReleases(source, output, duplicate), /Duplicate retained route/);
  for (const url of ['/../owner.json', '/book/private.js', 'https://other/book.pdf']) {
    const invalid = structuredClone(inventory); invalid.routes[0].url = url;
    await assert.rejects(installRetainedReleases(source, output, invalid), /Unsafe retained route/);
  }
  const outside = resolve(scratch, 'owner.pdf'); await writeFile(outside, 'owner state');
  await symlink(outside, resolve(source, 'escape.pdf'));
  const escape = structuredClone(inventory); escape.routes[0].source = 'escape.pdf';
  await assert.rejects(installRetainedReleases(source, output, escape), /Unsafe retained source/);
  await writeFile(resolve(output, paths[1]), 'regenerated historical content');
  await assert.rejects(installRetainedReleases(source, output, inventory), /Retained route conflicts/);
  assert.equal(await readFile(resolve(output, paths[1]), 'utf8'), 'regenerated historical content');
  console.log('Retained HTML, Markdown, index, PDF and ZIP survive new editions; stale hashes, collisions, duplicates and escapes fail.');
} finally { await rm(scratch, {recursive: true, force: true}); }
