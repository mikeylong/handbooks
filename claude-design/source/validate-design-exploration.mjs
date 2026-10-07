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
  assert.equal(c.prototypeEvidence?.path,`claude-design/qa/v${manifest.version}/prototype-behavior.json`,'Tracked current prototype evidence required');
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
 assert.deepEqual(companion.artifacts.map(({filename,role,sha256,bytes,format})=>({filename,role,sha256,bytes,format})),originalCompanion.artifacts.map(({filename,role,sha256,bytes,format})=>({filename,role,sha256,bytes,format})),'Retained native artifact identity changed');
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
 assert.ok(proof.limitations?.some(value=>/No new native Claude Design.*Figma cart frame/i.test(value)),'Retained native trial scope must remain explicit');
}
function readExplorationArchive(path,contract){
 const code=`import zipfile,sys,json,hashlib
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); assert len(names)==int(sys.argv[2]); assert len(set(names))==len(names); assert z.testzip() is None
assert all(not n.startswith('/') and '..' not in n.split('/') for n in names)
required=['velori-store/velori-design-exploration-starter.fig','velori-store/answer-key/velori-review-continuation.fig','velori-store/answer-key/velori-review-prototype.html']
assert all(n in names for n in required)
print(json.dumps({'members':len(names),'sha256':{n:hashlib.sha256(z.read(n)).hexdigest() for n in required}}))`;
 return JSON.parse(execFileSync('python3',['-c',code,path,String(contract.archiveMemberCount??209)],{encoding:'utf8'}));
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
 const approval=await pinned(manifest.publicationApproval);assert.equal(approval.status,'approved');assert.equal(approval.command,'Land this');
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
  const proof=await pinned(contract.prototypeEvidence),source=proof.sourceEvidence;assert.ok(source?.path.startsWith(`claude-design/qa/v${manifest.version}/`));
  const sourceData=await pinned(source);validateExplorationPrototypeEvidence(proof,{version:manifest.version,prototypeSha256:archive.sha256['velori-store/answer-key/velori-review-prototype.html'],sourceSha256:digest(await bytes(source.path)),sourceData});
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
  const {data:proof}=await candidateProof(contract.prototypeEvidence),source=await candidateProof(proof.sourceEvidence);
  validateExplorationPrototypeEvidence(proof,{version:manifest.version,prototypeSha256:archive.sha256['velori-store/answer-key/velori-review-prototype.html'],sourceSha256:source.sha256,sourceData:source.data});
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
