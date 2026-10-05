import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {validateLedgerContract} from './validate-release.mjs';
const root=resolve(import.meta.dirname,'../..'),book=resolve(root,'claude-design');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const bytes=await readFile(resolve(book,'change-ledger.json')),ledger=JSON.parse(bytes);
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json')));
const decision=JSON.parse(await readFile(resolve(book,'changelog-decision.json')));
const pkg=JSON.parse(await readFile(resolve(book,'publication-package.json')));
const evidencePins={};for(const row of Object.values(ledger.comparisonEvidence))evidencePins[row.path]=sha(await readFile(resolve(root,row.path)));
const context={version:manifest.version,sourceSha256:sha(await readFile(resolve(book,'Claude_Design_Field_Guide_Source.md'))),previousSourceSha256:sha(await readFile(resolve(book,`baselines/v${manifest.previous_public_edition}/Claude_Design_Field_Guide_Source.md`))),changes:decision.expectedEntries,evidencePins,sampleSha256:pkg.files['reader/velori-store-0.2.0-mit-release.zip'],sampleBytes:(await stat(resolve(book,'reader/velori-store-0.2.0-mit-release.zip'))).size,packageSha256:sha(await readFile(resolve(book,'publication-package.json'))),verification:JSON.parse(await readFile(resolve(root,ledger.verificationRecord))),ledgerSha256:sha(bytes)};
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
console.log('Released ledger binds canonical source, tracked comparison, accepted grouping, exact sample/package and verification; nine stale/private regressions rejected.');
