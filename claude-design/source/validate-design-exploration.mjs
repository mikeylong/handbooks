import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest,safePath} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {resolvePdfVariants} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {validateLibrary,validatePackage,APPROVAL_REGISTRY} from '../../site/scripts/book-sources.mjs';
const host='https://handbooks.surfaces.systems';
export function validateExplorationContract(manifest){
 const c=manifest.releaseContract;
 assert.equal(c?.kind,'design-exploration');
 assert.match(manifest.version,/^[2-9]\d*\.\d+\.\d+$/);
 assert.equal(c.chapterCount,9);
 assert.deepEqual(c.classifiedChangeIds,['D01','D02','D03','D04']);
 const file=`velori-design-exploration-v${manifest.version}.zip`;
 assert.equal(c.sample.publicUrl,`${host}/claude-design/editions/v${manifest.version}/${file}`);
 assert.equal(c.sample.repositoryPath,`claude-design/reader/editions/v${manifest.version}/${file}`);
 assert.equal(c.nativeStarter.filename,'velori-design-exploration-starter.fig');
 assert.match(c.nativeStarter.sha256,/^[a-f0-9]{64}$/);
 return c;
}
export function validateExplorationContent(text,html,version,{candidate=false}={}){
 text=text.replace(/\s+/g,' ');
 for(const value of ['Explore design directions','Refine the design','Build the connected experience','Review with people','Hand off to Claude Code','Continue in Figma when needed','Run the guided exercise'])assert.ok(text.includes(value)&&html.includes(value),value);
 assert.ok(text.includes('direct edit')&&text.includes('unsupported'),'Observed direct-editor limit must remain visible');
 assert.ok(text.includes('no prototype connections or choice-state wiring'),'Static Figma continuation limit must remain visible');
 assert.equal((html.match(/class="chapter-art"/g)||[]).length,9);
 assert.ok(html.includes(`velori-design-exploration-v${version}.zip`));
 if(!candidate)assert.doesNotMatch(html,/Publication has not been approved/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(m[1]),'Missing target '+m[1]);
}
export async function validateExplorationRelease(root){
 const book=resolve(root,'claude-design');
 const json=async p=>JSON.parse(await readFile(safePath(root,p),'utf8'));
 const bytes=async p=>readFile(safePath(root,p));
 const pinned=async row=>{assert.equal(digest(await bytes(row.path)),row.sha256,'Stale proof '+row.path);return json(row.path);};
 const catalog=await json('catalog.json'),pin=validateLibrary(catalog).find(x=>x.id==='claude-design');
 const pkg=await validatePackage(book,pin),manifest=await json('claude-design/release-manifest.json'),contract=validateExplorationContract(manifest);
 assert.equal(manifest.approvalStatus,'approved');assert.equal(manifest.version,pin.version);assert.equal(manifest.pages,pin.pages);assert.equal(manifest.sha256,pin.pdfSha256);
 const approval=await pinned(manifest.publicationApproval);assert.equal(approval.status,'approved');assert.equal(approval.command,'Land this');
 assert.equal(approval.manuscript.sha256,digest(await bytes(approval.manuscript.path)));assert.ok(approval.limitations.includes('Human task review has not been completed. The author walkthrough is not usability evidence.'));
 const publication=await json('claude-design/publication.json');assert.equal(publication.approvalStatus,'approved');assert.equal(publication.editionUrl,pin.editionUrl);
 const ledger=await json('claude-design/change-ledger.json'),decision=await json('claude-design/changelog-decision.json');
 assert.equal(ledger.accepted,true);assert.equal(ledger.version,manifest.version);assert.deepEqual(ledger.changes,decision.expectedEntries);assert.deepEqual(ledger.classifiedChangeIds,contract.classifiedChangeIds);
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
 const roundtrip=await json(`claude-design/qa/v${manifest.version}/figma-roundtrip-validation.json`);assert.equal(roundtrip.status,'passed');assert.match(roundtrip.scope,/same account/);assert.equal(roundtrip.validation.missingFonts.length,0);assert.equal(roundtrip.validation.reactions,0);assert.equal(roundtrip.validation.styledTexts,22);assert.equal(roundtrip.validation.instances.length,10);assert.ok(roundtrip.validation.instances.every(i=>i.mainComponent?.id));assert.equal(roundtrip.validation.variableBoundNodes,66);
 const variants=await resolvePdfVariants(book,{id:'claude-design',...manifest},APPROVAL_REGISTRY.books.find(x=>x.id==='claude-design').variantManifest,{collectionRoot:root});
 assert.deepEqual(variants.map(v=>v.theme).sort(),['dark','light']);
 for(const v of variants){assert.ok(approval.pdfs.some(p=>p.path===v.path&&p.sha256===v.sha256));assert.equal(digest(await bytes(v.path)),v.sha256);const validation=await json(`claude-design/qa/v${manifest.version}/${v.theme==='light'?'daytime':'late-night'}-validation.json`);assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);assert.equal(v.pages,53);validateExplorationContent(execFileSync('pdftotext',[safePath(root,v.path),'-'],{encoding:'utf8'}),html,manifest.version);}
 const zipCheck=execFileSync('python3',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert len(z.namelist())==209; assert z.testzip() is None; assert "answer-key/velori-review-continuation.fig" in z.namelist() or any(n.endswith("answer-key/velori-review-continuation.fig") for n in z.namelist()); print("209 archive members verified")',safePath(root,contract.sample.repositoryPath)],{encoding:'utf8'}).trim();
 console.log(JSON.stringify({status:'passed',edition:manifest.version,pages:53,chapters:9,archive:zipCheck,trialLimits:approval.limitations,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256}))},null,2));
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
 const html=await readFile(safePath(book,pkg.html),'utf8');
 const variants=await resolvePdfVariants(book,{id:'claude-design',...manifest},variantPin,{collectionRoot:root,candidate:true});
 assert.deepEqual(variants.map(v=>v.theme).sort(),['dark','light']);
 for(const v of variants){
  const validation=await json(`qa/v${manifest.version}/${v.theme==='light'?'daytime':'late-night'}-validation.json`);
  assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);
  validateExplorationContent(execFileSync('pdftotext',[safePath(root,v.path),'-'],{encoding:'utf8'}),html,manifest.version,{candidate:true});
 }
 console.log(JSON.stringify({status:'passed',mode:'candidate',book,edition:manifest.version,publicationApproved:false},null,2));
}
