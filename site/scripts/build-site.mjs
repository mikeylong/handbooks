import {readerAssets, toolkitModule} from './handbook-toolkit.mjs';
import {editionLinks} from './edition-links.mjs';
import {editionChangelog} from './edition-changelog.mjs';
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPROVAL_REGISTRY,validateLibrary,sourceFor,validatePackage,safePath} from './book-sources.mjs';
import {validatePublicationFront,validateGalleryPublications} from './publication-front.mjs';
import {renderGalleryCover,validateGalleryCover} from './gallery-covers.mjs';
import {finalizeSiteThemes} from './site-theme.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';

const {resolvePdfVariants,installReaderDownloads,downloadLinks,validateDownloads}=await toolkitModule('pdf-downloads.mjs');
const {writeMarkdownEdition}=await toolkitModule('markdown-downloads.mjs');
const {installDiagrams} = await toolkitModule('diagrams.mjs');
const {installPromptBlocks} = await toolkitModule('prompt-blocks.mjs');
const {installTerminalBlocks} = await toolkitModule('terminal-blocks.mjs');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'../catalog.json'),'utf8'));
const books=validateLibrary(catalog);
const reviewRegistryPath=process.env.HANDBOOK_PDF_REVIEW_REGISTRY;
if(reviewRegistryPath&&!process.env.HANDBOOK_SITE_OUTPUT)throw Error('Review registry requires an isolated site output');
const registry=reviewRegistryPath?JSON.parse(await readFile(reviewRegistryPath,'utf8')):APPROVAL_REGISTRY;
if(reviewRegistryPath&&(registry.mode!=='candidate'||registry.books.length!==books.length))throw Error('Initial candidate preview requires all approved titles');
const output=process.env.HANDBOOK_SITE_OUTPUT?resolve(process.env.HANDBOOK_SITE_OUTPUT):resolve(root,'output/site');
if(reviewRegistryPath&&output===resolve(root,'output/site'))throw Error('Candidates cannot enter public output');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await mkdir(resolve(output,'../publications'),{recursive:true});
for(const file of ['gallery.css','gallery-focus.js'])await cp(resolve(root,'site',file),resolve(output,file));
for(const file of ['theme.css','theme.js','reader.css','reader.js','pdf-downloads.css'])await cp(resolve(readerAssets,file),resolve(output,file));
await mkdir(resolve(output,'assets'),{recursive:true});
const publicAssets=JSON.parse(await readFile(resolve(root,'public-assets.json'),'utf8'));
for(const [path,sha] of Object.entries(publicAssets)){const file=safePath(root,path);if(createHash('sha256').update(await readFile(file)).digest('hex')!==sha)throw Error('Shared public asset changed: '+path);const dest=resolve(output,path.slice(5));await mkdir(dirname(dest),{recursive:true});await cp(file,dest);}
let gallery=await readFile(resolve(root,'site/index.html'),'utf8');
const retained=JSON.parse(await readFile(resolve(root,'retained-releases.json'),'utf8'));
for(const route of retained.routes){
 if(!/^\/[A-Za-z0-9/_.-]+\.pdf$/.test(route.url)||route.url.includes('..'))throw Error('Unsafe retained route');
 const source=safePath(resolve(root,'..'),route.source),bytes=await readFile(source);
 if(createHash('sha256').update(bytes).digest('hex')!==route.sha256)throw Error('Retained PDF changed: '+route.url);
 const dest=safePath(output,route.url.slice(1));await mkdir(dirname(dest),{recursive:true});await cp(source,dest);
}
const changelogs=JSON.parse(await readFile(resolve(root,'changelogs.json'),'utf8'));
const editions=[];
for(const pin of books){
  const source=await sourceFor(root,pin);
  const approvedPackage=await validatePackage(source,pin);
  let manifest,publication,html;
  if(pin.id==='production-ai-engineering'){
    // Production's original release predates the common manifest schema.
    const readme=await readFile(resolve(source,'README.md'),'utf8');
    const pdf=readme.match(/\[Read the book \(PDF\)\]\(\.\/(output\/pdf\/[^)]+)\)/)?.[1];
    const version=readme.match(/\*\*Current release:\*\* Version ([\d.]+)/)?.[1];
    const hash=readme.match(/production-pdf-sha256: ([a-f0-9]{64})/)?.[1];
    if(!pdf||!version||hash!==pin.pdfSha256)throw Error('Production release metadata missing or changed');
    let count;
    try{const edition=JSON.parse(await readFile(resolve(source,'reader-edition.json'),'utf8'));count=edition.pdfPages;if(edition.pdfPath!==pdf||edition.pdfSha256!==hash||edition.version!==version)throw Error('Production edition mismatch');}
    catch(error){if(error.code!=='ENOENT')throw error;const edition=JSON.parse(await readFile(resolve(source,'site/production-ai-engineering.json'),'utf8'));count=edition.pdfPages;if(edition.pdfPath!==pdf||edition.pdfSha256!==hash||edition.version!==version)throw Error('Production edition mismatch');}
    manifest={title:'Production AI Engineering',version,date:pdf.match(/(\d{4}-\d{2}-\d{2})\.pdf$/)[1],pdf,sha256:hash,pages:count};
    const book=await readFile(resolve(source,'handbook/index.html'),'utf8');
    publication={author:'Michael Long',authorSite:'https://surfaces.systems',...JSON.parse(await readFile(resolve(source,'publication.json'),'utf8')),review:{at:book.match(/data-release-at="([^"]+)"/)[1],timeZone:book.match(/data-release-time-zone="([^"]+)"/)[1],rrule:book.match(/data-release-rrule="([^"]+)"/)[1]}};
    for(const path of Object.keys(approvedPackage.files)){if(path!=='handbook/index.html'&&path.startsWith('handbook/')){const destination=resolve(output,pin.id,path.slice(9));await mkdir(dirname(destination),{recursive:true});await cp(safePath(source,path),destination);}}
    await mkdir(resolve(output,'output/pdf'),{recursive:true});await cp(resolve(source,pdf),resolve(output,pdf));
    html=book.replace('<aside class="sidebar" aria-label="Handbook navigation">','<aside class="sidebar" aria-label="Handbook navigation">\n<a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a>')
      .replace('<header class="mobile-bar">','<header class="mobile-bar">\n<a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
      .replace(/(href|src)="(?!#|\/|https?:|mailto:)([^"]+)"/g,(_,attribute,value)=>{const url=new URL(value,'https://handbooks.surfaces.systems/production-ai-engineering/');return `${attribute}="${url.pathname}${url.search}${url.hash}"`;})
      .replace(/srcset="([^"]+)"/g,(_,value)=>`srcset="${value.split(',').map(candidate=>{const [path,...descriptor]=candidate.trim().split(/\s+/);const url=new URL(path,'https://handbooks.surfaces.systems/production-ai-engineering/');return [url.pathname+url.search+url.hash,...descriptor].join(' ');}).join(', ')}"`)
      .replace('</head>','<link rel="canonical" href="https://handbooks.surfaces.systems/production-ai-engineering/">\n</head>');
  }else{
    manifest=JSON.parse(await readFile(resolve(source,'release-manifest.json'),'utf8'));
    publication=JSON.parse(await readFile(resolve(source,'publication.json'),'utf8'));
    const pkg=JSON.parse(await readFile(resolve(source,'package.json'),'utf8'));
    if(pkg.repository.url!==catalog.repository)throw Error('Book package belongs to another repository');
    for(const path of Object.keys(approvedPackage.files)){if(path.startsWith('reader/')){const destination=resolve(output,pin.id,path.slice(7));await mkdir(dirname(destination),{recursive:true});await cp(safePath(source,path),destination);}}
    html=await readFile(resolve(output,pin.id,'index.html'),'utf8');
  }
  if(manifest.version!==pin.version||manifest.pdf!==pin.pdf||!Number.isSafeInteger(manifest.pages)||manifest.pages<1)throw Error('Approved edition metadata differs from catalog');
  if(publication.sourceRepository!==catalog.repository||publication.editionUrl!==pin.editionUrl||publication.releaseUrl!==pin.editionUrl)throw Error('Public edition links disagree with catalog');
  html=await installPromptBlocks(source,html,approvedPackage);
  html=await installTerminalBlocks(source,html,approvedPackage);
  html=editionLinks(html,publication);
  html=await installArtworkPairs(source,pin,output,html,approvedPackage);
  html=await installDiagrams(source,html,approvedPackage);
  const digest=b=>createHash('sha256').update(b).digest('hex');
  if(manifest.sha256!==pin.pdfSha256||digest(await readFile(resolve(source,manifest.pdf)))!==pin.pdfSha256)throw Error('Pinned approved PDF differs from source');
  const pdfUrl=pin.id==='production-ai-engineering'?'/'+manifest.pdf:'/'+pin.id+'/'+basename(manifest.pdf);
  const hostedPdf=pin.id==='production-ai-engineering'?resolve(output,manifest.pdf):resolve(output,pin.id,basename(manifest.pdf));
  if(digest(await readFile(hostedPdf))!==pin.pdfSha256)throw Error('Hosted PDF differs from approved source');
  if(!html.includes('href="/gallery.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/gallery.css"><script src="/gallery-focus.js" defer></script></head>');
  const edition={id:pin.id,...publication,...manifest,pdfUrl,sourceRepository:catalog.repository,publicationStatus:reviewRegistryPath?'candidate':pin.status,approvedReaderSha256:approvedPackage.files[approvedPackage.html]};
  const registryBook=registry.books.find(b=>b.id===pin.id&&b.version===pin.version);
  if(!registryBook||registryBook.packageSha256!==APPROVAL_REGISTRY.books.find(b=>b.id===pin.id).packageSha256)throw Error('Review package identity mismatch');
  const variants=await resolvePdfVariants(source,edition,registryBook.variantManifest,{candidate:!!reviewRegistryPath,collectionRoot:resolve(root,'..'),measurePdfPages:false});
  edition.markdown=await writeMarkdownEdition(output,edition,html);
  html=installReaderDownloads(html,edition,variants);
  html=html.replace('</head>','<link rel="stylesheet" href="/pdf-downloads.css"></head>');
  validateDownloads(html,edition,variants);edition.pdfVariants=variants;
  for(const v of variants){
   const src=registryBook.variantManifest?safePath(resolve(root,'..'),v.path):safePath(source,v.path);
   const dest=safePath(output,v.publicUrl.slice(1));await mkdir(dirname(dest),{recursive:true});await cp(src,dest);
  }
  const editionDirectory=resolve(output,pin.id,'editions','v'+manifest.version);
  await mkdir(editionDirectory,{recursive:true});
  await cp(resolve(source,manifest.pdf),resolve(editionDirectory,basename(manifest.pdf)));
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const changes=await editionChangelog(source,edition,changelogs[pin.id]);
  await writeFile(resolve(editionDirectory,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(manifest.title)} · Changelog · v${escape(manifest.version)}</title><link rel="canonical" href="${pin.editionUrl}"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/pdf-downloads.css"></head><body id="book-top"><header class="mobile-bar"><a href="/">← All handbooks</a><a class="mobile-title" href="/${pin.id}/">${escape(manifest.title)}</a><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/">← All handbooks</a><div class="sidebar-brand"><span>Changelog</span><strong>${escape(manifest.title)}</strong></div><div class="sidebar-meta"><p><a href="/${pin.id}/">Read the handbook</a></p></div></aside><main id="main-content"><section class="chapter edition-details"><p><a href="/${pin.id}/">${escape(manifest.title)}</a></p><h1>Changelog</h1><p>Version ${escape(manifest.version)} · ${escape(manifest.date)}</p>${changes}<div class="edition-downloads">${downloadLinks(edition,variants.map(v=>({...v,publicUrl:`/${pin.id}/editions/v${manifest.version}/${basename(v.publicUrl)}`})))}</div></section></main></div></body></html>`);
  validatePublicationFront(html,edition);
  await writeFile(resolve(output,pin.id,'index.html'),html);
  await writeFile(resolve(output,'../publications',pin.id+'.json'),JSON.stringify(edition,null,2)+'\n');
  gallery=gallery.replace(pin.coverPlaceholder,renderGalleryCover(html));
  gallery=gallery.replace(new RegExp(`(<a class="handbook-card-link" href="/${pin.id}/"[^>]*>[\\s\\S]*?</a>)`),`$1${downloadLinks(edition,variants,{compact:true})}`);
  validateDownloads(gallery,edition,variants);editions.push({pin,html});
}
for(const {pin,html} of editions)validateGalleryCover(gallery,'/'+pin.id+'/',html);
validateGalleryPublications(gallery,books.map(book=>'/'+book.id+'/'));
gallery=gallery.replace('</head>','<link rel="stylesheet" href="/pdf-downloads.css"></head>');
await writeFile(resolve(output,'index.html'),gallery);
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://handbooks.surfaces.systems/sitemap.xml\n');
await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...books.flatMap(book=>['/'+book.id+'/',new URL(book.editionUrl).pathname])].map(path=>`<url><loc>https://handbooks.surfaces.systems${path}</loc></url>`).join('')+'</urlset>\n');
await finalizeSiteThemes(output);
console.log(`Built gallery from ${books.length} approved local handbook packages`);
