import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {resolveReleaseContract,validateLedgerContract,validateFigmaCompanionContract,validateDownloadContract,validateExerciseReuseContract} from './validate-release.mjs';
const root=[import.meta.dirname,...Array.from({length:10},(_,i)=>resolve(import.meta.dirname,...Array(i+1).fill('..')))].find(path=>existsSync(resolve(path,'catalog.json'))&&existsSync(resolve(path,'site/scripts/book-sources.mjs')));
assert.ok(root,'Run this regression within a handbooks collection');
const book=resolve(root,'claude-design'),baseline=resolve(book,'baselines/v1.2.0');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
// Exercise the preserved approved edition even while a successor is being prepared.
const bytes=await readFile(resolve(baseline,'change-ledger.json')),ledger=JSON.parse(bytes);
const manifest=JSON.parse(await readFile(resolve(baseline,'release-manifest.json')));
const decision=JSON.parse(await readFile(resolve(baseline,'changelog-decision.json')));
const pkg=JSON.parse(await readFile(resolve(baseline,'publication-package.json')));
const evidencePins={};for(const row of Object.values(ledger.comparisonEvidence))evidencePins[row.path]=sha(await readFile(row.path==='claude-design/changelog-decision.json'?resolve(baseline,'changelog-decision.json'):resolve(root,row.path)));
const context={version:manifest.version,sourceSha256:sha(await readFile(resolve(baseline,'Claude_Design_Field_Guide_Source.md'))),previousSourceSha256:sha(await readFile(resolve(book,`baselines/v${manifest.previous_public_edition}/Claude_Design_Field_Guide_Source.md`))),changes:decision.expectedEntries,evidencePins,sampleSha256:pkg.files['reader/velori-store-0.2.0-mit-release.zip'],sampleBytes:(await stat(resolve(book,'reader/velori-store-0.2.0-mit-release.zip'))).size,packageSha256:sha(await readFile(resolve(baseline,'publication-package.json'))),verification:JSON.parse(await readFile(resolve(root,ledger.verificationRecord))),ledgerSha256:sha(bytes)};
validateLedgerContract(ledger,context);
const cases=[
 ['stale source',copy=>copy.sourceSnapshot.sha256='0'.repeat(64),/Stale ledger source/],
 ['private source',copy=>copy.sourceSnapshot.canonicalPath='claude-design/review/draft.md',/canonical manuscript/],
 ['private comparison',copy=>copy.comparisonEvidence.exactPdfTextPatch.path='claude-design/review/exact-pdf-text.patch',/tracked with this edition/],
 ['stale evidence',copy=>copy.comparisonEvidence.exactSourcePatch.sha256='0'.repeat(64),/Stale ledger comparison/],
 ['missing source comparison',copy=>delete copy.comparisonEvidence.exactSourcePatch,/Tracked source comparison/],
 ['stale sample',copy=>copy.sampleRelease.sha256='0'.repeat(64),/Stale ledger sample/],
 ['stale package',copy=>copy.sampleRelease.publicationPackage.sha256='0'.repeat(64),/Stale ledger package/],
 ['changed accepted group',copy=>copy.changes[0].rationale='Unaccepted rationale',/accepted changelog groups/]
];
for(const [name,mutate,expected] of cases){const copy=structuredClone(ledger);mutate(copy);assert.throws(()=>validateLedgerContract(copy,context),expected,name);}
const staleProof=structuredClone(context);staleProof.verification.ledger.sha256='0'.repeat(64);assert.throws(()=>validateLedgerContract(ledger,staleProof),/Stale ledger verification/);

// The new contract is explicit and version-scoped; synthetic acceptance is test data only.
const version='1.2.1',releaseContract={classifiedChangeIds:['F01'],sample:{publicUrl:'https://handbooks.surfaces.systems/claude-design/editions/v1.2.1/velori-store-0.2.1-mit-release.zip',repositoryPath:'claude-design/reader/editions/v1.2.1/velori-store-0.2.1-mit-release.zip'}};
assert.deepEqual(resolveReleaseContract({version,releaseContract}),releaseContract);
assert.throws(()=>resolveReleaseContract({version}),/explicit release contract/);
for(const [name,mutate,expected] of [
 ['wrong edition URL',x=>x.sample.publicUrl=x.sample.publicUrl.replace('v1.2.1','v1.2.0'),/exact edition/],
 ['private sample path',x=>x.sample.repositoryPath='claude-design/review/sample.zip',/exact edition URL/],
 ['unsafe sample URL',x=>x.sample.publicUrl=x.sample.publicUrl.replace('velori-store-0.2.1-mit-release.zip','%2e%2e/private.zip'),/exact edition/],
 ['wrong host',x=>x.sample.publicUrl=x.sample.publicUrl.replace('handbooks.surfaces.systems','example.com'),/public handbook host/],
 ['duplicate classification',x=>x.classifiedChangeIds.push('F01'),/Duplicate classified/]
]){const copy=structuredClone(releaseContract);mutate(copy);assert.throws(()=>resolveReleaseContract({version,releaseContract:copy}),expected,name);}
const newLedger=structuredClone(ledger);newLedger.proposedVersion=version;newLedger.changes=[{id:'F01',category:'Correction or clarification',text:'Import your own Figma file.',rationale:'The exercise no longer requires author-file access.',sources:[releaseContract.sample.publicUrl],groupedDraftEntries:['F01']}];
newLedger.comparisonEvidence={exactSourcePatch:{path:'claude-design/qa/v1.2.1/exact-source.patch',sha256:'1'.repeat(64)},acceptedChangelogDecision:{path:'claude-design/changelog-decision.json',sha256:'2'.repeat(64)}};
newLedger.sampleRelease={...newLedger.sampleRelease,...releaseContract.sample};newLedger.verificationRecord='claude-design/qa/v1.2.1/change-ledger-verification.json';
const newContext={...structuredClone(context),version,releaseContract,changes:structuredClone(newLedger.changes),evidencePins:Object.fromEntries(Object.values(newLedger.comparisonEvidence).map(row=>[row.path,row.sha256]))};
newContext.verification={status:'passed',ledger:{sha256:newContext.ledgerSha256},sourceSnapshot:structuredClone(newLedger.sourceSnapshot),sampleRelease:structuredClone(newLedger.sampleRelease),comparisonEvidence:structuredClone(newLedger.comparisonEvidence)};
validateLedgerContract(newLedger,newContext);
for(const [name,mutate,expected] of [
 ['new stale canonical source',x=>x.sourceSnapshot.sha256='0'.repeat(64),/Stale ledger source/],
 ['private new comparison',x=>x.comparisonEvidence.exactSourcePatch.path='claude-design/review/private.patch',/Tracked source comparison/],
 ['wrong edition comparison',x=>x.comparisonEvidence.exactSourcePatch.path='claude-design/qa/v1.2.0/exact-source.patch',/Tracked source comparison/],
 ['new wrong sample URL',x=>x.sampleRelease.publicUrl=ledger.sampleRelease.publicUrl,/sample URL/]
]){const copy=structuredClone(newLedger);mutate(copy);assert.throws(()=>validateLedgerContract(copy,newContext),expected,name);}
for(const ids of [[],['F01','F01'],['F02']]){const copy=structuredClone(newLedger),ctx=structuredClone(newContext);copy.changes[0].groupedDraftEntries=ids;ctx.changes=structuredClone(copy.changes);assert.throws(()=>validateLedgerContract(copy,ctx),/Every classified change/,JSON.stringify(ids));}

const companion=JSON.parse(await readFile(resolve(book,'baselines/v1.2.1/figma-companion.json')));
const imported=structuredClone(companion);imported.verification.status='passed';imported.verification.dependencyClosure={status:'passed',trackedReceipt:'qa/v1.2.1/figma-import-verification.json',receiptSha256:'3'.repeat(64)};
const figContext={version,artifactSha256:companion.artifact.sha256,artifactBytes:companion.artifact.bytes,companionSha256:'4'.repeat(64),sidecarSha256:'4'.repeat(64),qaSha256:'3'.repeat(64),qa:{schemaVersion:1,status:'passed',version,artifact:{sha256:companion.artifact.sha256,bytes:companion.artifact.bytes},freshImport:{status:'passed',destination:'Drafts',presentChecks:companion.verification.freshImport.presentChecks},dependencyClosure:{status:'passed',unresolvedRequiredDependencies:0}}};
validateFigmaCompanionContract(imported,figContext);
for(const [name,mutate,expected] of [
 ['stale Figma bytes',x=>x.artifact.sha256='0'.repeat(64),/Stale Figma artifact/],
 ['wrong Figma edition',x=>x.artifact.route=x.artifact.route.replace('v1.2.1','v1.2.0'),/exact edition route/],
 ['failed native import',x=>x.verification.freshImport.status='failed',/Fresh Figma import/],
 ['pending closure',x=>x.verification.dependencyClosure.status='pending',/dependency closure/],
 ['private-only import proof',x=>x.verification.dependencyClosure.trackedReceipt='review/private.json',/edition-local and tracked/],
 ['stale import proof',x=>x.verification.dependencyClosure.receiptSha256='0'.repeat(64),/Stale Figma import evidence/]
]){const copy=structuredClone(imported);mutate(copy);assert.throws(()=>validateFigmaCompanionContract(copy,figContext),expected,name);}
for(const [name,mutate,expected] of [
 ['changed public sidecar',x=>x.sidecarSha256='0'.repeat(64),/sidecar differs/],
 ['failed QA import',x=>x.qa.freshImport.status='failed',/native import failed/],
 ['unresolved external dependency',x=>x.qa.dependencyClosure.unresolvedRequiredDependencies=1,/Unresolved Figma dependencies/],
 ['wrong QA artifact',x=>x.qa.artifact.sha256='0'.repeat(64),/QA artifact mismatch/]
]){const copy=structuredClone(figContext);mutate(copy);assert.throws(()=>validateFigmaCompanionContract(imported,copy),expected,name);}
const figPath='reader/editions/v1.2.1/velori-design-system-configurator.fig',zipPath='reader/editions/v1.2.1/velori-store-0.2.1-mit-release.zip';
const reader=`<a href="${releaseContract.sample.publicUrl}">Sample</a><a href="/claude-design/editions/v1.2.1/velori-design-system-configurator.fig">Figma</a>`;
const downloadPins={[figPath]:companion.artifact.sha256,[zipPath]:newLedger.sampleRelease.sha256};
validateDownloadContract(reader,downloadPins,{version,releaseContract});
assert.throws(()=>validateDownloadContract(reader,{[zipPath]:newLedger.sampleRelease.sha256},{version,releaseContract}),/Unpinned sample download.*\.fig/,'Figma link without pinned bytes');
assert.throws(()=>validateDownloadContract(reader.replace('v1.2.1/velori-design','v1.2.0/velori-design'),{...downloadPins,'reader/editions/v1.2.0/velori-design-system-configurator.fig':companion.artifact.sha256},{version,releaseContract}),/Current edition Figma link/,'A pinned old Figma link cannot replace current companion');
assert.throws(()=>validateDownloadContract(reader.replace(/<a href="https[^>]+>Sample<\/a>/,''),downloadPins,{version,releaseContract}),/Current edition sample link/,'The current sample must be linked');
console.log('Preserved v1.2.0 ledger passed its nine stale/private regressions; explicit successor contract, change coverage, Figma byte pins and import proof passed focused positive/negative fixtures. Synthetic import acceptance is test data, not release evidence.');

// Screenshot editions may reuse immutable approved exercise artifacts; native proof
// must retain its original edition and hashes rather than being relabeled.
const reuseVersion='1.3.0',reuseEdition='1.2.1',reuseBaseline=resolve(book,'baselines/v'+reuseEdition);
const reuseContract={classifiedChangeIds:['S01'],exerciseArtifactEdition:reuseEdition,exerciseArtifactApproval:{},sample:structuredClone(releaseContract.sample)};
const reuseRecords={};
for(const [key,path] of Object.entries({releaseManifest:`claude-design/baselines/v${reuseEdition}/release-manifest.json`,publicationPackage:`claude-design/baselines/v${reuseEdition}/publication-package.json`,figmaCompanion:`claude-design/baselines/v${reuseEdition}/figma-companion.json`,figmaImportVerification:`claude-design/qa/v${reuseEdition}/figma-import-verification.json`})){
 const b=await readFile(resolve(root,path));reuseContract.exerciseArtifactApproval[key]={path,sha256:sha(b)};reuseRecords[key]={sha256:sha(b),data:JSON.parse(b)};
}
const reuseContext={version:reuseVersion,records:reuseRecords,files:structuredClone(reuseRecords.publicationPackage.data.files),companionSha256:reuseRecords.figmaCompanion.sha256,qaSha256:reuseRecords.figmaImportVerification.sha256};
assert.equal(validateExerciseReuseContract(reuseContract,reuseContext),reuseEdition);
validateDownloadContract(reader,reuseContext.files,{version:reuseVersion,releaseContract:reuseContract});
assert.throws(()=>resolveReleaseContract({version:reuseVersion,releaseContract:{...reuseContract,exerciseArtifactApproval:undefined}}),/approved exercise binding/);
assert.throws(()=>resolveReleaseContract({version:reuseVersion,releaseContract:{...reuseContract,exerciseArtifactEdition:'1.3.0'}}),/must precede/);
for(const [name,mutate,expected] of [
 ['unapproved exercise',x=>x.records.releaseManifest.data.approvalStatus='candidate',/must be approved/],
 ['wrong approved edition',x=>x.records.releaseManifest.data.version='1.2.0',/approval edition mismatch/],
 ['changed exercise bytes',x=>x.files[zipPath]='0'.repeat(64),/differs from approved package/],
 ['changed native file',x=>x.files[figPath]='0'.repeat(64),/differs from approved package/],
 ['relabeled native proof',x=>x.records.figmaImportVerification.data.version=reuseVersion,/native proof edition mismatch/],
 ['changed original evidence',x=>x.records.figmaImportVerification.sha256='0'.repeat(64),/evidence hash mismatch/],
 ['changed companion metadata',x=>x.companionSha256='0'.repeat(64),/companion manifest changed/]
]){const x=structuredClone(reuseContext);mutate(x);assert.throws(()=>validateExerciseReuseContract(reuseContract,x),expected,name);}
const wrongReuse=structuredClone(reuseContract);wrongReuse.exerciseArtifactApproval.releaseManifest.path='claude-design/review/private.json';assert.throws(()=>resolveReleaseContract({version:reuseVersion,releaseContract:wrongReuse}),/bind the approved edition/);
const changedReuse=structuredClone(reuseContract);changedReuse.sample.publicUrl=changedReuse.sample.publicUrl.replace('0.2.1','0.2.2');changedReuse.sample.repositoryPath=changedReuse.sample.repositoryPath.replace('0.2.1','0.2.2');assert.throws(()=>validateExerciseReuseContract(changedReuse,reuseContext),/match approved release contract/);
console.log('Immutable exercise reuse keeps the original native proof/version; unapproved editions, changed artifacts, mismatched approvals and relabeled evidence fail.');

for(const exerciseArtifactEdition of [false,'',0,null,undefined]){const x={...reuseContract,exerciseArtifactEdition};assert.throws(()=>resolveReleaseContract({version:reuseVersion,releaseContract:x}),/Invalid exercise artifact edition/,'Reject supplied falsy artifact edition '+String(exerciseArtifactEdition));}
