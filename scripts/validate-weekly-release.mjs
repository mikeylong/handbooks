import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {safePath,digest} from '../publish-evidence-backed-handbook/scripts/reader-paths.mjs';

const root=resolve(import.meta.dirname,'..'),id=process.argv[2];
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const catalog=await read(resolve(root,'catalog.json'));
const pin=catalog.books.find(b=>b.id===id&&b.status==='published');assert.ok(pin,'Published handbook required');
const book=safePath(root,pin.directory),manifest=await read(resolve(book,'release-manifest.json'));
assert.equal(manifest.releaseValidationKind,'weekly-exact-artifact');
assert.equal(manifest.publicationApproved,true);assert.equal(manifest.approvalStatus,'approved');
assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
assert.equal(manifest.publicationApproval.kind,'explicit-user-release');
assert.equal(manifest.publicationApproval.daytimeSha256,manifest.sha256);
assert.equal(manifest.publicationApproval.version,manifest.version);
assert.equal(digest(await readFile(safePath(root,manifest.generationToolkitArchive.collectionPath))),manifest.generationToolkitArchive.sha256,'Frozen generation runtime changed');
async function bound(ref){
 assert.ok(ref?.path&&ref?.sha256,'Bound evidence required');
 const bytes=await readFile(safePath(book,ref.path));assert.equal(digest(bytes),ref.sha256,'Evidence hash changed: '+ref.path);
 return JSON.parse(bytes);
}
const evidence={};for(const [name,ref] of Object.entries(manifest.candidateEvidence)){
 const bytes=await readFile(safePath(book,ref.path));assert.equal(digest(bytes),ref.sha256,'Evidence changed: '+name);
 if(ref.path.endsWith('.json'))evidence[name]=JSON.parse(bytes);
}
const diff=evidence.editionDiff,decision=evidence.changelogDecision;
assert.equal(diff.candidate.pdfSha256,manifest.sha256);assert.equal(diff.candidate.pages,manifest.pages);
assert.equal(diff.previous.pdfSha256,manifest.baseline.sha256);assert.equal(diff.readerFacingContentChanged,true);
assert.equal(digest(await readFile(safePath(book,pin.source))),diff.sourceSha256.candidate,'Released manuscript differs from exact comparison');
assert.equal(decision.status,'passed');assert.equal(decision.includeChangelog,true);assert.equal(decision.readerFacingContentChanged,true);
assert.equal(digest(await readFile(safePath(book,manifest.baseline.pdf))),manifest.baseline.sha256,'Approved previous PDF changed');
await bound(manifest.baseline.manifest);
if(manifest.evidenceMode!=='production')assert.deepEqual(evidence.changes.changes,decision.expectedEntries);
for(const theme of ['light','dark']){
 const variant=manifest.appearances[theme],validation=evidence[theme+'Validation'];
 assert.equal(validation.status,'passed');assert.deepEqual(validation.failures??[],[]);
 assert.equal(validation.artifactSha256,variant.sha256);assert.equal(validation.stats?.pages??validation.pages,variant.pages);
 const map=await bound(manifest.pageMaps[theme]);assert.equal(map.sha256,variant.sha256);assert.equal(map.pages.length,variant.pages);
 const pdf=safePath(book,variant.pdf);assert.equal(digest(await readFile(pdf)),variant.sha256);
 const text=execFileSync('pdftotext',['-f','1','-l','1',pdf,'-'],{encoding:'utf8'});
 assert.match(text,new RegExp('Version\\s+'+manifest.version.replaceAll('.','\\.')+'(?:\\s|$)'));
 assert.ok(!text.includes('-candidate'),'Stable cover required');
}
assert.equal(evidence.parity.status,'passed');assert.equal(evidence.parity.retainedSha256,manifest.sha256);
assert.equal(evidence.parity.candidateSha256,manifest.appearances.dark.sha256);
assert.equal(evidence.appearanceAudit.status,'passed');
const proof=await read(resolve(book,'qa/v'+manifest.version+'/release-proof.json'));
for(const theme of ['light','dark']){
 const artifact=proof.crossRenderer.find(a=>a.theme===theme);assert.equal(artifact.sha256,manifest.appearances[theme].sha256);assert.equal(artifact.status,'passed');
 assert.equal(artifact.pages,manifest.pages);assert.deepEqual(artifact.renderers,['poppler','pdfkit']);
}
assert.equal(proof.visualReview,'passed');assert.equal(proof.browser.status,'passed');
assert.equal(proof.browser.version,manifest.version);assert.equal(proof.browser.daytimeSha256,manifest.sha256);
assert.equal(proof.browser.lateNightSha256,manifest.appearances.dark.sha256);
const browserReport=await bound(proof.browser.report);
assert.equal(browserReport.status,'passed');assert.equal(browserReport.identity.version,manifest.version);
for(const theme of ['light','dark'])assert.ok(browserReport.downloads.some(d=>d.sha256===manifest.appearances[theme].sha256),'Browser did not save the exact '+theme+' artifact');
for(const field of ['vm_deleted','runtime_deleted','evidence_complete','evidence_verified'])assert.equal(proof.browser.lifecycle[field],true);
console.log('Validated weekly release '+id+' '+manifest.version+': manuscript, baseline, exact PDFs, maps, decisions, paired appearances, both renderers and managed browser proof.');
