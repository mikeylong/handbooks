import {readerAssets, toolkitModule} from './handbook-toolkit.mjs';
import {editionLinks} from './edition-links.mjs';
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLibrary,sourceFor,validatePackage,safePath} from './book-sources.mjs';
import {validatePublicationFront,validateGalleryPublications} from './publication-front.mjs';
import {renderGalleryCover,validateGalleryCover} from './gallery-covers.mjs';
import {finalizeSiteThemes} from './site-theme.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';

const {installDiagrams} = await toolkitModule('diagrams.mjs');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await readFile(resolve(root,'../catalog.json'),'utf8'));
const books=validateLibrary(catalog);
const output=resolve(root,'output/site');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await mkdir(resolve(root,'output/publications'),{recursive:true});
for(const file of ['gallery.css','gallery-focus.js'])await cp(resolve(root,'site',file),resolve(output,file));
for(const file of ['theme.css','theme.js','reader.css','reader.js'])await cp(resolve(readerAssets,file),resolve(output,file));
await mkdir(resolve(output,'assets'),{recursive:true});
const publicAssets=JSON.parse(await readFile(resolve(root,'public-assets.json'),'utf8'));
for(const [path,sha] of Object.entries(publicAssets)){const file=safePath(root,path);if(createHash('sha256').update(await readFile(file)).digest('hex')!==sha)throw Error('Shared public asset changed: '+path);const dest=resolve(output,path.slice(5));await mkdir(dirname(dest),{recursive:true});await cp(file,dest);}
let gallery=await readFile(resolve(root,'site/index.html'),'utf8');
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
  html=editionLinks(html,publication);
  html=await installArtworkPairs(source,pin,output,html,approvedPackage);
  html=await installDiagrams(source,html,approvedPackage);
  const digest=b=>createHash('sha256').update(b).digest('hex');
  if(manifest.sha256!==pin.pdfSha256||digest(await readFile(resolve(source,manifest.pdf)))!==pin.pdfSha256)throw Error('Pinned approved PDF differs from source');
  const pdfUrl=pin.id==='production-ai-engineering'?'/'+manifest.pdf:basename(manifest.pdf);
  const hostedPdf=pin.id==='production-ai-engineering'?resolve(output,manifest.pdf):resolve(output,pin.id,pdfUrl);
  if(digest(await readFile(hostedPdf))!==pin.pdfSha256)throw Error('Hosted PDF differs from approved source');
  if(!html.includes('href="/gallery.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/gallery.css"><script src="/gallery-focus.js" defer></script></head>');
  const edition={...publication,...manifest,pdfUrl,sourceRepository:catalog.repository,approvedReaderSha256:approvedPackage.files[approvedPackage.html]};
  const editionDirectory=resolve(output,pin.id,'editions','v'+manifest.version);
  await mkdir(editionDirectory,{recursive:true});
  await cp(resolve(source,manifest.pdf),resolve(editionDirectory,basename(manifest.pdf)));
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  await writeFile(resolve(editionDirectory,'index.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(manifest.title)} · Version ${escape(manifest.version)}</title><link rel="canonical" href="${pin.editionUrl}"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/reader.css"></head><body><header class="mobile-bar"><a href="/">← All handbooks</a><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/">← All handbooks</a><div class="sidebar-meta"></div></aside><main id="main-content"><section class="chapter edition-details"><p><a href="/${pin.id}/">Read ${escape(manifest.title)}</a></p><h1>${escape(manifest.title)}</h1><p>Version ${escape(manifest.version)} · ${escape(manifest.date)} · ${manifest.pages} pages</p><p><a href="/${pin.id}/editions/v${manifest.version}/${escape(basename(manifest.pdf))}" download>Download PDF</a></p><p>PDF SHA-256: <code>${manifest.sha256}</code></p><p><a href="/">All handbooks</a></p></section></main></div></body></html>`);
  validatePublicationFront(html,edition);
  await writeFile(resolve(output,pin.id,'index.html'),html);
  await writeFile(resolve(root,'output/publications',pin.id+'.json'),JSON.stringify(edition,null,2)+'\n');
  gallery=gallery.replace(pin.coverPlaceholder,renderGalleryCover(html));editions.push({pin,html});
}
for(const {pin,html} of editions)validateGalleryCover(gallery,'/'+pin.id+'/',html);
validateGalleryPublications(gallery,books.map(book=>'/'+book.id+'/'));
await writeFile(resolve(output,'index.html'),gallery);
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://handbooks.surfaces.systems/sitemap.xml\n');
await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...books.flatMap(book=>['/'+book.id+'/',new URL(book.editionUrl).pathname])].map(path=>`<url><loc>https://handbooks.surfaces.systems${path}</loc></url>`).join('')+'</urlset>\n');
await finalizeSiteThemes(output);
console.log(`Built gallery from ${books.length} approved local handbook packages`);
