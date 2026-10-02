import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {digest} from './reader-paths.mjs';
import {pairChapterArtwork, installArtworkPairs} from './artwork-pairs.mjs';

const light = 'reader/assets/chapter-01.png';
const dark = 'assets/chapter-art/dark/chapter-01.png';
const html = '<main id="main-content"><figure class="future-class" data-artwork-role="chapter"><img src="assets/chapter-01.png" alt="value > threshold"></figure><figure><img src="assets/diagram.png" alt="Diagram"></figure></main>';
const entry = {light, dark, darkDimensions:[1024,900]};
const paired = pairChapterArtwork(html,[entry],'https://handbooks.surfaces.systems/arbitrary-reader/','reader');
assert(paired.includes('srcset="/arbitrary-reader/assets/dark/chapter-01.png"'));
assert(paired.includes('data-artwork-paired="true"'));
assert(paired.includes('alt="value > threshold"'));
assert(paired.includes('<figure><img src="assets/diagram.png" alt="Diagram"></figure>'), 'Diagrams remain unmodified');
assert.equal((paired.match(/data-artwork-role=/g) ?? []).length,1);
const responsive = html.replace('<img src="assets/chapter-01.png"', '<picture><source media="(max-width:42rem)" srcset="small.webp"><img src="assets/chapter-01.png"').replace('alt="value > threshold"></figure>','alt="value > threshold"></picture></figure>');
assert(pairChapterArtwork(responsive,[entry],'https://handbooks.surfaces.systems/arbitrary-reader/','reader').includes('width="1024" height="900"><source media="(max-width:42rem)"'), 'Keep original responsive light source after dark source');
assert.throws(()=>pairChapterArtwork(html,[],'https://handbooks.surfaces.systems/arbitrary-reader/','reader'), /lacks an authored/);
assert.throws(()=>pairChapterArtwork(html,[entry,{...entry,light:'reader/assets/other.png'}],'https://handbooks.surfaces.systems/arbitrary-reader/','reader'), /unused/);

const temp = await realpath(await mkdtemp(join(tmpdir(),'handbook-artwork-pairs-')));
try {
  const source=join(temp,'book'),output=join(temp,'site');
  await mkdir(join(source,'reader/assets'),{recursive:true});
  await mkdir(join(source,'assets/chapter-art/dark'),{recursive:true});
  // Minimal PNG header fixture. Real build candidates are decoded during browser QA.
  const png=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(1024,16);png.writeUInt32BE(900,20);png[25]=6;
  await writeFile(join(source,light),'frozen light');await writeFile(join(source,dark),png);
  const pair={...entry,lightSha256:digest(Buffer.from('frozen light')),darkSha256:digest(png),acquisitionMode:'generated',generator:'image_gen',prompt:'Draw the same scene for dark viewing.',styleReferenceSha256:'a'.repeat(64),outerBackground:'transparent',reviewStatus:'accepted'};
  const manifest={schemaVersion:1,book:'future-reader',artwork:[pair]};
  const pkg={readerDirectory:'reader',files:{[light]:pair.lightSha256}};
  const save=()=>writeFile(join(source,'artwork-pairs.json'),JSON.stringify(manifest));
  await save();
  assert((await installArtworkPairs(source,{id:'future-reader'},output,html,pkg)).includes('data-dark-artwork'));
  assert.equal(digest(await readFile(join(output,'future-reader/assets/dark/chapter-01.png'))),pair.darkSha256);
  for(const [name,change] of [
    ['stale dark hash',()=>pair.darkSha256='b'.repeat(64)],
    ['changed approved light hash',()=>pair.lightSha256='b'.repeat(64)],
    ['missing provenance',()=>pair.prompt=''],
    ['unreviewed art',()=>pair.reviewStatus='pending'],
    ['wrong dimensions',()=>pair.darkDimensions=[1000,900]],
    ['opaque outer background',()=>pair.outerBackground='opaque'],
    ['duplicate light',()=>manifest.artwork.push({...pair})],
    ['empty manifest',()=>manifest.artwork=[]],
    ['colliding nested filename',()=>pair.dark='assets/chapter-art/dark/nested/chapter-01.png'],
    ['unsafe dark path',()=>pair.dark='assets/chapter-art/dark/../../escape.png'],
  ]) {
    const before=JSON.stringify(manifest);change();await save();
    await assert.rejects(()=>installArtworkPairs(source,{id:'future-reader'},output,html,pkg),undefined,name);
    const restored=JSON.parse(before);Object.assign(pair,restored.artwork[0]);manifest.artwork=[pair];
  }
  await rm(join(source,'artwork-pairs.json'));
  await assert.rejects(()=>installArtworkPairs(source,{id:'future-reader'},output,html,pkg), /requires artwork-pairs/);
} finally {await rm(temp,{recursive:true,force:true});}
console.log('Authored dark pairs passed: future-reader coverage, original light preservation, responsive sources, provenance, hashes, and failure cases.');
