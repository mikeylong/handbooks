#!/usr/bin/env node
/** Prepare an isolated first edition; never infer an approved predecessor or publish. */
import {readFile,writeFile,mkdir,cp,readdir,lstat} from 'node:fs/promises';
import {resolve,dirname,relative,basename,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {digest,safePath} from './reader-paths.mjs';
import {assertIsolatedCandidateOutput,measureCandidatePdf} from './build-candidate-reader.mjs';
import {resolvePdfVariants,installReaderDownloads,validateDownloads,downloadLinks} from './pdf-downloads.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';
import {writeMarkdownEdition} from './markdown-downloads.mjs';
import {addSiteTheme,validateSiteTheme} from './site-theme.mjs';
import {editionLinks} from './edition-links.mjs';
import {removePublicationReview,removeSidebarPublication,validatePublicationFront} from './publication-front.mjs';

const toolkit=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const execute=promisify(execFile);
const json=async file=>JSON.parse(await readFile(file,'utf8'));
const save=async(file,data)=>{await mkdir(dirname(file),{recursive:true});await writeFile(file,JSON.stringify(data,null,2)+'\n');};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export async function fileInventory(root,excluded=[]) {
 const result={};
 async function walk(folder){for(const name of (await readdir(folder)).sort()){
  const file=resolve(folder,name),key=relative(root,file).split('\\').join('/');
  if(excluded.includes(key))continue;
  const stat=await lstat(file);if(stat.isSymbolicLink())throw Error('Symlink in package: '+key);
  if(stat.isDirectory())await walk(file);else if(stat.isFile())result[key]=digest(await readFile(file));else throw Error('Unsupported package entry');
 }}
 await walk(root);return result;
}
export function validateFirstEditionEvidence({baseline,decision,measurements,validations,parity}) {
 if(baseline!==null)throw Error('First edition must explicitly declare a null approved baseline');
 if(decision.status!=='not-applicable'||decision.includeChangelog!==false||decision.entryCount!==0||decision.expectedEntries?.length||decision.requiredPdfState?.changelogPages!==0)throw Error('First edition requires a not-applicable changelog decision');
 for(const theme of ['light','dark']) {
  const m=measurements[theme],v=validations[theme];
  for(const key of ['title','version','date','pages'])if(m[key]!==measurements.light[key])throw Error('PDF appearance identity mismatch: '+key);
  if(v.status!=='passed'||v.profile!=='candidate'||v.failures?.length||v.artifactSha256!==m.sha256||v.stats?.pages!==m.pages||v.changelogDecision?.firstEdition!==true||v.changelogDecision?.includeChangelog!==false)throw Error('Stale or failed first-edition validation: '+theme);
 }
 if(parity.status!=='passed'||parity.failures?.length||parity.retainedSha256!==measurements.light.sha256||parity.candidateSha256!==measurements.dark.sha256)throw Error('Pair proof does not bind both exact PDFs');
}
export async function validateFirstEditionPackage(output) {
 const receipt=await json(resolve(output,'first-edition-package.json'));
 if(receipt.approvalStatus!=='candidate'||receipt.publicationApproved!==false||receipt.baseline!==null)throw Error('First-edition package contains approval or a baseline');
 if(JSON.stringify(receipt.files)!==JSON.stringify(await fileInventory(output,['first-edition-package.json','package-validation.json'])))throw Error('First-edition full inventory mismatch');
 const root=safePath(output,receipt.bookRoot),pkg=await json(resolve(root,'publication-package.json')),release=await json(resolve(root,'release-manifest.json'));
 for(const data of [pkg,release])if(data.approvalStatus!=='candidate'||data.publicationApproved!==false||data.approvalBasis!==undefined||data.historicalCommit!==undefined||data.publicationApproval!==undefined)throw Error('Inherited approval is forbidden');
 for(const key of ['id','title','version','date','pages','sha256'])if(pkg[key]!==release[key]||release[key]!==receipt.edition[key])throw Error('First-edition metadata mismatch: '+key);
 for(const [file,hash]of Object.entries(pkg.files)) {
  if(!(file.startsWith('reader/')||file===release.pdf))throw Error('Private file in public allowlist: '+file);
  if(digest(await readFile(safePath(root,file)))!==hash)throw Error('Stale public file: '+file);
 }
 if(pkg.files[pkg.html]!==pkg.readerSha256||pkg.files[release.pdf]!==release.sha256)throw Error('Public reader/PDF binding mismatch');
 const edition={...receipt.edition,markdown:receipt.markdown};
 const variants=await resolvePdfVariants(root,edition,receipt.variantPin,{candidate:true,collectionRoot:resolve(output,'collection')});
 const html=await readFile(resolve(output,'site',edition.id,'index.html'),'utf8');
 if(!html.includes('href="/pdf-downloads.css"'))throw Error('Reader lacks shared download styling');
 validateDownloads(html,edition,variants);validateSiteTheme(html);validatePublicationFront(html,edition);
 const page=await readFile(safePath(resolve(output,'site'),edition.editionUrl.slice(1)+'index.html'),'utf8');
 validateDownloads(page,edition,variants);validateSiteTheme(page);
 const md=await readFile(safePath(resolve(output,'site'),receipt.markdown.publicUrl.slice(1)),'utf8');
 if(digest(md)!==receipt.markdown.sha256||!md.includes('source_reader_sha256: "'+digest(html)+'"'))throw Error('Markdown does not bind the final reader');
 return {status:'passed',files:Object.keys(receipt.files).length,publicationApproved:false,baseline:null};
}
export async function buildFirstEditionReader(o) {
 const {bookRoot,output,python='python3',assetsDirectory,fontsDirectory,light,dark,parity,changelogDecision,sourceLedger,sourceLedgerSha256,baseline}=o;
 const paths=[bookRoot,assetsDirectory,fontsDirectory,light?.pdf,light?.pageMap,light?.validation,dark?.pdf,dark?.pageMap,dark?.validation,parity,changelogDecision,sourceLedger];
 if(!isAbsolute(output??'')||paths.some(p=>!isAbsolute(p??'')))throw Error('Explicit absolute paths are required');
 await assertIsolatedCandidateOutput(output,[...paths,toolkit]);
 const config=await json(resolve(bookRoot,'pdf-config.json')),measurements={light:await measureCandidatePdf(light.pdf),dark:await measureCandidatePdf(dark.pdf)};
 const decision=await json(changelogDecision),validations={light:await json(light.validation),dark:await json(dark.validation)},pair=await json(parity);
 validateFirstEditionEvidence({baseline,decision,measurements,validations,parity:pair});
 const measured=measurements.light,id=config.id;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id??''))throw Error('Invalid book id');
 for(const key of ['title','version','date'])if(measured[key]!==config[key])throw Error('Source/PDF identity mismatch: '+key);
 if(digest(await readFile(sourceLedger))!==sourceLedgerSha256)throw Error('Frozen source ledger changed');
 await mkdir(output); // Existing attempts are never replaced.
 const collection=resolve(output,'collection'),staged=resolve(collection,id),site=resolve(output,'site');
 await mkdir(staged,{recursive:true});
 for(const name of ['source','assets','evidence','artwork-pairs.json','pdf-config.json'])await cp(resolve(bookRoot,name),resolve(staged,name),{recursive:true,filter:p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')});
 const route=`/${id}/editions/v${measured.version}/`,pdf=`output/pdf/${id}-v${measured.version}-${measured.date}-daytime-r1.pdf`;
 const edition={id,title:measured.title,version:measured.version,date:measured.date,pages:measured.pages,pdf,sha256:measured.sha256,approvalStatus:'candidate',publicationApproved:false,publicationStatus:'candidate',author:o.author??'Michael Long',authorSite:o.authorSite??'https://surfaces.systems',canonicalUrl:`https://handbooks.surfaces.systems/${id}/`,editionUrl:route,pdfUrl:route+basename(pdf)};
 const manifest={...edition,baseline:null,comparison_basis:'first edition; no approved predecessor',sourceLedger:{path:'evidence/sources.json',sha256:sourceLedgerSha256}};
 await save(resolve(staged,'release-manifest.json'),manifest);
 await save(resolve(staged,'publication.json'),{...edition,editionUrl:'https://handbooks.surfaces.systems'+route,releaseUrl:'https://handbooks.surfaces.systems'+route});
 await save(resolve(staged,'reader-edition.json'),edition);
 await save(resolve(staged,'pdf-config.json'),{...config,pages:measured.pages});
 const variants=[];
 for(const [theme,input]of Object.entries({light,dark})){
  const m=measurements[theme],name=`${id}-v${m.version}-${m.date}-${theme==='light'?'daytime':'late-night'}-r1.pdf`,path=`${id}/output/pdf/${name}`,mapPath=`${id}/qa/page-map-${theme}.json`;
  await mkdir(dirname(resolve(collection,path)),{recursive:true});await cp(input.pdf,resolve(collection,path));
  await mkdir(resolve(staged,'qa'),{recursive:true});await cp(input.pageMap,resolve(collection,mapPath));await cp(input.validation,resolve(staged,`qa/validation-${theme}.json`));
  variants.push({theme,displayName:theme==='light'?'Daytime version':'Late night version',appearanceRevision:1,approvalStatus:'candidate',path,publicUrl:route+name,downloadFilename:name,sha256:m.sha256,bytes:m.bytes,pages:m.pages,pageMap:{path:mapPath,sha256:digest(await readFile(input.pageMap))}});
 }
 await cp(parity,resolve(staged,'qa/parity.json'));await cp(changelogDecision,resolve(staged,'qa/changelog-decision.json'));
 variants[1].proof={parity:{path:`${id}/qa/parity.json`,sha256:digest(await readFile(parity))}};
 const variantPath=`${id}/pdf-variants.json`;
 await save(resolve(collection,variantPath),{schemaVersion:1,book:id,title:edition.title,version:edition.version,date:edition.date,pdf,sha256:edition.sha256,pages:edition.pages,variants});
 const variantPin={path:variantPath,sha256:digest(await readFile(resolve(collection,variantPath)))};
 const resolved=await resolvePdfVariants(staged,edition,variantPin,{candidate:true,collectionRoot:collection});
 const reader=resolve(staged,'reader');
 const proc=await execute(python,[resolve(staged,'source/build_reader.py'),'--output',reader],{env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',HANDBOOK_PUBLISHING_TOOLKIT:toolkit},maxBuffer:16*1024*1024});
 await writeFile(resolve(output,'reader-build.log'),proc.stdout+proc.stderr);
 const publicFiles=Object.fromEntries(Object.entries(await fileInventory(reader)).map(([p,h])=>['reader/'+p,h]));publicFiles[pdf]=edition.sha256;
 const pkg={schemaVersion:1,...edition,readerDirectory:'reader',html:'reader/index.html',readerSha256:publicFiles['reader/index.html'],files:publicFiles};
 await save(resolve(staged,'publication-package.json'),pkg);
 await cp(reader,resolve(site,id),{recursive:true});await mkdir(resolve(site,'assets/fonts'),{recursive:true});
 for(const file of ['reader.css','reader.js','theme.css','theme.js','pdf-downloads.css'])await cp(resolve(toolkit,'assets/reader',file),resolve(site,file));
 for(const file of ['gallery.css','gallery-focus.js'])await cp(resolve(assetsDirectory,file),resolve(site,file));
 await cp(resolve(assetsDirectory,'assets/favicon.png'),resolve(site,'assets/favicon.png'));
 for(const file of ['source-serif-4-latin-variable.woff2','source-serif-4-latin-variable-italic.woff2'])await cp(resolve(fontsDirectory,file),resolve(site,'assets/fonts',file));
 let html=removeSidebarPublication(removePublicationReview(await readFile(resolve(reader,'index.html'),'utf8')));
 html=html.replace('</head>','<link rel="stylesheet" href="/pdf-downloads.css"></head>');
 html=await installArtworkPairs(staged,{id},site,html,pkg);
 html=editionLinks(html,{...edition,releaseUrl:route},{linkCoverDate:true});
 edition.markdown=await writeMarkdownEdition(site,edition,html);
 html=addSiteTheme(installReaderDownloads(html,edition,resolved));validateSiteTheme(html);validateDownloads(html,edition,resolved);validatePublicationFront(html,edition);
 const markdown=await writeMarkdownEdition(site,edition,html);
 if(markdown.bytes!==edition.markdown.bytes)throw Error('Markdown download size changed during final assembly');
 edition.markdown=markdown;await writeFile(resolve(site,id,'index.html'),html);
 for(const v of resolved){const to=safePath(site,v.publicUrl.slice(1));await mkdir(dirname(to),{recursive:true});await cp(safePath(collection,v.path),to);}
 const date=new Date(edition.date+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
 const page=addSiteTheme(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(edition.title)} · ${edition.version}</title><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/pdf-downloads.css"></head><body id="book-top"><header class="mobile-bar"><a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a><a class="mobile-title" href="/${id}/">${esc(edition.title)}</a><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/">← All handbooks</a><div class="sidebar-brand"><span>Edition</span><strong>${esc(edition.title)}</strong></div><div class="sidebar-meta"><a href="/${id}/">Read the handbook</a></div></aside><main id="main-content"><section class="chapter edition-details"><h1>${esc(edition.title)}</h1><p>${date} · Version ${edition.version}</p><p>${esc(edition.author)} · ${edition.pages} pages</p>${downloadLinks(edition,resolved)}<p><a href="/${id}/">Read the handbook</a></p></section></main></div></body></html>`);
 validateSiteTheme(page);validateDownloads(page,edition,resolved);await writeFile(safePath(site,route.slice(1)+'index.html'),page);
 const receipt={schemaVersion:1,approvalStatus:'candidate',publicationApproved:false,baseline:null,edition,markdown,variantPin,bookRoot:relative(output,staged),sourceLedgerSha256,files:await fileInventory(output,['first-edition-package.json','package-validation.json'])};
 await save(resolve(output,'first-edition-package.json'),receipt);
 const validation=await validateFirstEditionPackage(output);await save(resolve(output,'package-validation.json'),validation);
 return {status:'passed',output,bookRoot:staged,site,edition,variantPin,validation};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildFirstEditionReader(await json(resolve(process.argv[2]))),null,2));
