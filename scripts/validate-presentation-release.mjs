/** Validate a presentation repair against exact retained baseline and release evidence. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {safePath,digest} from '../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
const root=resolve(import.meta.dirname,'..'),id=process.argv[2],book=resolve(root,id);
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const manifest=await read(resolve(book,'release-manifest.json'));
assert.equal(manifest.releaseValidationKind,'presentation-exact-artifact');
assert.equal(manifest.publicationApproval.kind,'explicit-user-release');
assert.equal(manifest.publicationApproval.version,manifest.version);
assert.equal(manifest.publicationApproval.daytimeSha256,manifest.sha256);
assert.equal(manifest.presentationRepair.policy,'mandatory-title-only-v1');
assert.equal(manifest.readerFacingContentChanged,false);
async function bound(ref){assert.ok(ref?.path&&ref?.sha256);const bytes=await readFile(safePath(book,ref.path));assert.equal(digest(bytes),ref.sha256,ref.path);return JSON.parse(bytes);}
const baseline=await bound(manifest.baseline.manifest);
assert.equal(baseline.sha256,manifest.baseline.sha256);assert.equal(digest(await readFile(safePath(book,manifest.baseline.pdf))),baseline.sha256);
const evidence={};for(const [key,ref] of Object.entries(manifest.candidateEvidence))evidence[key]=await bound(ref);
assert.equal(evidence.editionDiff.previous.pdfSha256,baseline.sha256);
assert.equal(evidence.editionDiff.candidate.pdfSha256,manifest.sha256);
assert.equal(evidence.changelogDecision.status,'passed');assert.equal(evidence.changelogDecision.includeChangelog,false);
const source=await bound(manifest.presentationRepair.sourceProof);
assert.equal(source.status,'passed');assert.equal(source.substantiveManuscriptChanged,false);
assert.equal(digest(await readFile(safePath(book,source.source))),source.candidateSha256);
assert.equal(evidence.parity.status,'passed');assert.equal(evidence.parity.retainedSha256,manifest.sha256);
assert.equal(evidence.parity.candidateSha256,manifest.appearances.dark.sha256);assert.equal(evidence.appearanceAudit.status,'passed');
const proof=await bound(manifest.presentationRepair.releaseProof);
assert.equal(proof.visualReview,'passed');assert.equal(proof.browser.status,'passed');
assert.equal(proof.browser.packageSha256,digest(await readFile(resolve(book,'publication-package.json'))));
assert.equal(proof.browser.toolkitArchiveSha256,manifest.generationToolkitArchive.sha256);
const headings=await bound(manifest.presentationRepair.headingProof);assert.equal(headings.status,'passed');assert.equal(headings.policy,'mandatory-title-only-v1');
assert.equal(headings.pdfs.length,2);
for(const theme of ['light','dark'])assert.ok(headings.pdfs.some(p=>p.sha256===manifest.appearances[theme].sha256));
assert.ok(proof.browser.downloads.some(d=>d.sha256===headings.markdown.sha256));
for(const theme of ['light','dark']){
 const variant=manifest.appearances[theme],validation=evidence[theme+'Validation'],map=await bound(manifest.pageMaps[theme]);
 assert.equal(validation.status,'passed');assert.deepEqual(validation.failures??[],[]);assert.equal(validation.artifactSha256,variant.sha256);
 assert.equal(digest(await readFile(safePath(book,variant.pdf))),variant.sha256);assert.equal(map.sha256,variant.sha256);assert.equal(map.pages.length,variant.pages);
 const cover=execFileSync('pdftotext',['-f','1','-l','1',safePath(book,variant.pdf),'-'],{encoding:'utf8'});assert.match(cover,new RegExp('Version\\s+'+manifest.version.replaceAll('.','\\.')+'(?:\\s|$)'));
 const rendered=proof.crossRenderer.find(r=>r.theme===theme);assert.equal(rendered.sha256,variant.sha256);assert.equal(rendered.pages,variant.pages);assert.deepEqual(rendered.renderers,['poppler','pdfkit']);assert.equal(rendered.status,'passed');
 assert.ok(proof.browser.downloads.some(d=>d.sha256===variant.sha256));
}
for(const flag of ['vm_deleted','runtime_deleted','evidence_complete','evidence_verified'])assert.equal(proof.browser.lifecycle[flag],true);
assert.equal(proof.browser.version,manifest.version);
const browser=await bound(proof.browser.report);assert.equal(browser.status,'passed');assert.equal(browser.identity.version,manifest.version);
assert.equal(digest(await readFile(safePath(root,manifest.generationToolkitArchive.collectionPath))),manifest.generationToolkitArchive.sha256);
console.log('Validated exact presentation release '+id+' '+manifest.version+' with preserved baseline, source scope, paired PDFs, visual and browser evidence.');
