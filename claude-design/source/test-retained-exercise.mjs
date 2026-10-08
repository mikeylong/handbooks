import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {explorationExerciseEdition,retainedExercisePaths,validateRetainedExplorationExercise} from './validate-retained-exercise.mjs';

const root=resolve(import.meta.dirname,'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const rows=retainedExercisePaths('2.1.1'),records={},retainedExercise={edition:'2.1.1'};
for(const [key,path] of Object.entries(rows)){
  const bytes=await readFile(resolve(root,path));
  const sha256=hash(bytes);records[key]={sha256,data:JSON.parse(bytes)};retainedExercise[key]={path,sha256};
}
const manifest=structuredClone(records.releaseManifest.data);
manifest.version='2.1.2';manifest.releaseContract.retainedExercise=retainedExercise;
assert.equal(explorationExerciseEdition(manifest),'2.1.1');
assert.equal(explorationExerciseEdition({version:'2.1.1',releaseContract:{}}),'2.1.1','Default behavior must retain own-edition requirements');
for(const [name,mutate] of [
  ['same-edition reuse',m=>m.releaseContract.retainedExercise.edition=m.version],
  ['future exercise',m=>m.releaseContract.retainedExercise.edition='2.1.3'],
  ['invalid semver',m=>m.releaseContract.retainedExercise.edition='2.01.1'],
  ['missing original approval',m=>delete m.releaseContract.retainedExercise.publicationApproval],
  ['private original package',m=>m.releaseContract.retainedExercise.publicationPackage.path='claude-design/review/package.json'],
  ['unbound original package',m=>delete m.releaseContract.retainedExercise.publicationPackage.sha256]
]){const m=structuredClone(manifest);mutate(m);assert.throws(()=>explorationExerciseEdition(m),undefined,name);}
const companionBytes=await readFile(resolve(root,'claude-design/baselines/v2.1.1/figma-companion.json'));
const archive=await readFile(resolve(root,manifest.releaseContract.sample.repositoryPath));
const context={records,companion:JSON.parse(companionBytes),companionSha256:hash(companionBytes),archiveSha256:hash(archive),archiveBytes:archive.length,downloads:{...structuredClone(records.exerciseDownloads.data),version:'2.1.2',exerciseEdition:'2.1.1'}};
validateRetainedExplorationExercise(manifest,context);
for(const [name,mutate,expected] of [
  ['stale original manifest',x=>x.context.records.releaseManifest.sha256='0'.repeat(64),/Stale retained/],
  ['unapproved original edition',x=>x.context.records.releaseManifest.data.approvalStatus='candidate',/approved edition/],
  ['relabeled original edition',x=>x.context.records.releaseManifest.data.version='2.1.2',/manifest edition/],
  ['nested reuse',x=>x.context.records.releaseManifest.data.releaseContract.retainedExercise={},/original artifact edition/],
  ['changed old sample URL',x=>x.manifest.releaseContract.sample.publicUrl='https://example.com/sample.zip',/Changed retained/],
  ['relabeled parity evidence',x=>x.manifest.releaseContract.companionParityEvidence.path='claude-design/qa/v2.1.2/companion-parity.json',/Changed retained/],
  ['changed old native proof',x=>x.manifest.releaseContract.nativeEvidence.roundtrip.sha256='0'.repeat(64),/Changed retained/],
  ['stale original package',x=>x.context.records.publicationPackage.sha256='0'.repeat(64),/Stale retained/],
  ['unapproved original package',x=>x.context.records.publicationApproval.data.publicationPackage.sha256='0'.repeat(64),/approved package/],
  ['unapproved original action',x=>x.context.records.publicationApproval.data.command='publish anything',/publication authority/],
  ['changed ZIP bytes',x=>x.context.archiveSha256='0'.repeat(64),/original approval/],
  ['changed ZIP size',x=>x.context.archiveBytes++,/archive size/],
  ['changed sidecar bytes',x=>x.context.companionSha256='0'.repeat(64),/sidecar bytes/],
  ['relabeled sidecar',x=>x.context.companion.handbookEdition='2.1.2',/original edition/],
  ['unbound download definition',x=>x.context.records.publicationPackage.data.files['exercise-downloads.json']='0'.repeat(64),/download definition/],
  ['missing explicit reuse',x=>delete x.context.downloads.exerciseEdition,/Explicit retained/],
  ['wrong explicit download edition',x=>x.context.downloads.exerciseEdition='2.0.0',/Explicit retained/],
  ['changed retained download row',x=>x.context.downloads.downloads[0].sha256='0'.repeat(64),/download rows/]
]){const x=structuredClone({manifest,context});mutate(x);assert.throws(()=>validateRetainedExplorationExercise(x.manifest,x.context),expected,name);}
console.log('PASS retained approved exercise identity and authority; wrong editions, relabeled evidence, changed bytes and stale approval/package/download pins fail.');
