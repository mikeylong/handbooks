import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
const root=[import.meta.dirname,...Array.from({length:10},(_,i)=>resolve(import.meta.dirname,...Array(i+1).fill('..')))].find(path=>existsSync(resolve(path,'catalog.json'))&&existsSync(resolve(path,'site/scripts/book-sources.mjs')));
assert.ok(root,'Run this adapter within a handbooks collection');
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT||resolve(root,'publish-evidence-backed-handbook');
const {digest,safePath}=await import(pathToFileURL(resolve(toolkit,'scripts/reader-paths.mjs')));
const {resolvePdfVariants}=await import(pathToFileURL(resolve(toolkit,'scripts/pdf-downloads.mjs')));
const {validateLibrary,validatePackage,APPROVAL_REGISTRY}=await import(pathToFileURL(resolve(root,'site/scripts/book-sources.mjs')));

export function validateContentContract(text,html,version,{candidate=false}={}){
 assert.doesNotMatch(text,/The October 2 review exercised|local handoff inspection passed/i);
 assert.doesNotMatch(html,/The October 2 review exercised|local handoff inspection passed/i);
 if(/^1\.[01]\./.test(version)){
  assert.match(text,/npm ci --ignore-scripts/);assert.match(text,/Move between the applications/);
  assert.ok(html.includes('claude-design-v'+version+'-local-exercise.zip'));
 }else{
  assert.match(text,/Velori/);assert.match(text,/handoff\/new-run\//);
  assert.match(text,/source conformance/i);assert.doesNotMatch(text,/npm run validate:handoff/);
  assert.match(html,/velori-store-[\d.]+-mit-(?:release|candidate)\.zip/);
 }
 if(!candidate)assert.doesNotMatch(html,/Publication has not been approved/);
}

export function validateLedgerContract(ledger,{version,sourceSha256,previousSourceSha256,changes,evidencePins,sampleSha256,sampleBytes,packageSha256,verification,ledgerSha256}){
 assert.equal(ledger.accepted,true,'Release ledger must be accepted');
 assert.equal(ledger.version??ledger.proposedVersion,version,'Ledger edition mismatch');
 assert.equal(ledger.sourceSnapshot?.canonicalPath,'claude-design/Claude_Design_Field_Guide_Source.md','Ledger must bind the canonical manuscript');
 assert.equal(ledger.sourceSnapshot.sha256,sourceSha256,'Stale ledger source hash');
 assert.equal(ledger.sourceSnapshot.previousSourceSha256,previousSourceSha256,'Stale previous source hash');
 assert.deepEqual(ledger.changes,changes,'Ledger differs from accepted changelog groups');
 assert.deepEqual(ledger.changes.flatMap(row=>row.groupedDraftEntries).sort(),['C01','C02','C03','C04','C05','C06','C07','C08'],'Every classified change must occur once');
 const evidence=Object.values(ledger.comparisonEvidence||{});
 assert.ok(evidence.some(row=>row.path===`claude-design/qa/v${version}/exact-source.patch`),'Tracked source comparison required');
 assert.ok(evidence.some(row=>row.path==='claude-design/changelog-decision.json'),'Accepted changelog evidence required');
 for(const row of evidence){
  assert.ok(row?.path&&(row.path.startsWith(`claude-design/qa/v${version}/`)||row.path==='claude-design/changelog-decision.json'),'Release evidence must be tracked with this edition');
  assert.equal(row.sha256,evidencePins[row.path],'Stale ledger comparison evidence');
 }
 assert.equal(ledger.sampleRelease?.publicUrl,'https://handbooks.surfaces.systems/claude-design/velori-store-0.2.0-mit-release.zip');
 assert.equal(ledger.sampleRelease.repositoryPath,'claude-design/reader/velori-store-0.2.0-mit-release.zip');
 assert.equal(ledger.sampleRelease.sha256,sampleSha256,'Stale ledger sample hash');
 assert.equal(ledger.sampleRelease.bytes,sampleBytes,'Stale ledger sample size');
 assert.equal(ledger.sampleRelease.publicationPackage?.path,'claude-design/publication-package.json');
 assert.equal(ledger.sampleRelease.publicationPackage.sha256,packageSha256,'Stale ledger package pin');
 assert.equal(ledger.verificationRecord,`claude-design/qa/v${version}/change-ledger-verification.json`,'Tracked ledger verification required');
 assert.equal(verification.status,'passed');assert.equal(verification.ledger?.sha256,ledgerSha256,'Stale ledger verification');
 assert.deepEqual(verification.sourceSnapshot,ledger.sourceSnapshot);assert.deepEqual(verification.sampleRelease,ledger.sampleRelease);
}

export async function main(){
const {values:args}=parseArgs({options:{registry:{type:'string'}}});
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const pin=validateLibrary(catalog).find(b=>b.id==='claude-design');assert.ok(pin);
let book=resolve(root,'claude-design'),pkg,variantPin;
const candidate=!!args.registry;
if(candidate){
 const registry=JSON.parse(await readFile(resolve(args.registry),'utf8'));
 assert.equal(registry.schemaVersion,1);assert.equal(registry.mode,'candidate');assert.equal(registry.book,'claude-design');
 book=safePath(root,registry.source);assert.equal(await realpath(book),book,'Candidate source cannot be a symlink');
 pkg=registry.package;variantPin=registry.variantManifest;
 assert.ok(variantPin?.path&&/^[a-f0-9]{64}$/.test(variantPin.sha256),'Pinned candidate PDF variants required');
 assert.equal(pkg.id,'claude-design');assert.equal(pkg.readerDirectory,'reader');assert.equal(pkg.html,'reader/index.html');
 for(const [path,sha] of Object.entries(pkg.files)){
  const file=safePath(book,path);assert.ok((await lstat(file)).isFile());assert.equal(await realpath(file),file);
  assert.equal(digest(await readFile(file)),sha,'Stale candidate package file: '+path);
 }
}else{
 pkg=await validatePackage(book,pin);
 variantPin=APPROVAL_REGISTRY.books.find(b=>b.id===pin.id).variantManifest;
}
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json'),'utf8'));
assert.equal(pkg.version,manifest.version);assert.equal(pkg.files[manifest.pdf],manifest.sha256);assert.ok(pkg.files[pkg.html]);
if(candidate){
 assert.equal(manifest.approvalStatus,'candidate');
 const publication=JSON.parse(await readFile(resolve(book,'publication.json'),'utf8'));
 assert.equal(publication.approvalStatus,'candidate');assert.equal(publication.sourceRepository,catalog.repository);
 for(const field of ['editionUrl','releaseUrl'])assert.equal(new URL(publication[field],catalog.publicHost).pathname,`/claude-design/editions/v${manifest.version}/`);
}else assert.equal(pin.pages,manifest.pages,'Catalog page count differs from the approved PDF');
for(const path of Object.keys(pkg.files))assert.ok(path===manifest.pdf||path.startsWith('reader/'),'Unexpected package member: '+path);
const comparison=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,'edition-diff.json'),'utf8'));
for(const path of Object.values(comparison.artifacts)){
 assert.match(path,/^[A-Za-z0-9-]+\.patch$/);
 assert.ok((await readFile(resolve(book,'qa','v'+manifest.version,path))).length,'Missing edition comparison patch');
}
const variants=await resolvePdfVariants(book,{id:pin.id,...manifest},variantPin,{collectionRoot:root,candidate});
assert.deepEqual(variants.map(variant=>variant.theme).sort(),['dark','light'],'Both PDF appearances are required');
if(!candidate&&!/^1\.[01]\./.test(manifest.version)){
 const ledgerBytes=await readFile(resolve(book,'change-ledger.json'));const ledger=JSON.parse(ledgerBytes);
 assert.equal(ledger.verificationRecord,`claude-design/qa/v${manifest.version}/change-ledger-verification.json`);
 const verification=JSON.parse(await readFile(safePath(root,ledger.verificationRecord),'utf8'));
 const evidencePins={};
 for(const row of Object.values(ledger.comparisonEvidence||{})){
  assert.ok(row?.path,'Missing ledger evidence');evidencePins[row.path]=digest(await readFile(safePath(root,row.path)));
 }
 const decision=JSON.parse(await readFile(resolve(book,'changelog-decision.json'),'utf8'));
 validateLedgerContract(ledger,{version:manifest.version,sourceSha256:digest(await readFile(resolve(book,'Claude_Design_Field_Guide_Source.md'))),previousSourceSha256:digest(await readFile(safePath(book,`baselines/v${manifest.previous_public_edition}/Claude_Design_Field_Guide_Source.md`))),verification,ledgerSha256:digest(ledgerBytes),changes:decision.expectedEntries,evidencePins,sampleSha256:pkg.files['reader/velori-store-0.2.0-mit-release.zip'],sampleBytes:(await lstat(resolve(book,'reader/velori-store-0.2.0-mit-release.zip'))).size,packageSha256:digest(await readFile(resolve(book,'publication-package.json')))});
}
const html=await readFile(resolve(book,pkg.html),'utf8');
for(const v of variants){
 const bytes=await readFile(resolve(root,v.path));assert.equal(digest(bytes),v.sha256);
 const validation=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,v.theme==='light'?'daytime-validation.json':'late-night-validation.json'),'utf8'));
 assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);
 const text=execFileSync('pdftotext',[resolve(root,v.path),'-'],{encoding:'utf8'});
 validateContentContract(text,html,manifest.version,{candidate});
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(link[1]),'Missing target '+link[1]);
assert.equal((html.match(/class="chapter-art"/g)||[]).length,11);
assert.match(html,/class="handbooks-return-mobile"/);assert.match(html,/href="\/gallery.css"/);
assert.match(html,/https:\/\/handbooks.surfaces.systems\/claude-design\//);
for(const match of html.matchAll(/href="([^"#]+\.zip)"/g)){
 const url=new URL(match[1],'https://handbooks.surfaces.systems/claude-design/');
 if(url.origin==='https://handbooks.surfaces.systems'&&url.pathname.startsWith('/claude-design/')){
  const path='reader/'+url.pathname.slice('/claude-design/'.length);assert.ok(pkg.files[path],'Unpinned sample download: '+path);
 }
}
console.log(JSON.stringify({status:'passed',mode:candidate?'candidate':'approved',edition:manifest.version,pages:manifest.pages,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256})),readerSha256:pkg.files[pkg.html],chapters:11,nativeWorkflow:'not certified by local exercise',navigation:'passed'},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
