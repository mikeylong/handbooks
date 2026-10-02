import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLibrary,sourceFor} from './book-sources.mjs';
import {validatePublicationFront,validateGalleryPublications} from './publication-front.mjs';
import {renderGalleryCover,validateGalleryCover} from './gallery-covers.mjs';
import {finalizeSiteThemes} from './site-theme.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const books=JSON.parse(await readFile(resolve(root,'library.json'),'utf8'));
validateLibrary(books);
const localIndex=process.argv.indexOf('--local-sources');
const localSources=localIndex<0?null:JSON.parse(await readFile(process.argv[localIndex+1],'utf8'));
const output=resolve(root,'output/site');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await mkdir(resolve(root,'output/publications'),{recursive:true});
for(const file of ['gallery.css','gallery-focus.js','theme.css','theme.js','reader.css','reader.js'])await cp(resolve(root,'site',file),resolve(output,file));
await mkdir(resolve(output,'assets'),{recursive:true});
await cp(resolve(root,'site/assets'),resolve(output,'assets'),{recursive:true});
let gallery=await readFile(resolve(root,'site/index.html'),'utf8');
const editions=[];
for(const pin of books){
  const source=await sourceFor(root,pin,localSources);
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
    publication={author:'Michael Long',authorSite:'https://surfaces.systems',repository:'https://github.com/'+pin.repository,releaseUrl:'https://github.com/'+pin.repository+'/releases',review:{at:book.match(/data-release-at="([^"]+)"/)[1],timeZone:book.match(/data-release-time-zone="([^"]+)"/)[1],rrule:book.match(/data-release-rrule="([^"]+)"/)[1]}};
    await cp(resolve(source,'handbook/assets'),resolve(output,pin.id,'assets'),{recursive:true});
    for(const name of ['styles.css','app.js'])await cp(resolve(source,'handbook',name),resolve(output,pin.id,name));
    await mkdir(resolve(output,'output/pdf'),{recursive:true});await cp(resolve(source,pdf),resolve(output,pdf));
    html=book.replace('<aside class="sidebar" aria-label="Handbook navigation">','<aside class="sidebar" aria-label="Handbook navigation">\n<a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a>')
      .replace('<header class="mobile-bar">','<header class="mobile-bar">\n<a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
      .replace(/(href|src)="(?!#|\/|https?:|mailto:)([^"]+)"/g,(_,attribute,value)=>{const url=new URL(value,'https://handbooks.mikelong.ai/production-ai-engineering/');return `${attribute}="${url.pathname}${url.search}${url.hash}"`;})
      .replace(/srcset="([^"]+)"/g,(_,value)=>`srcset="${value.split(',').map(candidate=>{const [path,...descriptor]=candidate.trim().split(/\s+/);const url=new URL(path,'https://handbooks.mikelong.ai/production-ai-engineering/');return [url.pathname+url.search+url.hash,...descriptor].join(' ');}).join(', ')}"`)
      .replace('</head>','<link rel="canonical" href="https://handbooks.mikelong.ai/production-ai-engineering/">\n</head>');
  }else{
    manifest=JSON.parse(await readFile(resolve(source,'release-manifest.json'),'utf8'));
    publication=JSON.parse(await readFile(resolve(source,'publication.json'),'utf8'));
    const pkg=JSON.parse(await readFile(resolve(source,'package.json'),'utf8'));
    if(pkg.repository.url!=='https://github.com/'+pin.repository)throw Error('Book package belongs to another repository');
    await cp(resolve(source,'reader'),resolve(output,pin.id),{recursive:true});
    html=await readFile(resolve(output,pin.id,'index.html'),'utf8');
  }
  if(publication.repository!=='https://github.com/'+pin.repository||!publication.releaseUrl.startsWith(publication.repository+'/releases'))throw Error('Handbook repository links do not belong to its source');
  const digest=b=>createHash('sha256').update(b).digest('hex');
  if(manifest.sha256!==pin.pdfSha256||digest(await readFile(resolve(source,manifest.pdf)))!==pin.pdfSha256)throw Error('Pinned approved PDF differs from source');
  const pdfUrl=pin.id==='production-ai-engineering'?'/'+manifest.pdf:basename(manifest.pdf);
  const hostedPdf=pin.id==='production-ai-engineering'?resolve(output,manifest.pdf):resolve(output,pin.id,pdfUrl);
  if(digest(await readFile(hostedPdf))!==pin.pdfSha256)throw Error('Hosted PDF differs from approved source');
  if(!html.includes('href="/gallery.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/gallery.css"><script src="/gallery-focus.js" defer></script></head>');
  const edition={...publication,...manifest,pdfUrl,sourceRepository:pin.repository,sourceCommit:pin.commit};
  validatePublicationFront(html,edition);
  await writeFile(resolve(output,pin.id,'index.html'),html);
  await writeFile(resolve(root,'output/publications',pin.id+'.json'),JSON.stringify(edition,null,2)+'\n');
  gallery=gallery.replace(pin.coverPlaceholder,renderGalleryCover(html));editions.push({pin,html});
}
for(const {pin,html} of editions)validateGalleryCover(gallery,'/'+pin.id+'/',html);
validateGalleryPublications(gallery,books.map(book=>'/'+book.id+'/'));
await writeFile(resolve(output,'index.html'),gallery);
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://handbooks.mikelong.ai/sitemap.xml\n');
await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/',...books.map(book=>'/'+book.id+'/')].map(path=>`<url><loc>https://handbooks.mikelong.ai${path}</loc></url>`).join('')+'</urlset>\n');
await finalizeSiteThemes(output);
console.log(`Built gallery from ${books.length} independent, pinned book repositories`);
