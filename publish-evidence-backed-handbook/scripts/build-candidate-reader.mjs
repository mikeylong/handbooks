#!/usr/bin/env node
/** Isolated candidate reader assembly. Never mutates its source book or a release. */
import {cp, mkdir, readFile, writeFile, lstat, access, realpath, readdir, rename} from 'node:fs/promises';
import {resolve, dirname, basename, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {digest, safePath} from './reader-paths.mjs';
import {validateVariantIdentity, resolvePdfVariants, installReaderDownloads, validateDownloads, downloadLinks} from './pdf-downloads.mjs';
import {installDiagrams} from './diagrams.mjs';
import {installPromptBlocks} from './prompt-blocks.mjs';
import {installTerminalBlocks} from './terminal-blocks.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';
import {writeMarkdownEdition} from './markdown-downloads.mjs';
import {editionLinks} from './edition-links.mjs';
import {removePublicationReview, removeSidebarPublication, validatePublicationFront} from './publication-front.mjs';
import {addSiteTheme, validateSiteTheme} from './site-theme.mjs';
import {exerciseDownloadLinks} from './exercise-downloads.mjs';

const execute = promisify(execFile);
const toolkit = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const semver = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/;
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, value) => { await mkdir(dirname(path), {recursive:true}); await writeFile(path, JSON.stringify(value,null,2)+'\n'); };
const inside = (parent, child) => { const p=relative(parent,child); return p==='' || (!p.startsWith('..')&&!isAbsolute(p)); };
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const dateLabel = date => new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const hashPattern=/^[a-f0-9]{64}$/;
const evidenceNames=['lightValidation','darkValidation','changelogDecision','editionDiff','changes','retainedChangelogDecision','productionChangelog'];
const inputFile=value=>typeof value==='string'?value:value?.path;
const assemblyExclusions=['candidate-package-inventory.json','candidate-package-validation.json','reader-status.json','failure.log'];

async function evidenceFile(value,name) {
 const file=inputFile(value);
 if(!isAbsolute(file??''))throw Error('Explicit absolute candidate evidence required: '+name);
 if(!(await lstat(file)).isFile())throw Error('Candidate evidence must be a regular file: '+name);
 const bytes=await readFile(file),sha256=digest(bytes);
 if(value?.sha256&&value.sha256!==sha256)throw Error('Stale candidate evidence hash: '+name);
 return {file,sha256,bytes:bytes.length,data:JSON.parse(bytes)};
}

async function loadCandidateEvidence(options,measurements,baseline) {
 const supplied=options.candidateEvidence;
 if(!supplied)throw Error('Explicit candidateEvidence is required; inherited QA cannot approve a candidate');
 const records={};
 const production=supplied.mode==='production';
 if(supplied.mode&&!['standard','production'].includes(supplied.mode))throw Error('Unknown candidate evidence mode');
 for(const name of evidenceNames)if(supplied[name])records[name]=await evidenceFile(supplied[name],name);
 for(const name of ['lightValidation','darkValidation','changelogDecision','editionDiff'])if(!records[name])throw Error('Missing candidate evidence: '+name);
 for(const [name,theme]of [['lightValidation','light'],['darkValidation','dark']]) {
  const r=records[name].data;
  if(r.status!=='passed'||(!production&&r.profile!=='candidate')||r.failures?.length||r.artifactSha256!==measurements[theme].sha256||(production?r.pages:r.stats?.pages)!==measurements[theme].pages)throw Error('Wrong candidate PDF validation identity or status: '+name);
  if(production)for(const kind of ['validator','log']) {
   if(!hashPattern.test(r[kind]?.sha256??''))throw Error('Production validation requires exact validator/log hashes: '+name);
   const file=r[kind].path;if(!isAbsolute(file??'')||!(await lstat(file)).isFile())throw Error('Production validation requires a regular validator/log: '+name);
   const bytes=await readFile(file);if(digest(bytes)!==r[kind].sha256)throw Error('Stale Production validator/log hash: '+name);
   records[name+kind[0].toUpperCase()+kind.slice(1)]={file,sha256:r[kind].sha256,bytes:bytes.length,extension:kind==='log'?'.log':'.py'};
  }
 }
 const diff=records.editionDiff.data,decision=records.changelogDecision.data;
 if(diff.candidate?.pdfSha256!==measurements.light.sha256||diff.candidate?.pages!==measurements.light.pages||diff.previous?.pdfSha256!==baseline.sha256||diff.previous?.pages!==baseline.pages)throw Error('Wrong candidate edition comparison identity');
 if(!['passed','not-applicable'].includes(decision.status)||decision.failures?.length||typeof decision.readerFacingContentChanged!=='boolean'||decision.readerFacingContentChanged!==diff.readerFacingContentChanged||decision.includeChangelog!==decision.readerFacingContentChanged)throw Error('Candidate changelog decision disagrees with the exact edition comparison');
 if(production&&!records.productionChangelog)throw Error('Production requires its own productionChangelog ledger');
 const changes=records.changes?.data.changes??(production?records.productionChangelog.data.items:[])??[];
 if(!Array.isArray(changes)||Boolean(changes.length)!==decision.readerFacingContentChanged)throw Error('Accepted changes disagree with candidate changelog decision');
 if(!production&&decision.readerFacingContentChanged&&JSON.stringify(changes)!==JSON.stringify(decision.expectedEntries))throw Error('Accepted changes do not match the validated changelog entries');
 if(production&&(!Array.isArray(records.productionChangelog.data.items)||records.productionChangelog.data.previousPdfSha256!==baseline.sha256))throw Error('Production changelog does not bind the approved baseline');
 const retained=records.retainedChangelogDecision?.data;
 if(retained&&(measurements.light.sha256!==baseline.sha256||decision.readerFacingContentChanged||retained.status!=='passed'||retained.failures?.length))throw Error('Historical changelog may only describe an exactly retained approved PDF');
 const pdfDecision=retained??decision;
 for(const name of production?[]:['lightValidation','darkValidation']) {
  const actual=records[name].data.changelogDecision;
  if(actual?.decisionStatus!==pdfDecision.status||actual?.includeChangelog!==pdfDecision.includeChangelog||actual?.expectedEntryCount!==(pdfDecision.entryCount??0))throw Error('PDF validation does not bind the selected current/historical changelog decision: '+name);
 }
 for(const [kind,file]of Object.entries(diff.artifacts??{})) {
  const from=safePath(dirname(records.editionDiff.file),file),bytes=await readFile(from);
  records['editionDiff'+kind[0].toUpperCase()+kind.slice(1)]={file:from,sha256:digest(bytes),bytes:bytes.length,relativeTarget:'qa/candidate/'+file};
 }
 return {records,changes,decision,diff,mode:production?'production':'standard',changeIds:changes.map((change,i)=>change.id??change.changeId??change.change_id??change.update_id??change.update_ids?.join('+')??`candidate-change-${String(i+1).padStart(3,'0')}`)};
}

/** Complete file inventories deliberately exclude only their own digest and terminal receipts. */
async function inventory(root,excluded=[]) {
 const files={};
 async function visit(directory) {
  for(const name of (await readdir(directory)).sort()) {
   const file=resolve(directory,name),key=relative(root,file).split('\\').join('/'),info=await lstat(file);
   if(excluded.includes(key))continue;
   if(info.isSymbolicLink())throw Error('Candidate inventory contains a symlink: '+key);
   if(info.isDirectory())await visit(file);
   else if(info.isFile())files[key]=digest(await readFile(file));
   else throw Error('Candidate inventory contains an unsupported file: '+key);
  }
 }
 await visit(root);return files;
}

/** Check the complete candidate payload, not only the files named by an inherited manifest. */
export async function validateCandidatePackage(output) {
 const staged=resolve(output,'work/book'),pkg=await json(resolve(staged,'publication-package.json')),release=await json(resolve(staged,'release-manifest.json'));
 if(pkg.approvalStatus!=='candidate'||pkg.publicationApproved!==false||pkg.approvalBasis!==undefined||pkg.historicalCommit!==undefined||release.approvalStatus!=='candidate'||release.publicationApproval!==undefined)throw Error('Candidate package contains inherited approval');
 for(const key of ['version','date','pages','sha256'])if(pkg[key]!==release[key])throw Error('Candidate package edition identity mismatch: '+key);
 const actual=await inventory(staged,['publication-package.json']);
 if(JSON.stringify(actual)!==JSON.stringify(pkg.files))throw Error('Candidate package file inventory mismatch');
 if(pkg.files[pkg.html]!==pkg.readerSha256||pkg.files[release.pdf]!==release.sha256)throw Error('Candidate package reader/PDF identity mismatch');
 for(const ref of Object.values(release.candidateEvidence))if(pkg.files[ref.path]!==ref.sha256)throw Error('Candidate evidence pointer/hash mismatch');
 for(const ref of Object.values(release.pageMaps))if(pkg.files[ref.path]!==ref.sha256)throw Error('Candidate page map pointer/hash mismatch');
 if(release.candidate_validation!==release.candidateEvidence.lightValidation.path||release.previous_public_edition!==release.baseline.version||release.comparison_basis!=='approved public edition')throw Error('Candidate baseline/QA identity mismatch');
 if(pkg.files[release.baseline.pdf]!==release.baseline.sha256||pkg.files[release.baseline.manifest.path]!==release.baseline.manifest.sha256)throw Error('Candidate baseline payload identity mismatch');
 for(const file of ['publication.json','reader-edition.json','pdf-config.json']) {
  const metadata=await json(resolve(staged,file));
  for(const key of ['version','date','pages'])if(metadata[key]!==release[key])throw Error('Candidate local metadata identity mismatch: '+file+' '+key);
 }
 if(pkg.files['exercise-downloads.json']) {
  const definition=await json(resolve(staged,'exercise-downloads.json'));
  if(definition.version!==release.version||definition.nativeEvidenceStatus!=='historical_only_not_reverified')throw Error('Candidate retained exercise identity mismatch');
  for(const row of definition.downloads)if(pkg.files[row.path]!==row.sha256||digest(await readFile(safePath(output,'site/'+row.url.slice(1))))!==row.sha256)throw Error('Candidate retained exercise download mismatch');
 }
 const all=await json(resolve(output,'candidate-package-inventory.json'));
 if(JSON.stringify(all.excluded)!==JSON.stringify(assemblyExclusions))throw Error('Candidate assembly inventory has unsafe exclusions');
 if(JSON.stringify(await inventory(output,all.excluded))!==JSON.stringify(all.files))throw Error('Candidate assembly full inventory mismatch');
 return {status:'passed',packageFiles:Object.keys(actual).length,assemblyFiles:Object.keys(all.files).length,publicationApproved:false};
}

/** Resolve a not-yet-existing destination without following a redirecting parent. */
export async function assertIsolatedCandidateOutput(output, inputPaths) {
 if(!isAbsolute(output??''))throw Error('Candidate output must be an explicit absolute path');
 const requested=resolve(output),tail=[];let ancestor=requested;
 for(;;) {
  try{await lstat(ancestor);break;}catch(error){if(error.code!=='ENOENT')throw error;const parent=dirname(ancestor);if(parent===ancestor)throw error;tail.unshift(basename(ancestor));ancestor=parent;}
 }
 const actualAncestor=await realpath(ancestor);
 if(actualAncestor!==ancestor)throw Error('Candidate output has a redirecting symlink parent or target');
 const actualOutput=resolve(actualAncestor,...tail);
 for(const input of inputPaths) {
  const actualInput=await realpath(input);
  if(inside(actualInput,actualOutput)||inside(actualOutput,actualInput))throw Error('Candidate output overlaps a real input path');
 }
 return actualOutput;
}

/** Cover and Subject are measured independently; Subject-less Chromium PDFs use their cover. */
export async function measureCandidatePdf(pdf) {
 const info=(await execute('pdfinfo',[pdf],{maxBuffer:8*1024*1024})).stdout;
 const cover=(await execute('pdftotext',['-f','1','-l','1',pdf,'-'],{maxBuffer:8*1024*1024})).stdout;
 const version=cover.match(/\bVersion\s+(\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?)/)?.[1];
 const label=cover.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/);
 const date=label ? `${label[3]}-${String(['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(label[1])+1).padStart(2,'0')}-${label[2].padStart(2,'0')}` : null;
 const subject=info.match(/^Subject:\s+(.*)$/m)?.[1]??'';
 const subjectIdentity=subject.match(/Content edition\s+(\S+)\s+·\s+(\d{4}-\d{2}-\d{2})/);
 const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
 const bytes=await readFile(pdf);
 if(!semver.test(version??'') || !date || !Number.isSafeInteger(pages)||pages<1) throw Error('PDF cover lacks a complete measured content-edition identity');
 if(subjectIdentity && (subjectIdentity[1]!==version || subjectIdentity[2]!==date)) throw Error('PDF Subject and cover edition identity disagree');
 const title=(info.match(/^Title:\s+(.*)$/m)?.[1]??'').replace(/\s+·\s+(Daytime version|Late night version)$/,'');
 return {title,version,date,pages,sha256:digest(bytes),bytes:bytes.length,subject,cover};
}

export async function candidateReaderBookInputNames(source, approved) {
 const config=await json(resolve(source,'pdf-config.json')).catch(error=>{if(error.code==='ENOENT')return {};throw error;});
 const names=['source','assets','pdf-config.json','release-manifest.json','publication.json','publication-package.json','exercise-downloads.json','artwork-pairs.json','diagram-bindings.json','prompt-bindings.json','terminal-bindings.json','reader-edition.json','package.json','Claude_Design_Field_Guide_Source.md',approved.readerDirectory,...(config.readerInputs??[]),...[config.markdown,config.screenshotManifest].filter(Boolean)];
 return [...new Set(names)];
}
export const selectedCandidateBookInput = path => !path.split(/[\\/]/).some(part=>['__pycache__','editions','node_modules','.git'].includes(part))&&!path.endsWith('.pyc')&&!path.endsWith('.pdf');
async function copyBookInputs(source, target, approved) {
 await mkdir(target,{recursive:true});
 for(const name of await candidateReaderBookInputNames(source,approved)) {
  const from=safePath(source,name), to=safePath(target,name);
  try { await lstat(from); } catch(error) { if(error.code==='ENOENT')continue; throw error; }
  await cp(from,to,{recursive:true,dereference:true,filter:selectedCandidateBookInput});
 }
}

async function stageRetainedExercises({source,target,approved,id,version}) {
 const definitionFile=resolve(source,'exercise-downloads.json');let bytes;
 try{bytes=await readFile(definitionFile);}catch(error){if(error.code==='ENOENT'&&!approved.files['exercise-downloads.json'])return null;throw error;}
 if(digest(bytes)!==approved.files['exercise-downloads.json'])throw Error('Stale retained exercise definition');
 const definition=JSON.parse(bytes);
 await cp(definitionFile,resolve(target,'exercise-downloads.json'),{dereference:true});
 for(const row of definition.downloads??[]) {
  const from=safePath(source,row.path),to=safePath(target,row.path),data=await readFile(from);
  if(row.sha256!==approved.files[row.path]||digest(data)!==row.sha256||data.length!==row.bytes)throw Error('Stale retained exercise artifact: '+row.path);
  await mkdir(dirname(to),{recursive:true});await cp(from,to,{dereference:true});
 }
 // Validate the original historical selection through the shared download gate.
 // A new content edition does not claim a fresh native/prototype verification.
 const links=await exerciseDownloadLinks(target,{id,version:definition.version},approved);
 return {definition,links,candidateVersion:version,sourceDefinitionSha256:digest(bytes),nativeEvidenceStatus:'historical_only_not_reverified'};
}

async function finalizeCandidateMetadata({output,staged,site,id,approved,oldManifest,publication,baseline,baselineRecord,evidence,measurements,pdf,route,markdown,html,exercises}) {
 const history=resolve(staged,'historical/input-metadata');await mkdir(history,{recursive:true});
 // Preserve exact input bytes before replacing any metadata. These are provenance,
 // never approval or a second current edition.
 const inheritedReader=safePath(staged,approved.readerDirectory);
 if(inheritedReader===staged)throw Error('Historical reader directory must not be the package root');
 await rename(inheritedReader,resolve(staged,'historical/input-reader'));
 await cp(resolve(site,id),resolve(staged,'reader'),{recursive:true,dereference:true});
 const refs={};
 for(const [name,record]of Object.entries(evidence.records)) {
  const to=record.relativeTarget?safePath(staged,record.relativeTarget):resolve(staged,'qa/candidate',name+(record.extension??'.json'));await mkdir(dirname(to),{recursive:true});await cp(record.file,to,{dereference:true});
  refs[name]={path:relative(staged,to),sha256:record.sha256,bytes:record.bytes};
 }
 const pageMaps={};
 for(const theme of ['light','dark']) {
  const to=resolve(staged,'qa/candidate',theme+'-page-map.json');await cp(resolve(output,'inputs',theme+'-page-map.json'),to);
  pageMaps[theme]={path:relative(staged,to),sha256:digest(await readFile(to))};
 }
 const parity=resolve(staged,'qa/candidate/parity.json');await cp(resolve(output,'inputs/parity.json'),parity);
 refs.parity={path:relative(staged,parity),sha256:digest(await readFile(parity))};
 const darkPdf=`output/pdf/${id}-v${measurements.light.version}-${measurements.light.date}-late-night-r1.pdf`;
 await cp(resolve(output,'inputs',basename(darkPdf)),resolve(staged,darkPdf));
 const identity={id,title:oldManifest.title,version:measurements.light.version,date:measurements.light.date,pdf,sha256:measurements.light.sha256,pages:measurements.light.pages};
 const baselineManifestPath='historical/approved-baseline-manifest.json',baselinePdfPath='historical/approved-baseline.pdf';
 await cp(baselineRecord.file,resolve(staged,baselineManifestPath));await cp(baselineRecord.pdf,resolve(staged,baselinePdfPath));
 const baselineIdentity={title:baseline.title,version:baseline.version,date:baseline.date,pdf:baselinePdfPath,sha256:baseline.sha256,pages:baseline.pages,manifest:{path:baselineManifestPath,sha256:baselineRecord.sha256},originalPdfPath:baseline.pdf};
 const retainedContract=oldManifest.releaseContract?structuredClone(oldManifest.releaseContract):null;
 if(retainedContract)delete retainedContract.classifiedChangeIds;
 const provenance={status:'historical_only_not_reverified',sourceEdition:oldManifest.version,sourceManifestSha256:digest(await readFile(resolve(history,'release-manifest.json'))),inputMetadata:'historical/input-metadata',inputReader:'historical/input-reader',...(retainedContract?{releaseContract:retainedContract}:{})};
 const manifest={...identity,approvalStatus:'candidate',publicationApproved:false,previous_public_edition:baseline.version,comparison_basis:'approved public edition',baseline:baselineIdentity,candidate_validation:refs.lightValidation.path,candidateEvidence:refs,evidenceMode:evidence.mode,pageMaps,classifiedChangeIds:evidence.changeIds,readerFacingContentChanged:evidence.decision.readerFacingContentChanged,changelog:{weeklyDecision:refs.changelogDecision,pdfDecision:refs.productionChangelog??refs.retainedChangelogDecision??refs.changelogDecision,retainedHistoricalChangelog:Boolean(refs.retainedChangelogDecision)},appearances:{light:{pdf,sha256:measurements.light.sha256,pages:measurements.light.pages},dark:{pdf:darkPdf,sha256:measurements.dark.sha256,pages:measurements.dark.pages}},retainedProvenance:provenance};
 if(oldManifest.releaseContract)manifest.releaseContract={kind:oldManifest.releaseContract.kind,classifiedChangeIds:evidence.changeIds,retainedProvenance:'historical/input-metadata/release-manifest.json',nativeOrPrototypeEvidenceStatus:'historical_only_not_reverified'};
 const candidatePublication={author:publication.author,authorSite:publication.authorSite,canonicalUrl:publication.canonicalUrl,sourceRepository:publication.sourceRepository,...identity,approvalStatus:'candidate',publicationStatus:'candidate',publicationApproved:false,editionUrl:'https://handbooks.surfaces.systems'+route,releaseUrl:'https://handbooks.surfaces.systems'+route};
 await save(resolve(staged,'release-manifest.json'),manifest);
 await save(resolve(staged,'publication.json'),candidatePublication);
 if(exercises)await save(resolve(staged,'exercise-downloads.json'),{...exercises.definition,version:identity.version,exerciseEdition:exercises.definition.exerciseEdition??exercises.definition.version,approvalStatus:'candidate',nativeEvidenceStatus:'historical_only_not_reverified',sourceDefinitionSha256:exercises.sourceDefinitionSha256});
 await save(resolve(staged,'reader-edition.json'),{schemaVersion:1,...identity,approvalStatus:'candidate',publicationApproved:false,html:'reader/index.html',readerSha256:digest(html),markdown:{path:'reader/'+relative(resolve(site,id),markdown.path),sha256:markdown.sha256}});
 const pkg={schemaVersion:1,...identity,approvalStatus:'candidate',publicationApproved:false,readerDirectory:'reader',html:'reader/index.html',readerSha256:digest(html),baseline:baselineIdentity,candidateEvidence:refs,pageMaps,classifiedChangeIds:evidence.changeIds,retainedProvenance:provenance,inventoryScope:'Every package file except publication-package.json itself',files:await inventory(staged,['publication-package.json'])};
 await save(resolve(staged,'publication-package.json'),pkg);
 const excluded=assemblyExclusions;
 await save(resolve(output,'candidate-package-inventory.json'),{schemaVersion:1,...identity,approvalStatus:'candidate',publicationApproved:false,excluded,files:await inventory(output,excluded)});
 const audit=await validateCandidatePackage(output);await save(resolve(output,'candidate-package-validation.json'),audit);
 return {manifest:resolve(staged,'release-manifest.json'),publicationPackage:resolve(staged,'publication-package.json'),inventory:resolve(output,'candidate-package-inventory.json'),validation:resolve(output,'candidate-package-validation.json'),...audit};
}

function normalizeRawChrome(html, edition) {
 // Body wording remains untouched. Only candidate metadata/navigation is derived.
 const cover=html.match(/<p\b[^>]*class="cover-date"[^>]*>([\s\S]*?)<\/p>/)?.[1]??'';
 if(!cover.includes('Version '+edition.version)) throw Error('Raw reader has stale content version');
 html=html.replace(/(<p\b[^>]*class="cover-date"[^>]*>)[\s\S]*?(<\/p>)/,`$1<a href="${escape(edition.editionUrl)}">${dateLabel(edition.date)} · Version ${escape(edition.version)}</a>$2`);
 if(!html.includes('class="handbooks-return"'))html=html.replace(/(<aside\b[^>]*class="sidebar"[^>]*>)/,'$1<a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a>');
  if(!html.includes('class="handbooks-return-mobile"'))html=html.replace(/(<header\b[^>]*class="mobile-bar"[^>]*>)/,'$1<a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>');
 if(!html.includes('href="/gallery.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/gallery.css"></head>');
 if(!html.includes('src="/gallery-focus.js"'))html=html.replace('</head>','<script src="/gallery-focus.js" defer></script></head>');
 if(!html.includes('href="/pdf-downloads.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/pdf-downloads.css"></head>');
 return html;
}

async function validateLocalAssets(site, id, html) {
 const references=new Set();
 for(const [tag] of html.matchAll(/<(?:img|source|script|link)\b[^>]*>/gi)) {
  if(/^<link\b/i.test(tag)&&!(/rel="(?:stylesheet|icon)"/.test(tag)))continue;
  const source=tag.match(/\b(?:src|href)="([^"]+)"/)?.[1];if(source)references.add(source);
  for(const source of (tag.match(/\bsrcset="([^"]+)"/)?.[1]??'').split(',')){const path=source.trim().split(/\s+/)[0];if(path)references.add(path);}
 }
 for(const reference of references) {
  if(reference.startsWith('data:'))continue;
  const url=new URL(reference,'https://candidate.invalid/'+id+'/');
  if(url.origin!=='https://candidate.invalid')throw Error('Candidate reader has a remote runtime asset: '+reference);
  const path=safePath(site,decodeURIComponent(url.pathname.slice(1)));
  let info;try{info=await lstat(path);}catch(error){if(error.code==='ENOENT')throw Error('Missing local runtime asset: '+reference);throw error;}
  if(!info.isFile())throw Error('Candidate asset is not a file: '+reference);
 }
 return {status:'passed',references:references.size};
}

/**
 * Output must be a NEW absolute directory, outside every input directory.
 * light/dark: {pdf, pageMap}; parity: exact passed pair proof file.
 * rawReader: optional directory containing index.html/assets for HTML-authored books.
 * expected: optional {version,date,pages,sha256}; stale declarations fail, not repair.
 * candidateEvidence: explicit validation, comparison, decision and accepted-change
 * files; each is an absolute path or {path,sha256}. No QA status is inferred.
 * baselineManifest: optional approved manifest input, default bookRoot manifest.
 */
export async function buildCandidateReader(options) {
 const {id,bookRoot,output,assetsDirectory,fontsDirectory,light,dark,parity,rawReader,expected={},python='python3',exerciseSourceRoot=bookRoot}=options;
 if(!/^[a-z0-9-]+$/.test(id??''))throw Error('Invalid candidate book id');
 for(const [name,path] of Object.entries({bookRoot,output,assetsDirectory,fontsDirectory,exerciseSourceRoot,...(rawReader?{rawReader}:{})}))if(!isAbsolute(path??''))throw Error(name+' must be an explicit absolute path');
 for(const input of [bookRoot,assetsDirectory,fontsDirectory,...(rawReader?[rawReader]:[])])if(inside(input,output)||inside(output,input))throw Error('Candidate output overlaps an input directory');
 if(expected.version&&!semver.test(expected.version))throw Error('Expected version must be full semver, not a helper timestamp');
 for(const item of [light?.pdf,light?.pageMap,dark?.pdf,dark?.pageMap,parity])if(!isAbsolute(item??''))throw Error('Explicit absolute PDF/map/parity inputs are required');
 const metadataInputs=[...evidenceNames.filter(name=>options.candidateEvidence?.[name]).map(name=>inputFile(options.candidateEvidence[name])),inputFile(options.baselineManifest??resolve(bookRoot,'release-manifest.json'))];
 for(const file of metadataInputs)if(!isAbsolute(file??''))throw Error('Explicit absolute candidate evidence paths are required');
 await assertIsolatedCandidateOutput(output,[bookRoot,assetsDirectory,fontsDirectory,exerciseSourceRoot,...(rawReader?[rawReader]:[]),light.pdf,light.pageMap,dark.pdf,dark.pageMap,parity,toolkit,...metadataInputs]);
 // Resolve all assets before starting the worker: no sibling-layout assumptions.
 for(const file of ['gallery.css','gallery-focus.js'])await access(resolve(assetsDirectory,file));
 for(const file of ['source-serif-4-latin-variable.woff2','source-serif-4-latin-variable-italic.woff2'])await access(resolve(fontsDirectory,file));
 await mkdir(output); // EEXIST is intentional: preserve every previous attempt.
 const result={schemaVersion:1,book:id,status:'running',output,startedAt:new Date().toISOString(),workerAttempts:1};
 let phase='measure-pdf-identity';
 try {
  const measurements={light:await measureCandidatePdf(light.pdf),dark:await measureCandidatePdf(dark.pdf)};
  const measured=measurements.light;
  for(const key of ['title','version','date','pages'])if(measurements.dark[key]!==measured[key])throw Error('Daytime/Late night content-edition mismatch: '+key);
  for(const [key,value] of Object.entries(expected))if(measured[key]!==value)throw Error('Stale expected PDF '+key);
  const approved=await json(resolve(bookRoot,'publication-package.json'));
  const oldManifest=await json(resolve(bookRoot,'release-manifest.json'));
  if(measured.title!==oldManifest.title)throw Error('Measured PDF title differs from this handbook');
  const baselineRecord=await evidenceFile(options.baselineManifest??resolve(bookRoot,'release-manifest.json'),'baselineManifest'),baseline=baselineRecord.data;
  if(baseline.title!==measured.title||!semver.test(baseline.version??'')||!hashPattern.test(baseline.sha256??'')||!Number.isSafeInteger(baseline.pages)||baseline.approvalStatus==='candidate')throw Error('Invalid approved baseline manifest identity');
  baselineRecord.pdf=safePath(dirname(baselineRecord.file),baseline.pdf);
  if(digest(await readFile(baselineRecord.pdf))!==baseline.sha256)throw Error('Approved baseline PDF hash mismatch');
  phase='validate-candidate-evidence';const evidence=await loadCandidateEvidence(options,measurements,baseline);
  const publication=await json(resolve(bookRoot,'publication.json'));
  const staged=resolve(output,'work/book'),site=resolve(output,'site'),raw=resolve(output,'raw-reader');
  phase='stage-inputs';await copyBookInputs(bookRoot,staged,approved);
  const exercises=await stageRetainedExercises({source:exerciseSourceRoot,target:staged,approved,id,version:measured.version});
  for(const name of ['release-manifest.json','publication-package.json','publication.json','reader-edition.json','pdf-config.json','exercise-downloads.json']) {
   const from=resolve(staged,name);try{await mkdir(resolve(staged,'historical/input-metadata'),{recursive:true});await cp(from,resolve(staged,'historical/input-metadata',name),{dereference:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const pdf=`output/pdf/${id}-v${measured.version}-${measured.date}-daytime-r1.pdf`;
  const manifest={title:oldManifest.title,version:measured.version,date:measured.date,pdf,sha256:measured.sha256,pages:measured.pages,approvalStatus:'candidate',publicationApproved:false};
  const route=`/${id}/editions/v${measured.version}/`;
  const edition={...publication,...manifest,id,publicationStatus:'candidate',editionUrl:route,pdfUrl:route+basename(pdf)};
  const candidatePublication={...publication,editionUrl:'https://handbooks.surfaces.systems'+route,releaseUrl:'https://handbooks.surfaces.systems'+route};
  await save(resolve(staged,'release-manifest.json'),manifest);await save(resolve(staged,'publication.json'),candidatePublication);
  await mkdir(resolve(staged,'output/pdf'),{recursive:true});await cp(light.pdf,resolve(staged,pdf),{dereference:true});
  try { const config=await json(resolve(staged,'pdf-config.json'));config.version=measured.version;config.date=measured.date;config.pages=measured.pages;await save(resolve(staged,'pdf-config.json'),config); } catch(error) {if(error.code!=='ENOENT')throw error;}
  phase='resolve-variants';
  const variants=[];
  for(const [theme,input] of Object.entries({light,dark})) {
   const measurement=measurements[theme],name=`${id}-v${measured.version}-${measured.date}-${theme==='light'?'daytime':'late-night'}-r1.pdf`;
   const artifact=resolve(output,'inputs',name),map=resolve(output,'inputs',theme+'-page-map.json');
   await mkdir(dirname(artifact),{recursive:true});await cp(input.pdf,artifact,{dereference:true});await cp(input.pageMap,map,{dereference:true});
   variants.push({theme,displayName:theme==='light'?'Daytime version':'Late night version',appearanceRevision:1,approvalStatus:'candidate',path:relative(output,artifact),publicUrl:route+name,downloadFilename:name,sha256:measurement.sha256,bytes:measurement.bytes,pages:measurement.pages,pageMap:{path:relative(output,map),sha256:digest(await readFile(map))}});
  }
  const pair=await json(parity);if(pair.status!=='passed'||pair.retainedSha256!==measured.sha256||pair.candidateSha256!==measurements.dark.sha256)throw Error('Pair proof does not bind both exact candidate PDFs');
  await cp(parity,resolve(output,'inputs/parity.json'),{dereference:true});
  variants.find(v=>v.theme==='dark').proof={parity:{path:'inputs/parity.json',sha256:digest(await readFile(parity))}};
  const variantManifest={schemaVersion:1,book:id,title:manifest.title,version:manifest.version,date:manifest.date,pdf:manifest.pdf,sha256:manifest.sha256,pages:manifest.pages,variants};
  validateVariantIdentity(variantManifest,edition,{candidate:true});await save(resolve(output,'candidate-pdf-variants.json'),variantManifest);
  const resolved=await resolvePdfVariants(staged,edition,{path:'candidate-pdf-variants.json',sha256:digest(await readFile(resolve(output,'candidate-pdf-variants.json')))},{candidate:true,collectionRoot:output,measurePdfPages:true});
  phase='raw-reader';
  if(rawReader)await cp(rawReader,raw,{recursive:true,dereference:true,filter:p=>!p.endsWith('.pdf')});
  else {
   const process=await execute(python,[resolve(staged,'source/build_reader.py'),'--output',raw],{cwd:staged,env:{...globalThis.process.env,PYTHONDONTWRITEBYTECODE:'1',HANDBOOK_PUBLISHING_TOOLKIT:toolkit},maxBuffer:16*1024*1024});
   await writeFile(resolve(output,'raw-reader.log'),process.stdout+process.stderr);
  }
  phase='shared-assets';await mkdir(resolve(site,'assets'),{recursive:true});await cp(raw,resolve(site,id),{recursive:true});
  // Additional frozen support assets (for example workflow tool logos) are not
  // produced by flowable conversion. Merge without replacing rendered assets.
  await cp(resolve(staged,approved.readerDirectory,'assets'),resolve(site,id,'assets'),{recursive:true,force:false,errorOnExist:false});
  for(const file of ['reader.css','reader.js','theme.css','theme.js','pdf-downloads.css'])await cp(resolve(toolkit,'assets/reader',file),resolve(site,file),{dereference:true});
  for(const file of ['gallery.css','gallery-focus.js'])await cp(resolve(assetsDirectory,file),resolve(site,file),{dereference:true});
  await cp(fontsDirectory,resolve(site,'assets/fonts'),{recursive:true,dereference:true});
  try {await cp(resolve(assetsDirectory,'assets/favicon.png'),resolve(site,'assets/favicon.png'),{dereference:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  // Frozen source bindings apply to originals. They must not overwrite newly
  // rendered diagrams/artwork in the raw reader after shared assembly.
  phase='reader-assembly';let html=normalizeRawChrome(await readFile(resolve(raw,'index.html'),'utf8'),edition);
  html=removeSidebarPublication(removePublicationReview(html));
  html=await installPromptBlocks(staged,html,approved);html=await installTerminalBlocks(staged,html,approved);
  html=await installDiagrams(staged,html,approved);html=await installArtworkPairs(staged,{id},site,html,approved);
  html=editionLinks(html,{...candidatePublication,editionUrl:route,releaseUrl:route},{linkCoverDate:true});
  if(exercises) {
   for(const row of exercises.definition.downloads) {const to=safePath(site,row.url.slice(1));await mkdir(dirname(to),{recursive:true});await cp(safePath(staged,row.path),to);}
   if(!html.includes('class="exercise-materials"'))html=html.replace('</main>',exercises.links+'</main>');
  }
  phase='markdown-and-downloads';edition.markdown=await writeMarkdownEdition(site,edition,html);
  html=installReaderDownloads(html,edition,resolved);const downloads=validateDownloads(html,edition,resolved);
  html=addSiteTheme(html);validateSiteTheme(html);const front=validatePublicationFront(html,edition);
  phase='local-asset-coverage';const localAssets=await validateLocalAssets(site,id,html);
  await writeFile(resolve(site,id,'index.html'),html);
  for(const variant of resolved){const target=safePath(site,variant.publicUrl.slice(1));await mkdir(dirname(target),{recursive:true});await cp(safePath(output,variant.path),target);if(digest(await readFile(target))!==variant.sha256)throw Error('Download copy changed');}
  const markdownPath=safePath(site,edition.markdown.publicUrl.slice(1));const markdown=await readFile(markdownPath,'utf8');
  const index=await json(markdownPath.slice(0,-3)+'.index.json');
  if(index.version!==edition.version||index.sha256!==edition.markdown.sha256||digest(markdown)!==edition.markdown.sha256||!markdown.includes('version: '+JSON.stringify(edition.version)))throw Error('Markdown identity mismatch');
  const editionPage=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(edition.title)} · ${escape(edition.version)}</title><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/pdf-downloads.css"></head><body><main><h1>${escape(edition.title)}</h1><p>${dateLabel(edition.date)} · Version ${escape(edition.version)}</p><p>Candidate only — not approved for publication.</p>${downloadLinks(edition,resolved)}<p><a href="/${id}/">Read the handbook</a></p></main></body></html>`;
  validateDownloads(editionPage,edition,resolved);await writeFile(safePath(site,route.slice(1)+'index.html'),editionPage);
  // A candidate-local return destination prevents navigation escaping into production.
  await writeFile(resolve(site,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Candidate review</title><link rel="stylesheet" href="/gallery.css"></head><body><h1>Candidate review — not published</h1><a href="/${id}/">${escape(edition.title)}</a></body></html>`);
  phase='candidate-package-metadata';const candidatePackage=await finalizeCandidateMetadata({output,staged,site,id,approved,oldManifest,publication,baseline,baselineRecord,evidence,measurements,pdf,route,markdown:{path:markdownPath,sha256:edition.markdown.sha256},html,exercises});
  Object.assign(result,{status:'passed',phase:'complete',finishedAt:new Date().toISOString(),reader:resolve(site,id,'index.html'),markdown:markdownPath,site,edition:{id,title:edition.title,version:edition.version,date:edition.date,pages:edition.pages,sha256:edition.sha256},candidateManifest:resolve(output,'candidate-pdf-variants.json'),candidatePackage,readerSha256:digest(html),markdownSha256:edition.markdown.sha256,checks:{pdfIdentity:'passed',variantIdentity:'passed',pageMapIdentity:'passed',pairProofIdentity:'passed',markdownIdentity:'passed',candidatePackageIdentity:'passed',downloads,front,artwork:'passed',diagrams:'passed',themeStructure:'passed',localAssets},limitations:['This assembly result verifies the supplied PDF structural reports and package identities. It does not approve appearance, research, browser rendering, retained native/prototype evidence, or release. Those remain separate gates.']});
 } catch(error) {
  Object.assign(result,{status:'failed',phase,error:error.message,finishedAt:new Date().toISOString()});
  await writeFile(resolve(output,'failure.log'),[error.stack,error.stdout,error.stderr].filter(Boolean).join('\n')+'\n');
  await save(resolve(output,'reader-status.json'),result);throw Object.assign(error,{candidateReaderResult:result});
 }
 await save(resolve(output,'reader-status.json'),result);return result;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const config=process.argv[2];if(!config)throw Error('Usage: build-candidate-reader.mjs /absolute/config.json');
 try{console.log(JSON.stringify(await buildCandidateReader(await json(resolve(config))),null,2));}catch(error){console.error(error.stack);process.exitCode=1;}
}
