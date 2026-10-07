import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest,safePath} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {resolvePdfVariants} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {validateLibrary,validatePackage,APPROVAL_REGISTRY} from '../../site/scripts/book-sources.mjs';
const host='https://handbooks.surfaces.systems';
const isSha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const nativePaths=edition=>({
 releaseManifest:`claude-design/baselines/v${edition}/release-manifest.json`,
 figmaCompanion:`claude-design/baselines/v${edition}/figma-companion.json`,
 roundtrip:`claude-design/qa/v${edition}/figma-roundtrip-validation.json`,
 publicationApproval:`claude-design/qa/v${edition}/publication-approval.json`
});
const prototypeChecks=['desktopAddToCart','cartChoices','editRestoration','snapshotIsolation','editedItemUpdate','repeatActivation','sameSessionReload','unavailableFixture','emptyCartRecovery','mobile','resetFixture','continueLabel'];
const isOlder=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]<y[i];}return false;};
const needsCompanionParity=version=>isOlder('2.1.0',version);
function currentEvidencePin(row,version,label){
 const prefix=`claude-design/qa/v${version}/`;
 assert.ok(typeof row?.path==='string'&&row.path.startsWith(prefix)&&/^[A-Za-z0-9_/.-]+\.json$/.test(row.path)&&!row.path.split('/').some(part=>part==='..'||part==='.'||part===''),'Current '+label+' evidence must be edition-local');
 assert.ok(isSha(row.sha256),'Current '+label+' evidence hash required');
}
export function validateExplorationPublicationAuthority(approval){
 assert.equal(approval.status,'approved');
 if(approval.command==='Land this')return;
 assert.equal(approval.authority?.kind,'explicit-user-release','Explicit user release authority required');
 assert.equal(approval.command,'address this and make a new release','Unrecognized explicit release request');
}
export function explorationSourceFingerprint(files){
 const names=Object.keys(files).filter(name=>name.startsWith('velori-store/src/')||['velori-store/package.json','velori-store/package-lock.json'].includes(name)).sort();
 assert.ok(names.includes('velori-store/package.json')&&names.includes('velori-store/package-lock.json')&&names.some(name=>name.startsWith('velori-store/src/')),'Archived React source and package metadata required');
 const entries=names.map(name=>{assert.ok(isSha(files[name]),'Archived React source hash required');return [name,files[name]];});
 return digest(Buffer.from(JSON.stringify(entries)));
}
export function validateExplorationContract(manifest){
 const c=manifest.releaseContract;
 assert.equal(c?.kind,'design-exploration');
 assert.match(manifest.version,/^[2-9]\d*\.\d+\.\d+$/);
 assert.equal(c.chapterCount,9);
 assert.ok(Number.isSafeInteger(manifest.pages)&&manifest.pages>0,'Exact PDF page count required');
 assert.ok(Array.isArray(c.classifiedChangeIds)&&c.classifiedChangeIds.length&&c.classifiedChangeIds.every(id=>typeof id==='string'&&/^[A-Z][A-Z0-9]*$/.test(id)),'Classified change IDs required');
 assert.equal(new Set(c.classifiedChangeIds).size,c.classifiedChangeIds.length,'Duplicate classified change IDs');
 if(manifest.version==='2.0.0'){
  assert.deepEqual(c.classifiedChangeIds,['D01','D02','D03','D04']);
  assert.equal(manifest.pages,53);
  assert.ok(c.archiveMemberCount===undefined||c.archiveMemberCount===209,'The original archive count is fixed');
 }else{
  assert.ok(Number.isSafeInteger(c.archiveMemberCount)&&c.archiveMemberCount>0,'Exact archive member count required');
  const e=c.nativeEvidence;
  assert.ok(e&&typeof e.edition==='string'&&/^\d+\.\d+\.\d+$/.test(e.edition)&&isOlder(e.edition,manifest.version),'Retained native evidence must precede this edition');
  for(const [key,path] of Object.entries(nativePaths(e.edition))){assert.equal(e[key]?.path,path,'Native evidence must bind its original edition');assert.ok(isSha(e[key].sha256),'Native evidence hash required');}
  const prototypeEdition=needsCompanionParity(manifest.version)?c.prototypeEvidence?.edition:manifest.version;
  if(needsCompanionParity(manifest.version)){
   assert.equal(prototypeEdition,'2.1.0','Retained standalone prototype must keep its original edition');
   currentEvidencePin(c.companionParityEvidence,manifest.version,'companion parity');
  }
  assert.equal(c.prototypeEvidence?.path,`claude-design/qa/v${prototypeEdition}/prototype-behavior.json`,'Tracked current prototype evidence required');
  assert.ok(isSha(c.prototypeEvidence.sha256),'Prototype evidence hash required');
 }
 const file=`velori-design-exploration-v${manifest.version}.zip`;
 assert.equal(c.sample.publicUrl,`${host}/claude-design/editions/v${manifest.version}/${file}`);
 assert.equal(c.sample.repositoryPath,`claude-design/reader/editions/v${manifest.version}/${file}`);
 assert.equal(c.nativeStarter.filename,'velori-design-exploration-starter.fig');
 assert.ok(isSha(c.nativeStarter.sha256),'Native starter hash required');
 return c;
}
export function validateExplorationChangeCoverage(ledger,contract){
 assert.deepEqual(ledger.classifiedChangeIds,contract.classifiedChangeIds,'Ledger classification differs from contract');
 const classified=ledger.changes.flatMap(row=>{assert.ok(Array.isArray(row.groupedDraftEntries),'Classified group IDs required');return row.groupedDraftEntries;});
 assert.equal(new Set(classified).size,classified.length,'Every classified change must occur once');
 assert.deepEqual(classified.sort(),[...contract.classifiedChangeIds].sort(),'Every classified change must occur once');
}
export function validateExplorationNativeEvidence(contract,{version,records,companion}){
 const e=contract.nativeEvidence;
 assert.ok(e&&isOlder(e.edition,version),'Retained native edition required');
 for(const key of Object.keys(nativePaths(e.edition)))assert.equal(records[key]?.sha256,e[key].sha256,'Stale retained native evidence: '+key);
 const original=records.releaseManifest.data;
 assert.equal(original.version,e.edition,'Native evidence edition changed');assert.equal(original.approvalStatus,'approved','Native evidence must come from an approved edition');
 assert.deepEqual(original.releaseContract.nativeStarter,contract.nativeStarter,'Retained native starter bytes changed');
 assert.deepEqual(original.publicationApproval,e.publicationApproval,'Retained native publication approval changed');
 const approval=records.publicationApproval.data;assert.equal(approval.status,'approved');assert.equal(approval.command,'Land this');
 const originalCompanion=records.figmaCompanion.data;assert.equal(originalCompanion.handbookEdition,e.edition);
 const identity=artifacts=>artifacts.map(({filename,role,sha256,bytes,format})=>({filename,role,sha256,bytes,format}));
 if(contract.companionParityEvidence){
  assert.deepEqual(identity(companion.artifacts.filter(a=>a.role==='starting material')),identity(originalCompanion.artifacts.filter(a=>a.role==='starting material')),'Retained native starter identity changed');
 }else assert.deepEqual(identity(companion.artifacts),identity(originalCompanion.artifacts),'Retained native artifact identity changed');
 const roundtrip=records.roundtrip.data;
 assert.equal(roundtrip.status,'passed');assert.match(roundtrip.scope,/same account/);
 assert.equal(roundtrip.validation.missingFonts.length,0);assert.equal(roundtrip.validation.reactions,0);assert.equal(roundtrip.validation.styledTexts,22);assert.equal(roundtrip.validation.instances.length,10);assert.ok(roundtrip.validation.instances.every(i=>i.mainComponent?.id));assert.equal(roundtrip.validation.variableBoundNodes,66);
 return roundtrip;
}
export function validateExplorationPrototypeEvidence(proof,{version,prototypeSha256,sourceSha256,sourceData}){
 assert.equal(proof.schemaVersion,1);assert.equal(proof.status,'passed');assert.equal(proof.version,version);
 assert.equal(proof.prototype?.archiveMember,'velori-store/answer-key/velori-review-prototype.html');
 assert.ok(isSha(prototypeSha256));assert.equal(proof.prototype.sha256,prototypeSha256,'Prototype proof differs from archived HTML');
 assert.ok(proof.sourceEvidence?.path.startsWith(`claude-design/qa/v${version}/`),'Prototype source evidence must be tracked with the current edition');
 assert.ok(isSha(sourceSha256));assert.equal(proof.sourceEvidence.sha256,sourceSha256,'Stale original prototype source evidence');
 assert.equal(sourceData.version,version);assert.equal(sourceData.artifacts['velori-review-prototype.html'].sha256,prototypeSha256,'Original walkthrough tested different prototype bytes');
 for(const key of prototypeChecks){assert.match(proof.checks?.[key]??'',/^passed(?:;|$)/,'Prototype check required: '+key);assert.equal(proof.checks[key],sourceData.checks[key],'Prototype check differs from original walkthrough: '+key);}
 assert.ok(proof.limitations?.some(value=>/No new native Claude Design.*generation trial/i.test(value)),'Retained native trial scope must remain explicit');
}
export function validateExplorationCompanionParity(proof,{version,contract,nativeRecords,companion,archive,prototypeProof,validationRecords}){
 assert.equal(proof.schemaVersion,1);assert.equal(proof.status,'passed');assert.equal(proof.version,version,'Companion parity evidence edition mismatch');
 assert.ok(needsCompanionParity(version),'Current companion correction requires a successor edition');
 assert.ok(proof.limitations?.some(value=>/No new native Claude Design.*generation trial/i.test(value)),'Current companion proof must preserve native generation trial scope');
 const starter=companion.artifacts.find(a=>a.role==='starting material');
 const continuation=companion.artifacts.find(a=>a.role==='static editable answer key');
 const previousContinuation=nativeRecords.figmaCompanion.data.artifacts.find(a=>a.role==='static editable answer key');
 assert.equal(companion.artifacts.length,2,'Exactly the starter and corrected continuation are required');
 assert.ok(starter&&continuation&&previousContinuation,'Current and retained native artifacts required');
 assert.equal(starter.sha256,contract.nativeStarter.sha256,'Current starter changed');
 assert.equal(proof.unchangedStarterSha256,starter.sha256,'Unchanged starter proof mismatch');
 assert.equal(archive.sha256['velori-store/'+starter.filename],starter.sha256,'Archived starter changed');
 assert.equal(continuation.filename,'answer-key/velori-review-continuation.fig');
 assert.equal(continuation.format,'native Figma .fig');assert.ok(isSha(continuation.sha256));
 assert.notEqual(continuation.sha256,previousContinuation.sha256,'Current continuation must include the new cart correction');
 assert.equal(proof.unchangedStandalonePrototypeSha256,archive.sha256['velori-store/answer-key/velori-review-prototype.html'],'Standalone prototype changed');
 assert.equal(prototypeProof.version,contract.prototypeEvidence.edition,'Retained prototype edition changed');
 assert.equal(prototypeProof.prototype.sha256,proof.unchangedStandalonePrototypeSha256,'Retained standalone prototype bytes changed');
 const f=proof.figma;assert.equal(f?.status,'passed');assert.equal(f.reviewAction,'Add to cart');assert.equal(f.static,true,'Static Figma scope must remain explicit');
 assert.match(f.cartFrameId,/^\d+:\d+$/,'Actual Figma cart frame ID required');
 assert.equal(f.artifactSha256,continuation.sha256,'Figma proof differs from current continuation');
 assert.equal(f.artifactSha256,archive.sha256['velori-store/'+continuation.filename],'Figma proof differs from archived continuation');
 assert.ok(Number.isSafeInteger(f.artifactBytes)&&f.artifactBytes>0);assert.equal(f.artifactBytes,continuation.bytes);assert.equal(f.artifactBytes,archive.bytes['velori-store/'+continuation.filename],'Archived continuation size differs');
 currentEvidencePin(f.validation,version,'Figma validation');assert.equal(f.validationSha256,f.validation.sha256,'Figma validation hash fields differ');
 assert.equal(validationRecords.figma.sha256,f.validation.sha256,'Stale current Figma validation');
 const fv=validationRecords.figma.data;assert.equal(fv.schemaVersion,1);assert.equal(fv.status,'passed');assert.equal(fv.version,version);
 assert.equal(fv.artifact?.sha256,f.artifactSha256);assert.equal(fv.artifact.bytes,f.artifactBytes);assert.equal(fv.static,true);assert.equal(fv.reviewAction,'Add to cart');assert.equal(fv.cartFrameId,f.cartFrameId);
 assert.ok(Array.isArray(fv.frames),'Inspected Figma Review and Cart frames required');
 const review=fv.frames.find(frame=>frame.role==='review'),cart=fv.frames.find(frame=>frame.role==='cart');
 assert.ok(review&&cart,'Inspected Figma Review and Cart frames required');assert.notEqual(review.id,cart.id);assert.equal(cart.id,f.cartFrameId);assert.equal(review.primaryAction,'Add to cart','Figma Review action must reach the cart endpoint');
 for(const frame of [review,cart]){
  assert.match(frame.id,/^\d+:\d+$/);assert.equal(frame.editable,true,'Editable native Figma frames required');assert.deepEqual(frame.missingFonts,[],'Missing current Figma fonts');
  const instanceCount=Array.isArray(frame.instances)?frame.instances.length:frame.instances;
  for(const [name,value] of [['instances',instanceCount],['styledTexts',frame.styledTexts],['variableBoundNodes',frame.variableBoundNodes]])assert.ok(Number.isSafeInteger(value)&&value>0,'Measured Figma '+name+' required');
 }
 assert.deepEqual(cart.choices,{finish:'Graphite',face:'Simple',expression:'Amber',accessory:'Carry bag'},'Figma cart must show all four fixture choices');assert.equal(cart.quantity,1,'Figma cart quantity must be one');assert.equal(cart.productImage,true,'Figma cart requires the configured product image');
 const r=proof.react;assert.equal(r?.status,'passed');assert.equal(r.packageVersion,version,'React package edition mismatch');
 assert.equal(archive.packageVersion,version,'Archived React package edition mismatch');assert.equal(archive.lockVersion,version,'Archived React lockfile edition mismatch');assert.equal(archive.lockPackageVersion,version,'Archived React lockfile root edition mismatch');
 assert.ok(isSha(r.sourceSha256),'Current React source hash required');assert.equal(r.sourceSha256,archive.sourceSha256,'Current React source differs from archived sample');
 currentEvidencePin(r.validation,version,'React validation');assert.equal(r.validationSha256,r.validation.sha256,'React validation hash fields differ');assert.equal(validationRecords.react.sha256,r.validation.sha256,'Stale current React validation');
 const rv=validationRecords.react.data;assert.equal(rv.schemaVersion,1);assert.equal(rv.status,'passed');assert.equal(rv.version,version);assert.equal(rv.packageVersion,version);assert.equal(rv.sourceSha256,r.sourceSha256,'React validation tested different source');
 for(const key of prototypeChecks){assert.equal(r.checks?.[key],true,'Current React check required: '+key);assert.equal(rv.checks?.[key],true,'Current React validation check required: '+key);}
}
function readExplorationArchive(path,contract){
 const code=`import zipfile,sys,json,hashlib
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); assert len(names)==int(sys.argv[2]); assert len(set(names))==len(names); assert z.testzip() is None
assert all(not n.startswith('/') and '..' not in n.split('/') for n in names)
required=['velori-store/velori-design-exploration-starter.fig','velori-store/answer-key/velori-review-continuation.fig','velori-store/answer-key/velori-review-prototype.html']
assert all(n in names for n in required)
source=[n for n in names if n.startswith('velori-store/src/') and not n.endswith('/')]+['velori-store/package.json','velori-store/package-lock.json']
required=list(dict.fromkeys(required+source))
package=json.loads(z.read('velori-store/package.json')); lock=json.loads(z.read('velori-store/package-lock.json'))
print(json.dumps({'members':len(names),'sha256':{n:hashlib.sha256(z.read(n)).hexdigest() for n in required},'bytes':{n:len(z.read(n)) for n in required},'packageVersion':package['version'],'lockVersion':lock['version'],'lockPackageVersion':lock['packages']['']['version']}))`;
 const archive=JSON.parse(execFileSync('python3',['-c',code,path,String(contract.archiveMemberCount??209)],{encoding:'utf8'}));
 archive.sourceSha256=explorationSourceFingerprint(archive.sha256);return archive;
}
export function validateExplorationContent(text,html,version,{candidate=false}={}){
 text=text.replace(/\s+/g,' ');
 for(const value of ['Explore design directions','Refine the design','Build the connected experience','Review with people','Hand off to Claude Code','Continue in Figma when needed','Run the guided exercise'])assert.ok(text.includes(value)&&html.includes(value),value);
 assert.ok(text.includes('direct edit')&&text.includes('unsupported'),'Observed direct-editor limit must remain visible');
 assert.ok(text.includes('no prototype connections or choice-state wiring'),'Static Figma continuation limit must remain visible');
 if(version!=='2.0.0')for(const value of ['Add to cart','quantity one','Continue','Reset fixture'])assert.ok(text.includes(value)&&html.includes(value),'Cart exercise text required: '+value);
 assert.equal((html.match(/class="chapter-art"/g)||[]).length,9);
 assert.ok(html.includes(`velori-design-exploration-v${version}.zip`));
 if(!candidate)assert.doesNotMatch(html,/Publication has not been approved/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),'Missing target '+m[1]);
}
export async function validateExplorationRelease(root){
 const book=resolve(root,'claude-design');
 const json=async p=>JSON.parse(await readFile(safePath(root,p),'utf8'));
 const bytes=async p=>{const file=safePath(root,p);assert.ok((await lstat(file)).isFile(),'Pinned input must be a regular file');assert.equal(await realpath(file),file,'Pinned input cannot be a symlink');return readFile(file);};
 const pinned=async row=>{assert.ok(isSha(row?.sha256),'Proof hash required');assert.equal(digest(await bytes(row.path)),row.sha256,'Stale proof '+row.path);return json(row.path);};
 const catalog=await json('catalog.json'),pin=validateLibrary(catalog).find(x=>x.id==='claude-design');
 const pkg=await validatePackage(book,pin),manifest=await json('claude-design/release-manifest.json'),contract=validateExplorationContract(manifest);
 assert.equal(manifest.approvalStatus,'approved');assert.equal(manifest.version,pin.version);assert.equal(manifest.pages,pin.pages);assert.equal(manifest.sha256,pin.pdfSha256);
 const approval=await pinned(manifest.publicationApproval);validateExplorationPublicationAuthority(approval);
 assert.equal(approval.manuscript.path,'claude-design/Claude_Design_Field_Guide_Source.md','Approval must bind the canonical manuscript');assert.equal(approval.manuscript.sha256,digest(await bytes(approval.manuscript.path)));assert.equal(approval.exercise.path,contract.sample.repositoryPath,'Approval must bind the current exercise');assert.equal(approval.exercise.sha256,digest(await bytes(contract.sample.repositoryPath)),'Approved exercise bytes changed');assert.ok(approval.limitations.includes('Human task review has not been completed. The author walkthrough is not usability evidence.'));
 const publication=await json('claude-design/publication.json');assert.equal(publication.approvalStatus,'approved');assert.equal(publication.editionUrl,pin.editionUrl);
 const ledger=await json('claude-design/change-ledger.json'),decision=await json('claude-design/changelog-decision.json');
 assert.equal(ledger.accepted,true);assert.equal(ledger.version,manifest.version);assert.deepEqual(ledger.changes,decision.expectedEntries);validateExplorationChangeCoverage(ledger,contract);
 assert.equal(ledger.sourceSnapshot.sha256,digest(await bytes('claude-design/Claude_Design_Field_Guide_Source.md')));
 assert.equal(ledger.sourceSnapshot.previousSourceSha256,digest(await bytes(`claude-design/baselines/v${manifest.previous_public_edition}/Claude_Design_Field_Guide_Source.md`)));
 for(const row of Object.values(ledger.comparisonEvidence)){assert.ok(row.path.startsWith(`claude-design/qa/v${manifest.version}/`)||row.path==='claude-design/changelog-decision.json');assert.equal(digest(await bytes(row.path)),row.sha256);}
 const comparison=await json(`claude-design/qa/v${manifest.version}/edition-diff.json`);
 assert.equal(comparison.candidate.pdfSha256,manifest.sha256);assert.equal(comparison.sourceSha256.candidate,ledger.sourceSnapshot.sha256);
 for(const path of Object.values(comparison.artifacts)){assert.match(path,/^[a-z-]+\.patch$/);assert.ok((await bytes(`claude-design/qa/v${manifest.version}/${path}`)).length);}
 assert.equal(ledger.sampleRelease.publicUrl,contract.sample.publicUrl);assert.equal(ledger.sampleRelease.repositoryPath,contract.sample.repositoryPath);
 assert.equal(ledger.sampleRelease.sha256,digest(await bytes(contract.sample.repositoryPath)));assert.equal(ledger.sampleRelease.bytes,(await bytes(contract.sample.repositoryPath)).length);assert.equal(ledger.sampleRelease.publicationPackage.sha256,digest(await bytes('claude-design/publication-package.json')));
 const verification=await json(`claude-design/qa/v${manifest.version}/change-ledger-verification.json`);assert.equal(verification.status,'passed');assert.equal(verification.ledger.sha256,digest(await bytes('claude-design/change-ledger.json')));assert.deepEqual(verification.sourceSnapshot,ledger.sourceSnapshot);assert.deepEqual(verification.comparisonEvidence,ledger.comparisonEvidence);assert.deepEqual(verification.sampleRelease,ledger.sampleRelease);
 const html=await readFile(resolve(book,pkg.html),'utf8');
 const downloads=await json('claude-design/exercise-downloads.json');assert.equal(pkg.files['exercise-downloads.json'],digest(await bytes('claude-design/exercise-downloads.json')));assert.equal(downloads.version,manifest.version);
 for(const d of downloads.downloads){assert.equal(pkg.files[d.path],d.sha256);const data=await readFile(safePath(book,d.path));assert.equal(digest(data),d.sha256);assert.equal(data.length,d.bytes);assert.equal(d.url,`/claude-design/editions/v${manifest.version}/${d.filename}`);}
 const prefix=`reader/editions/v${manifest.version}/`;assert.equal(pkg.files[prefix+contract.nativeStarter.filename],contract.nativeStarter.sha256);
 const companion=await json('claude-design/figma-companion.json');assert.equal(companion.handbookEdition,manifest.version);assert.equal(digest(await bytes('claude-design/figma-companion.json')),pkg.files[prefix+'figma-companion.json']);assert.match(companion.fontDelivery,/No font binaries bundled/);
 const starter=companion.artifacts.find(a=>a.role==='starting material');assert.equal(starter.filename,contract.nativeStarter.filename);assert.equal(starter.sha256,contract.nativeStarter.sha256);
 const archive=readExplorationArchive(safePath(root,contract.sample.repositoryPath),contract);
 assert.equal(archive.sha256['velori-store/'+contract.nativeStarter.filename],contract.nativeStarter.sha256,'Archived native starter differs');
 const continuation=companion.artifacts.find(a=>a.role==='static editable answer key');assert.ok(continuation);assert.equal(archive.sha256['velori-store/'+continuation.filename],continuation.sha256,'Archived native continuation differs');
 if(contract.nativeEvidence){
  const records={};for(const key of Object.keys(nativePaths(contract.nativeEvidence.edition))){const row=contract.nativeEvidence[key];records[key]={sha256:digest(await bytes(row.path)),data:await pinned(row)};}
  validateExplorationNativeEvidence(contract,{version:manifest.version,records,companion});
  const prototypeEdition=contract.prototypeEvidence.edition??manifest.version;
  const proof=await pinned(contract.prototypeEvidence),source=proof.sourceEvidence;assert.ok(source?.path.startsWith(`claude-design/qa/v${prototypeEdition}/`));
  const sourceData=await pinned(source);validateExplorationPrototypeEvidence(proof,{version:prototypeEdition,prototypeSha256:archive.sha256['velori-store/answer-key/velori-review-prototype.html'],sourceSha256:digest(await bytes(source.path)),sourceData});
  if(contract.companionParityEvidence){
   const parity=await pinned(contract.companionParityEvidence),validationRecords={};
   for(const key of ['figma','react']){const row=parity[key]?.validation;currentEvidencePin(row,manifest.version,key+' validation');validationRecords[key]={sha256:digest(await bytes(row.path)),data:await pinned(row)};}
   validateExplorationCompanionParity(parity,{version:manifest.version,contract,nativeRecords:records,companion,archive,prototypeProof:proof,validationRecords});
  }
 }else{
  const roundtrip=await json(`claude-design/qa/v${manifest.version}/figma-roundtrip-validation.json`);assert.equal(roundtrip.status,'passed');assert.match(roundtrip.scope,/same account/);assert.equal(roundtrip.validation.missingFonts.length,0);assert.equal(roundtrip.validation.reactions,0);assert.equal(roundtrip.validation.styledTexts,22);assert.equal(roundtrip.validation.instances.length,10);assert.ok(roundtrip.validation.instances.every(i=>i.mainComponent?.id));assert.equal(roundtrip.validation.variableBoundNodes,66);
 }
 const variants=await resolvePdfVariants(book,{id:'claude-design',...manifest},APPROVAL_REGISTRY.books.find(x=>x.id==='claude-design').variantManifest,{collectionRoot:root});
 assert.deepEqual(variants.map(v=>v.theme).sort(),['dark','light']);
 for(const v of variants){assert.ok(approval.pdfs.some(p=>p.path===v.path&&p.sha256===v.sha256));assert.equal(digest(await bytes(v.path)),v.sha256);const validation=await json(`claude-design/qa/v${manifest.version}/${v.theme==='light'?'daytime':'late-night'}-validation.json`);assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);assert.equal(v.pages,manifest.pages);assert.equal(validation.stats.pages,manifest.pages);validateExplorationContent(execFileSync('pdftotext',[safePath(root,v.path),'-'],{encoding:'utf8'}),html,manifest.version);}
 console.log(JSON.stringify({status:'passed',edition:manifest.version,pages:manifest.pages,chapters:contract.chapterCount,archive,trialLimits:approval.limitations,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256}))},null,2));
}

// Candidate registries pin their own book and artifacts; they never authorize release.
export async function validateExplorationCandidate(book,{root,pkg,manifest,variantPin,catalog}){
 const contract=validateExplorationContract(manifest);
 const json=async path=>JSON.parse(await readFile(safePath(book,path),'utf8'));
 assert.equal(manifest.approvalStatus,'candidate','Selected candidate manifest must remain candidate');
 const publication=await json('publication.json');
 assert.equal(publication.approvalStatus,'candidate','Selected candidate publication must remain candidate');
 assert.equal(publication.sourceRepository,catalog.repository);
 for(const field of ['editionUrl','releaseUrl'])assert.equal(new URL(publication[field],catalog.publicHost).pathname,`/claude-design/editions/v${manifest.version}/`);
 for(const path of Object.keys(pkg.files))assert.ok(path===manifest.pdf||path.startsWith('reader/')||path==='exercise-downloads.json','Unexpected candidate package member: '+path);
 const comparison=await json(`qa/v${manifest.version}/edition-diff.json`);
 assert.equal(comparison.candidate.pdfSha256,manifest.sha256);
 assert.equal(comparison.sourceSha256.candidate,digest(await readFile(safePath(book,'Claude_Design_Field_Guide_Source.md'))));
 for(const path of Object.values(comparison.artifacts)){
  assert.match(path,/^[A-Za-z0-9-]+\.patch$/);
  assert.ok((await readFile(safePath(book,`qa/v${manifest.version}/${path}`))).length,'Missing candidate comparison patch');
 }
 const prefix=`reader/editions/v${manifest.version}/`;
 assert.equal(pkg.files[prefix+contract.nativeStarter.filename],contract.nativeStarter.sha256);
 const downloads=await json('exercise-downloads.json');assert.equal(downloads.version,manifest.version);
 assert.equal(pkg.files['exercise-downloads.json'],digest(await readFile(safePath(book,'exercise-downloads.json'))));
 for(const d of downloads.downloads){const data=await readFile(safePath(book,d.path));assert.equal(pkg.files[d.path],d.sha256);assert.equal(digest(data),d.sha256);assert.equal(data.length,d.bytes);assert.equal(d.url,`/claude-design/editions/v${manifest.version}/${d.filename}`);}
 const sample=contract.sample.repositoryPath.slice('claude-design/'.length);assert.ok(pkg.files[sample],'Candidate exercise must be pinned');
 const companion=await json('figma-companion.json');assert.equal(companion.handbookEdition,manifest.version);assert.equal(pkg.files[prefix+'figma-companion.json'],digest(await readFile(safePath(book,'figma-companion.json'))));
 assert.equal(companion.artifacts.find(a=>a.role==='starting material')?.sha256,contract.nativeStarter.sha256);
 const archive=readExplorationArchive(safePath(book,sample),contract);
 assert.equal(archive.sha256['velori-store/'+contract.nativeStarter.filename],contract.nativeStarter.sha256,'Archived native starter differs');
 const continuation=companion.artifacts.find(a=>a.role==='static editable answer key');assert.ok(continuation);assert.equal(archive.sha256['velori-store/'+continuation.filename],continuation.sha256,'Archived native continuation differs');
 if(contract.nativeEvidence){
  const records={};for(const key of Object.keys(nativePaths(contract.nativeEvidence.edition))){const row=contract.nativeEvidence[key],bytes=await readFile(safePath(root,row.path));assert.equal(digest(bytes),row.sha256,'Stale retained native evidence: '+key);records[key]={sha256:digest(bytes),data:JSON.parse(bytes)};}
  validateExplorationNativeEvidence(contract,{version:manifest.version,records,companion});
  const candidateProof=async row=>{assert.ok(row?.path.startsWith(`claude-design/qa/v${manifest.version}/`),'Current candidate proof must be edition-local');const file=safePath(book,row.path.slice('claude-design/'.length));assert.ok((await lstat(file)).isFile());assert.equal(await realpath(file),file);const bytes=await readFile(file);assert.equal(digest(bytes),row.sha256,'Stale candidate proof');return {sha256:digest(bytes),data:JSON.parse(bytes)};};
  const retainedProof=async row=>{const file=safePath(root,row.path);assert.ok((await lstat(file)).isFile());assert.equal(await realpath(file),file);const bytes=await readFile(file);assert.equal(digest(bytes),row.sha256,'Stale retained prototype proof');return {sha256:digest(bytes),data:JSON.parse(bytes)};};
  const loadPrototype=contract.prototypeEvidence.edition?retainedProof:candidateProof;
  const {data:proof}=await loadPrototype(contract.prototypeEvidence),source=await loadPrototype(proof.sourceEvidence);
  validateExplorationPrototypeEvidence(proof,{version:contract.prototypeEvidence.edition??manifest.version,prototypeSha256:archive.sha256['velori-store/answer-key/velori-review-prototype.html'],sourceSha256:source.sha256,sourceData:source.data});
  if(contract.companionParityEvidence){
   const {data:parity}=await candidateProof(contract.companionParityEvidence),validationRecords={};
   for(const key of ['figma','react']){const row=parity[key]?.validation;currentEvidencePin(row,manifest.version,key+' validation');validationRecords[key]=await candidateProof(row);}
   validateExplorationCompanionParity(parity,{version:manifest.version,contract,nativeRecords:records,companion,archive,prototypeProof:proof,validationRecords});
  }
 }
 const html=await readFile(safePath(book,pkg.html),'utf8');
 const variants=await resolvePdfVariants(book,{id:'claude-design',...manifest},variantPin,{collectionRoot:root,candidate:true});
 assert.deepEqual(variants.map(v=>v.theme).sort(),['dark','light']);
 for(const v of variants){
  const validation=await json(`qa/v${manifest.version}/${v.theme==='light'?'daytime':'late-night'}-validation.json`);
  assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);assert.equal(v.pages,manifest.pages);assert.equal(validation.stats.pages,manifest.pages);
  validateExplorationContent(execFileSync('pdftotext',[safePath(root,v.path),'-'],{encoding:'utf8'}),html,manifest.version,{candidate:true});
 }
 console.log(JSON.stringify({status:'passed',mode:'candidate',book,edition:manifest.version,publicationApproved:false},null,2));
}
