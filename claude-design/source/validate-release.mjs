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

const LEGACY_RELEASE_CONTRACT={classifiedChangeIds:['C01','C02','C03','C04','C05','C06','C07','C08'],sample:{publicUrl:'https://handbooks.surfaces.systems/claude-design/velori-store-0.2.0-mit-release.zip',repositoryPath:'claude-design/reader/velori-store-0.2.0-mit-release.zip'}};
const isSha256=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const host='https://handbooks.surfaces.systems';
export function resolveReleaseContract({version,releaseContract}){
 assert.match(version,/^\d+\.\d+\.\d+$/,'Invalid release edition');
 if(version==='1.2.0'){if(releaseContract)assert.deepEqual(releaseContract,LEGACY_RELEASE_CONTRACT,'The v1.2.0 legacy contract is fixed');return structuredClone(LEGACY_RELEASE_CONTRACT);}
 assert.ok(releaseContract,'An explicit release contract is required for a new edition');
 const ids=releaseContract.classifiedChangeIds;
 assert.ok(Array.isArray(ids)&&ids.length&&ids.every(id=>typeof id==='string'&&/^[A-Z][A-Z0-9]*$/.test(id)),'Classified change IDs required');
 assert.equal(new Set(ids).size,ids.length,'Duplicate classified change IDs');
 const prefix=`/claude-design/editions/v${version}/`,sample=releaseContract.sample;
 assert.ok(sample&&typeof sample.publicUrl==='string','Sample release URL required');
 const url=new URL(sample.publicUrl);
 assert.equal(url.origin,host,'Sample URL must use the public handbook host');
 assert.equal(url.search+url.hash,'','Sample URL cannot have query or fragment');
 assert.ok(url.pathname.startsWith(prefix),'Sample URL must use the exact edition');
 const filename=url.pathname.slice(prefix.length);
 assert.match(filename,/^velori-store-\d+\.\d+\.\d+-mit-release\.zip$/,'Invalid sample filename');
 assert.equal(sample.publicUrl,host+prefix+filename,'Sample URL must be canonical');
 assert.equal(sample.repositoryPath,'claude-design/reader'+prefix.slice('/claude-design'.length)+filename,'Sample path must match the exact edition URL');
 return structuredClone(releaseContract);
}

export function validateLedgerContract(ledger,{version,releaseContract,sourceSha256,previousSourceSha256,changes,evidencePins,sampleSha256,sampleBytes,packageSha256,verification,ledgerSha256}){
 const contract=resolveReleaseContract({version,releaseContract});
 assert.equal(ledger.accepted,true,'Release ledger must be accepted');
 assert.equal(ledger.version??ledger.proposedVersion,version,'Ledger edition mismatch');
 assert.equal(ledger.sourceSnapshot?.canonicalPath,'claude-design/Claude_Design_Field_Guide_Source.md','Ledger must bind the canonical manuscript');
 assert.ok(isSha256(sourceSha256)&&isSha256(previousSourceSha256),'Source hash pins required');
 assert.equal(ledger.sourceSnapshot.sha256,sourceSha256,'Stale ledger source hash');
 assert.equal(ledger.sourceSnapshot.previousSourceSha256,previousSourceSha256,'Stale previous source hash');
 assert.deepEqual(ledger.changes,changes,'Ledger differs from accepted changelog groups');
 assert.ok(Array.isArray(ledger.changes)&&ledger.changes.length,'Accepted changelog groups required');
 const classified=ledger.changes.flatMap(row=>{assert.ok(Array.isArray(row.groupedDraftEntries),'Classified group IDs required');return row.groupedDraftEntries;});
 assert.equal(new Set(classified).size,classified.length,'Every classified change must occur once');
 assert.deepEqual(classified.sort(),[...contract.classifiedChangeIds].sort(),'Every classified change must occur once');
 const evidence=Object.values(ledger.comparisonEvidence||{});
 assert.ok(evidence.some(row=>row.path===`claude-design/qa/v${version}/exact-source.patch`),'Tracked source comparison required');
 assert.ok(evidence.some(row=>row.path==='claude-design/changelog-decision.json'),'Accepted changelog evidence required');
 for(const row of evidence){
  assert.ok(row?.path&&(row.path.startsWith(`claude-design/qa/v${version}/`)||row.path==='claude-design/changelog-decision.json'),'Release evidence must be tracked with this edition');
  safePath(root,row.path);
  assert.ok(isSha256(row.sha256)&&isSha256(evidencePins[row.path]),'Comparison evidence hash pins required');
  assert.equal(row.sha256,evidencePins[row.path],'Stale ledger comparison evidence');
 }
 assert.equal(ledger.sampleRelease?.publicUrl,contract.sample.publicUrl,'Ledger sample URL differs from release contract');
 assert.equal(ledger.sampleRelease.repositoryPath,contract.sample.repositoryPath,'Ledger sample path differs from release contract');
 assert.ok(isSha256(sampleSha256)&&Number.isSafeInteger(sampleBytes)&&sampleBytes>0,'Pinned sample bytes required');
 assert.equal(ledger.sampleRelease.sha256,sampleSha256,'Stale ledger sample hash');
 assert.equal(ledger.sampleRelease.bytes,sampleBytes,'Stale ledger sample size');
 assert.equal(ledger.sampleRelease.publicationPackage?.path,'claude-design/publication-package.json');
 assert.ok(isSha256(packageSha256),'Publication package hash required');
 assert.equal(ledger.sampleRelease.publicationPackage.sha256,packageSha256,'Stale ledger package pin');
 assert.equal(ledger.verificationRecord,`claude-design/qa/v${version}/change-ledger-verification.json`,'Tracked ledger verification required');
 assert.equal(verification.status,'passed');assert.equal(verification.ledger?.sha256,ledgerSha256,'Stale ledger verification');
 assert.deepEqual(verification.sourceSnapshot,ledger.sourceSnapshot);assert.deepEqual(verification.sampleRelease,ledger.sampleRelease);
 assert.deepEqual(verification.comparisonEvidence,ledger.comparisonEvidence,'Ledger verification evidence differs');
}

export function validateFigmaCompanionContract(companion,{version,artifactSha256,artifactBytes,companionSha256,sidecarSha256,qaSha256,qa}){
 assert.equal(companion.schemaVersion,1,'Unsupported Figma companion schema');
 assert.equal(companion.version,version,'Figma companion edition mismatch');
 assert.equal(companion.artifact?.filename,'velori-design-system-configurator.fig','Unexpected Figma companion filename');
 assert.equal(companion.artifact.route,`/claude-design/editions/v${version}/${companion.artifact.filename}`,'Figma companion must use the exact edition route');
 assert.equal(companion.artifact.format,'native Figma .fig');
 assert.ok(isSha256(artifactSha256)&&Number.isSafeInteger(artifactBytes)&&artifactBytes>0,'Figma artifact hash and bytes required');
 assert.equal(companion.artifact.sha256,artifactSha256,'Stale Figma artifact hash');
 assert.equal(companion.artifact.bytes,artifactBytes,'Stale Figma artifact size');
 assert.ok(isSha256(companionSha256)&&isSha256(sidecarSha256),'Companion manifest pins required');
 assert.equal(sidecarSha256,companionSha256,'Public Figma sidecar differs from source manifest');
 assert.equal(companion.export?.nativeBytesUnchanged,true,'Figma native export must remain unchanged');
 assert.equal(companion.license?.ownedMaterials,'MIT','Authored Figma material license required');
 assert.ok(companion.license.noticeText?.includes(companion.license.copyright),'Figma copyright notice required');
 assert.equal(companion.fonts?.separateFontBinariesIncluded,false,'Font software must not be silently bundled');
 for(const notice of companion.thirdPartyNotices||[]){assert.equal(digest(Buffer.from(notice.noticeText)),notice.noticeSha256,'Stale companion third-party notice');}
 assert.equal(companion.verification?.status,'passed','Figma companion verification must pass');
 assert.equal(companion.verification.freshImport?.status,'passed','Fresh Figma import must pass');
 assert.ok(companion.verification.freshImport.presentChecks>0,'Actual Figma Present checks required');
 assert.equal(companion.verification.dependencyClosure?.status,'passed','Figma dependency closure must pass');
 assert.equal(companion.verification.dependencyClosure.trackedReceipt,`qa/v${version}/figma-import-verification.json`,'Figma import evidence must be edition-local and tracked');
 assert.ok(isSha256(qaSha256),'Figma import evidence hash required');
 assert.equal(companion.verification.dependencyClosure.receiptSha256,qaSha256,'Stale Figma import evidence');
 assert.equal(qa.schemaVersion,1,'Unsupported Figma import QA schema');
 assert.equal(qa.status,'passed','Figma import QA must pass');
 assert.equal(qa.version,version,'Figma import QA edition mismatch');
 assert.equal(qa.artifact.sha256,artifactSha256,'Figma import QA artifact mismatch');
 assert.equal(qa.artifact.bytes,artifactBytes,'Figma import QA artifact size mismatch');
 assert.equal(qa.freshImport.status,'passed','Figma import QA native import failed');
 assert.equal(qa.freshImport.destination,'Drafts','Figma import must use reader-owned Drafts');
 assert.equal(qa.freshImport.presentChecks,companion.verification.freshImport.presentChecks,'Figma Present evidence count mismatch');
 assert.equal(qa.dependencyClosure.status,'passed','Figma import QA closure failed');
 assert.equal(qa.dependencyClosure.unresolvedRequiredDependencies,0,'Unresolved Figma dependencies');
}

export function validateDownloadContract(html,files,{version,releaseContract}={}){
 const downloads=new Set();
 for(const match of html.matchAll(/href="([^"#]+\.(?:zip|fig))"/g)){
  const url=new URL(match[1],host+'/claude-design/');
  if(url.origin===host&&url.pathname.startsWith('/claude-design/')){
   const path='reader/'+url.pathname.slice('/claude-design/'.length);
   assert.ok(isSha256(files[path]),'Unpinned sample download: '+path);downloads.add(url.pathname);
  }
 }
 if(releaseContract){
  const contract=resolveReleaseContract({version,releaseContract});
  assert.ok(downloads.has(new URL(contract.sample.publicUrl).pathname),'Current edition sample link required');
  assert.ok(downloads.has(`/claude-design/editions/v${version}/velori-design-system-configurator.fig`),'Current edition Figma link required');
 }
}

async function pinnedFile(base,path){const file=safePath(base,path);assert.ok((await lstat(file)).isFile(),'Pinned input must be a regular file');assert.equal(await realpath(file),file,'Pinned input cannot be a symlink');return {bytes:await readFile(file),file};}

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
const releaseContract=!/^1\.[01]\./.test(manifest.version)?resolveReleaseContract(manifest):null;
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
 const verification=JSON.parse((await pinnedFile(book,`qa/v${manifest.version}/change-ledger-verification.json`)).bytes);
 const evidencePins={};
 for(const row of Object.values(ledger.comparisonEvidence||{})){
  assert.ok(row?.path&&row.path.startsWith('claude-design/'),'Missing ledger evidence');evidencePins[row.path]=digest((await pinnedFile(book,row.path.slice('claude-design/'.length))).bytes);
 }
 const decision=JSON.parse(await readFile(resolve(book,'changelog-decision.json'),'utf8'));
 const samplePath=releaseContract.sample.repositoryPath.slice('claude-design/'.length),sample=await pinnedFile(book,samplePath);
 validateLedgerContract(ledger,{version:manifest.version,releaseContract:manifest.releaseContract,sourceSha256:digest(await readFile(resolve(book,'Claude_Design_Field_Guide_Source.md'))),previousSourceSha256:digest(await readFile(safePath(book,`baselines/v${manifest.previous_public_edition}/Claude_Design_Field_Guide_Source.md`))),verification,ledgerSha256:digest(ledgerBytes),changes:decision.expectedEntries,evidencePins,sampleSha256:pkg.files[samplePath],sampleBytes:sample.bytes.length,packageSha256:digest(await readFile(resolve(book,'publication-package.json')))});
}
if(manifest.releaseContract){
 const samplePath=releaseContract.sample.repositoryPath.slice('claude-design/'.length),sample=await pinnedFile(book,samplePath);
 assert.equal(pkg.files[samplePath],digest(sample.bytes),'Unpinned current edition sample');
 const source=await pinnedFile(book,'figma-companion.json'),companion=JSON.parse(source.bytes);
 const editionPath=`reader/editions/v${manifest.version}/`,artifact=await pinnedFile(book,editionPath+companion.artifact.filename),sidecar=await pinnedFile(book,editionPath+'figma-companion.json');
 assert.equal(pkg.files[editionPath+companion.artifact.filename],digest(artifact.bytes),'Unpinned Figma artifact');
 assert.equal(pkg.files[editionPath+'figma-companion.json'],digest(sidecar.bytes),'Unpinned Figma sidecar');
 const proof=await pinnedFile(book,`qa/v${manifest.version}/figma-import-verification.json`);
 validateFigmaCompanionContract(companion,{version:manifest.version,artifactSha256:digest(artifact.bytes),artifactBytes:artifact.bytes.length,companionSha256:digest(source.bytes),sidecarSha256:digest(sidecar.bytes),qaSha256:digest(proof.bytes),qa:JSON.parse(proof.bytes)});
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
validateDownloadContract(html,pkg.files,{version:manifest.version,releaseContract:manifest.releaseContract});
console.log(JSON.stringify({status:'passed',mode:candidate?'candidate':'approved',edition:manifest.version,pages:manifest.pages,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256})),readerSha256:pkg.files[pkg.html],chapters:11,nativeWorkflow:'not certified by local exercise',navigation:'passed'},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
