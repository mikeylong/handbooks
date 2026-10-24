#!/usr/bin/env node
/** End-to-end assembly fixtures against disposable copies of frozen candidates. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile, mkdtemp, cp, lstat, stat, readdir, readlink, realpath, symlink} from 'node:fs/promises';
import {resolve, dirname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildCandidateReader, measureCandidatePdf, validateCandidatePackage, candidateReaderBookInputNames, selectedCandidateBookInput} from './build-candidate-reader.mjs';
import {digest} from './reader-paths.mjs';

const json=async path=>JSON.parse(await readFile(path,'utf8'));
const save=async(path,value)=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n');};

/** Hash every file/link selected by staging, not a sample of manifest paths. */
async function snapshotReaderInputs(books) {
 const entries={};
 async function visit(path,filter=()=>true,ancestors=new Set()) {
  if(!filter(path)||entries[path])return;
  let info;try{info=await lstat(path);}catch(error){if(error.code==='ENOENT'){entries[path]={type:'missing'};return;}throw error;}
  const link=info.isSymbolicLink()?{target:await readlink(path),resolved:await realpath(path)}:null;
  if(link)info=await stat(path);
  if(info.isDirectory()) {
   const actual=await realpath(path);if(ancestors.has(actual))throw Error('Cyclic frozen input link: '+path);
   entries[path]={type:link?'directory-symlink':'directory',...(link??{}),mode:info.mode};
   const next=new Set(ancestors);next.add(actual);
   for(const child of (await readdir(path)).sort())await visit(resolve(path,child),filter,next);
  }else if(info.isFile()) {
   const bytes=await readFile(path);entries[path]={type:link?'file-symlink':'file',...(link??{}),mode:info.mode,bytes:bytes.length,sha256:digest(bytes)};
  }else throw Error('Unsupported frozen input kind: '+path);
 }
 for(const book of books) {
  const approved=await json(resolve(book.bookRoot,'publication-package.json'));
  for(const name of await candidateReaderBookInputNames(book.bookRoot,approved))await visit(resolve(book.bookRoot,name),selectedCandidateBookInput);
  for(const file of [book.light.pdf,book.dark.pdf,book.light.pageMap,book.dark.pageMap,book.parity])await visit(file);
  const baselineFile=typeof book.baselineManifest==='string'?book.baselineManifest:book.baselineManifest?.path??resolve(book.bookRoot,'release-manifest.json');await visit(baselineFile);
  const baseline=await json(baselineFile);await visit(resolve(dirname(baselineFile),baseline.pdf));
  for(const [name,value]of Object.entries(book.candidateEvidence??{})) {
   if(name==='mode')continue;
   const file=typeof value==='string'?value:value.path;await visit(file);
   if(name==='editionDiff')for(const patch of Object.values((await json(file)).artifacts??{}))await visit(resolve(dirname(file),patch));
   if(book.candidateEvidence.mode==='production'&&['lightValidation','darkValidation'].includes(name)) {
    const report=await json(file);for(const kind of ['validator','log'])await visit(report[kind].path);
   }
  }
  const exercisesRoot=book.exerciseSourceRoot??book.bookRoot,exerciseFile=resolve(exercisesRoot,'exercise-downloads.json');
  await visit(exerciseFile);
  try{for(const row of (await json(exerciseFile)).downloads)await visit(resolve(exercisesRoot,row.path));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(book.rawReader)await visit(book.rawReader,path=>!path.endsWith('.pdf'));
  for(const name of ['gallery.css','gallery-focus.js','assets/favicon.png'])await visit(resolve(book.assetsDirectory,name));
  await visit(book.fontsDirectory);
 }
 await visit(resolve(dirname(fileURLToPath(import.meta.url)),'../assets/reader'));
 return entries;
}

/** Config: {outputParent, books:[buildCandidateReader options without output]}. */
export async function testCandidateReaders({outputParent,books}) {
 if(!isAbsolute(outputParent??''))throw Error('Fixture outputParent must be an explicit absolute path');
 if(!Array.isArray(books)||!books.length)throw Error('At least one real candidate fixture is required');
 await mkdir(outputParent,{recursive:true});const run=await mkdtemp(resolve(outputParent,'candidate-readers.'));
 const results=[],protectedInputs=await snapshotReaderInputs(books);
 await save(resolve(run,'frozen-inputs-before.json'),protectedInputs);
 for(const book of books) {
  const output=resolve(run,book.id);
  try {
   const result=await buildCandidateReader({...book,output});
   assert.equal(result.status,'passed');
   const reader=await readFile(result.reader,'utf8'),md=await readFile(result.markdown,'utf8');
   assert.ok(reader.includes('Version '+result.edition.version));
   assert.ok(md.includes('version: '+JSON.stringify(result.edition.version)));
   for(const text of book.requiredContent??[]){assert.ok(reader.includes(text),'Missing changed candidate reader content: '+text);assert.ok(md.includes(text),'Missing changed candidate Markdown content: '+text);}
   assert.ok((reader.match(/data-artwork-paired="true"/g)??[]).length>0,'No paired chapter artwork');
   assert.ok(reader.includes('class="handbooks-return-mobile"'),'Missing mobile candidate return');
   const packageGate=await validateCandidatePackage(output),staged=resolve(output,'work/book');
   const pkg=await json(resolve(staged,'publication-package.json')),manifest=await json(resolve(staged,'release-manifest.json'));
   assert.equal(pkg.version,result.edition.version);assert.equal(pkg.readerSha256,result.readerSha256);
   assert.equal(pkg.approvalStatus,'candidate');assert.equal(pkg.publicationApproved,false);assert.equal(pkg.approvalBasis,undefined);assert.equal(pkg.historicalCommit,undefined);
   const baseline=await json(typeof book.baselineManifest==='string'?book.baselineManifest:book.baselineManifest?.path??resolve(book.bookRoot,'release-manifest.json'));
   assert.equal(manifest.previous_public_edition,baseline.version);assert.equal(manifest.baseline.sha256,baseline.sha256);
   assert.equal(manifest.comparison_basis,'approved public edition');
   const oldPackage=await readFile(resolve(book.bookRoot,'publication-package.json'));
   assert.equal(digest(await readFile(resolve(staged,'historical/input-metadata/publication-package.json'))),digest(oldPackage));
   const oldManifest=await json(resolve(book.bookRoot,'release-manifest.json'));
   if(oldManifest.releaseContract) {
    const contract=structuredClone(oldManifest.releaseContract);delete contract.classifiedChangeIds;
    assert.deepEqual(manifest.retainedProvenance.releaseContract,contract);
    assert.equal(manifest.retainedProvenance.status,'historical_only_not_reverified');
    assert.deepEqual(manifest.releaseContract.classifiedChangeIds,manifest.classifiedChangeIds);
    assert.equal(manifest.releaseContract.nativeOrPrototypeEvidenceStatus,'historical_only_not_reverified');
   }
   if(pkg.files['exercise-downloads.json']) {
    const definition=await json(resolve(staged,'exercise-downloads.json'));
    assert.equal(definition.version,result.edition.version);assert.equal(definition.nativeEvidenceStatus,'historical_only_not_reverified');
    for(const row of definition.downloads) {
     const file=resolve(output,'site',row.url.slice(1));assert.equal(digest(await readFile(file)),row.sha256);assert.equal((await stat(file)).size,row.bytes);
     assert.ok(reader.includes(row.url),'Retained exercise reader link missing');assert.ok(md.includes(row.url),'Retained exercise Markdown link missing');
     assert.equal(pkg.files[row.path],row.sha256);
    }
   }
   results.push({name:book.id+' real candidate assembly',status:'passed',output,reader:result.reader,markdown:result.markdown,edition:result.edition,packageGate,assertions:{changedContent:book.requiredContent??[],pairedArtwork:true,editionLocalMetadata:true,baselineIdentity:true,historicalApprovalNotInherited:true,nativePrototypeProvenance:oldManifest.releaseContract?'historical identity retained, not reverified':'not applicable',retainedExerciseDownloads:pkg.files['exercise-downloads.json']?'exact routes, hashes, sizes and reader/Markdown links passed':'not applicable',changeIds:manifest.classifiedChangeIds,retainedHistoricalChangelog:manifest.changelog.retainedHistoricalChangelog}});
  }catch(error){results.push({name:book.id+' real candidate assembly',status:'failed',output,error:error.message});}
 }
 // Exercise every output contract implicated in the earlier failed cycles.
 const fixture=books.find(book=>!book.rawReader)??books[0],measured=await measureCandidatePdf(fixture.light.pdf);
 const negativeCases=[
  ['stale-version',{expected:{version:'999.0.0'}},/Stale expected PDF version/],
  ['helper-timestamp-version',{expected:{version:'20261012.142411'}},/full semver/],
  ['stale-pages',{expected:{pages:measured.pages+1}},/Stale expected PDF pages/],
  ['stale-hash',{expected:{sha256:'0'.repeat(64)}},/Stale expected PDF sha256/],
  ['missing-assets-directory',{assetsDirectory:resolve(run,'missing-site-assets')},/ENOENT/],
  ['missing-candidate-evidence',{candidateEvidence:undefined},/candidateEvidence is required/],
 ];
 for(const [name,mutate,error]of [
  ['stale-validation-artifact',value=>{value.artifactSha256='0'.repeat(64);},/Wrong candidate PDF validation identity/],
  ['failed-validation',value=>{value.status='failed';},/Wrong candidate PDF validation identity/],
  ['stale-validation-pages',value=>{if(value.stats)value.stats.pages++;else value.pages++;},/Wrong candidate PDF validation identity/],
 ]) {
  const value=await json(typeof fixture.candidateEvidence.lightValidation==='string'?fixture.candidateEvidence.lightValidation:fixture.candidateEvidence.lightValidation.path);mutate(value);
  const file=resolve(run,'negative-inputs',name+'.json');await save(file,value);
  negativeCases.push([name,{candidateEvidence:{...fixture.candidateEvidence,lightValidation:file}},error]);
 }
 const wrongDecision=await json(typeof fixture.candidateEvidence.changelogDecision==='string'?fixture.candidateEvidence.changelogDecision:fixture.candidateEvidence.changelogDecision.path);
 wrongDecision.readerFacingContentChanged=!wrongDecision.readerFacingContentChanged;const wrongDecisionFile=resolve(run,'negative-inputs/wrong-changelog-decision.json');await save(wrongDecisionFile,wrongDecision);
 negativeCases.push(['comparison-decision-disagreement',{candidateEvidence:{...fixture.candidateEvidence,changelogDecision:wrongDecisionFile}},/changelog decision disagrees/]);
 negativeCases.push(['stale-evidence-file-hash',{candidateEvidence:{...fixture.candidateEvidence,lightValidation:{path:typeof fixture.candidateEvidence.lightValidation==='string'?fixture.candidateEvidence.lightValidation:fixture.candidateEvidence.lightValidation.path,sha256:'0'.repeat(64)}}},/Stale candidate evidence hash/]);
 // A wrong but existing site directory must also fail before a build begins.
 await mkdir(resolve(run,'empty-site-assets'));negativeCases.push(['wrong-site-layout',{assetsDirectory:resolve(run,'empty-site-assets')},/ENOENT/]);
 const staleMap=resolve(run,'negative-inputs/stale-page-map.json');await mkdir(dirname(staleMap),{recursive:true});
 const map=await json(fixture.light.pageMap);map.sha256='0'.repeat(64);await save(staleMap,map);
 negativeCases.push(['stale-map',{light:{...fixture.light,pageMap:staleMap}},/Wrong page map identity/]);
 const staleParity=resolve(run,'negative-inputs/stale-parity.json'),pair=await json(fixture.parity);pair.retainedSha256='0'.repeat(64);await save(staleParity,pair);
 negativeCases.push(['stale-pair-proof',{parity:staleParity},/Pair proof does not bind/]);
 const missingRuntime=resolve(run,'negative-inputs/raw-missing-runtime');
 await cp(resolve(run,fixture.id,'raw-reader'),missingRuntime,{recursive:true});
 const missingHtml=resolve(missingRuntime,'index.html');await writeFile(missingHtml,(await readFile(missingHtml,'utf8')).replace('</head>','<script src="/missing-runtime-fixture.js"></script></head>'));
 negativeCases.push(['missing-runtime-asset',{rawReader:missingRuntime},/Missing local runtime asset/]);
 for(const [name,overrides,expectedError] of negativeCases) {
  const output=resolve(run,'negative-'+name);
  try{await buildCandidateReader({...fixture,...overrides,output});results.push({name,status:'failed',error:'Invalid candidate was accepted'});}
  catch(error){results.push({name,status:expectedError.test(error.message)?'passed':'failed',rejectedAs:error.message,output});}
 }
 // Corrupt only disposable copies of a newly assembled package, never an old run.
 for(const [name,mutate,pattern]of [
  ['inherited-approval',async output=>{const file=resolve(output,'work/book/publication-package.json'),value=await json(file);value.approvalBasis='Historical production approval';await save(file,value);},/inherited approval/],
  ['stale-package-version',async output=>{const file=resolve(output,'work/book/publication-package.json'),value=await json(file);value.version='999.0.0';await save(file,value);},/edition identity mismatch/],
  ['unlisted-payload',async output=>writeFile(resolve(output,'work/book/unlisted.txt'),'unlisted payload\n'),/file inventory mismatch/],
  ['modified-source-payload',async output=>writeFile(resolve(output,'work/book/release-manifest.json'),(await readFile(resolve(output,'work/book/release-manifest.json'),'utf8'))+' '),/file inventory mismatch/],
  ['modified-shared-asset',async output=>writeFile(resolve(output,'site/theme.css'),(await readFile(resolve(output,'site/theme.css'),'utf8'))+'\n/* corrupted disposable fixture */'),/full inventory mismatch/],
  ['widened-inventory-exclusion',async output=>{const file=resolve(output,'candidate-package-inventory.json'),value=await json(file);value.excluded.push('site/theme.css');await save(file,value);},/unsafe exclusions/],
 ]) {
  const output=resolve(run,'negative-package-'+name);await cp(resolve(run,fixture.id),output,{recursive:true});await mutate(output);
  try{await validateCandidatePackage(output);results.push({name,status:'failed',error:'Corrupt package accepted'});}catch(error){results.push({name,status:pattern.test(error.message)?'passed':'failed',rejectedAs:error.message,output});}
 }
 const exerciseFixture=books.find(book=>book.id==='claude-design');
 if(exerciseFixture) {
  const source=resolve(run,'negative-inputs/missing-retained-exercises');await mkdir(source,{recursive:true});
  const output=resolve(run,'negative-missing-retained-exercises');
  try{await buildCandidateReader({...exerciseFixture,exerciseSourceRoot:source,output});results.push({name:'missing-retained-exercises',status:'failed',error:'Missing historical exercise files accepted'});}
  catch(error){results.push({name:'missing-retained-exercises',status:error.code==='ENOENT'?'passed':'failed',rejectedAs:error.message,output});}
 }
 // Once an output exists, a second execution must not erase/retry it.
 const preserve=resolve(run,'negative-existing-output');await mkdir(preserve);await writeFile(resolve(preserve,'sentinel.txt'),'preserve this failed run\n');
 try{await buildCandidateReader({...fixture,output:preserve});results.push({name:'existing-run-preserved',status:'failed',error:'Existing output was reused'});}
 catch(error){results.push({name:'existing-run-preserved',status:error.code==='EEXIST'&&(await readFile(resolve(preserve,'sentinel.txt'),'utf8'))==='preserve this failed run\n'?'passed':'failed',rejectedAs:error.message});}
 // Read-only input aliases are acceptable; their copied output must be frozen,
 // regular data rather than links back into canonical input folders.
 const inputAliases=resolve(run,'readonly-input-aliases');await mkdir(inputAliases);
 const aliases={bookRoot:resolve(inputAliases,'book'),assetsDirectory:resolve(inputAliases,'site-assets'),fontsDirectory:resolve(inputAliases,'fonts')};
 for(const [name,path]of Object.entries(aliases))await symlink(fixture[name],path,'dir');
 const aliasedFixture={...fixture,...aliases,rawReader:resolve(run,fixture.id,'raw-reader')};const aliasBefore=await snapshotReaderInputs([aliasedFixture]);
 try {
  const output=resolve(run,'positive-readonly-aliases');await buildCandidateReader({...aliasedFixture,output});
  const aliasAfter=await snapshotReaderInputs([aliasedFixture]);const same=JSON.stringify(aliasBefore)===JSON.stringify(aliasAfter);
  const links=await Promise.all(Object.entries(aliases).map(async([name,path])=>await readlink(path)===fixture[name]));
  const frozenFonts=!(await lstat(resolve(output,'site/assets/fonts'))).isSymbolicLink();
  results.push({name:'readonly-input-aliases-preserved',status:same&&links.every(Boolean)&&frozenFonts?'passed':'failed',inputEntries:Object.keys(aliasBefore).length,linksPreserved:links.every(Boolean),outputFontsRegular:frozenFonts});
 }catch(error){results.push({name:'readonly-input-aliases-preserved',status:'failed',error:error.message});}
 // Disposable stand-in for a canonical book: no operation may reach its sentinel.
 const canonical=resolve(run,'canonical-sentinel'),sentinel=resolve(canonical,'sentinel.txt'),redirect=resolve(run,'redirect-output-parent'),bookAlias=resolve(run,'canonical-input-alias');
 await mkdir(canonical);await writeFile(sentinel,'canonical bytes must remain untouched\n');const sentinelHash=digest(await readFile(sentinel));
 await symlink(canonical,redirect,'dir');await symlink(canonical,bookAlias,'dir');
 for(const [name,overrides,pattern]of [
  ['symlink-output-parent',{output:resolve(redirect,'candidate')},/redirecting symlink/],
  ['symlink-ancestor-missing-tail',{output:resolve(redirect,'missing','candidate')},/redirecting symlink/],
  ['real-input-alias-overlap',{bookRoot:bookAlias,output:resolve(canonical,'candidate')},/real input path/],
 ]) {
  try{await buildCandidateReader({...fixture,...overrides});results.push({name,status:'failed',error:'Unsafe redirected output accepted'});}
  catch(error){const preserved=digest(await readFile(sentinel))===sentinelHash&&(await readdir(canonical)).join(',')==='sentinel.txt'&&await readlink(redirect)===canonical&&await readlink(bookAlias)===canonical;results.push({name,status:pattern.test(error.message)&&preserved?'passed':'failed',rejectedAs:error.message,sentinelPreserved:preserved});}
 }
 const after=await snapshotReaderInputs(books);await save(resolve(run,'frozen-inputs-after.json'),after);
 const changed=[...new Set([...Object.keys(protectedInputs),...Object.keys(after)])].filter(path=>JSON.stringify(protectedInputs[path])!==JSON.stringify(after[path]));
 results.push({name:'frozen-fixture-inputs-unchanged',status:changed.length?'failed':'passed',entries:Object.keys(protectedInputs).length,files:Object.values(protectedInputs).filter(entry=>entry.sha256).length,symlinks:Object.values(protectedInputs).filter(entry=>entry.target).length,changed});
 const report={schemaVersion:1,status:results.every(result=>result.status==='passed')?'passed':'failed',finishedAt:new Date().toISOString(),output:run,results,limitations:['These fixture checks validate orchestration and reader identity, not fresh research or release readiness. Browser/perceptual proof is a separate caller-owned gate.']};
 await save(resolve(run,'test-results.json'),report);return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw Error('Usage: test-candidate-reader.mjs /absolute/fixture-config.json');
 const report=await testCandidateReaders(await json(resolve(process.argv[2])));console.log(JSON.stringify(report,null,2));if(report.status!=='passed')process.exitCode=1;
}
