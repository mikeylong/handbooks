#!/usr/bin/env node
// Explicit isolated review assembly; catalog and approval registry are read-only inputs.
import {readFile,writeFile,mkdir,cp,mkdtemp,rm,rename} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {digest,safePath} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {installArtworkPairs} from '../../publish-evidence-backed-handbook/scripts/artwork-pairs.mjs';
import {installDiagrams} from '../../publish-evidence-backed-handbook/scripts/diagrams.mjs';
import {installPromptBlocks} from '../../publish-evidence-backed-handbook/scripts/prompt-blocks.mjs';
import {installTerminalBlocks} from '../../publish-evidence-backed-handbook/scripts/terminal-blocks.mjs';
import {resolvePdfVariants,installReaderDownloads,editionDownloadDetails,validateDownloads,editionPdfUrl} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {writeMarkdownEdition} from '../../publish-evidence-backed-handbook/scripts/markdown-downloads.mjs';
import {reviewEditionSummary,installReviewGalleryCard} from '../../publish-evidence-backed-handbook/scripts/review-edition.mjs';
import {installRetainedReleases} from '../../publish-evidence-backed-handbook/scripts/retained-releases.mjs';
import {addSiteTheme,validateSiteTheme} from '../../publish-evidence-backed-handbook/scripts/site-theme.mjs';
import {renderGalleryCover,validateGalleryCover} from './gallery-covers.mjs';
import {validateGalleryPublications} from './publication-front.mjs';

// Replace one book from its pinned inputs; approved destination-only files cannot fill gaps.
export async function installCandidateBookRoot(collectionRoot,output,book,source,pkg,retained) {
 if(!/^[-a-z0-9]+$/.test(book)||!pkg.files?.[pkg.readerDirectory+'/index.html'])throw Error('Invalid candidate reader root');
 const destination=safePath(output,book),stage=await mkdtemp(resolve(output,'.review-book-'));
 const stagedBook=safePath(stage,book),prefix=pkg.readerDirectory+'/';
 try {
  await mkdir(stagedBook,{recursive:true});
  for(const [path,sha] of Object.entries(pkg.files)) {
   if(!path.startsWith(prefix))continue;
   const bytes=await readFile(safePath(source,path));
   if(digest(bytes)!==sha)throw Error('Stale candidate reader: '+path);
   const target=safePath(stagedBook,path.slice(prefix.length));
   await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
  }
  await installRetainedReleases(collectionRoot,stage,{schemaVersion:retained.schemaVersion,routes:retained.routes.filter(route=>route.url.startsWith('/'+book+'/'))});
  await rm(destination,{recursive:true,force:true});await rename(stagedBook,destination);
 } finally {await rm(stage,{recursive:true,force:true});}
}

async function main() {
const {values:v}=parseArgs({options:{registry:{type:'string'},output:{type:'string'}}});
if(!v.registry||!v.output)throw Error('Use --registry and --output');
const root=resolve(import.meta.dirname,'../..'),output=resolve(v.output);
if(!output.startsWith(root+'/')||!output.includes('/review/')||output===resolve(root,'site/output/site'))throw Error('Review output must be isolated under a review directory');
const registry=JSON.parse(await readFile(resolve(v.registry),'utf8'));
if(registry.schemaVersion!==1||registry.mode!=='candidate'||!/^[-a-z0-9]+$/.test(registry.book))throw Error('Invalid candidate registry');
const source=safePath(root,registry.source),pkg=registry.package;
for(const [path,sha] of Object.entries(pkg.files)){if(digest(await readFile(safePath(source,path)))!==sha)throw Error('Stale candidate reader: '+path);}
const result=spawnSync(process.execPath,[resolve(root,'site/scripts/build-site.mjs')],{stdio:'inherit',cwd:root,env:{...process.env,HANDBOOK_SITE_OUTPUT:output,HANDBOOK_PDF_REVIEW_REGISTRY:''}});
if(result.status!==0)throw Error('Approved collection preview assembly failed');
const manifest=JSON.parse(await readFile(resolve(source,'release-manifest.json'),'utf8')),publication=JSON.parse(await readFile(resolve(source,'publication.json'),'utf8'));
if(manifest.approvalStatus!=='candidate'||publication.approvalStatus!=='candidate')throw Error('Review candidate status required');
const changelog=registry.changelog;
if(!changelog||changelog.version!==manifest.version)throw Error('Candidate changelog pin required');
const decisionBytes=await readFile(safePath(source,changelog.path));
if(digest(decisionBytes)!==changelog.sha256)throw Error('Stale candidate changelog decision');
const decision=JSON.parse(decisionBytes);
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const approved=catalog.books.find(book=>book.id===registry.book&&book.status==='published');
const previous=approved?JSON.parse(await readFile(safePath(root,approved.directory+'/release-manifest.json'),'utf8')):null;
if(previous&&(previous.version!==approved.version||previous.sha256!==approved.pdfSha256))throw Error('Approved previous edition identity mismatch');
const edition={id:registry.book,...manifest,...publication,publicationStatus:'candidate',pdfUrl:editionPdfUrl({id:registry.book,version:manifest.version},`/${registry.book}/${basename(manifest.pdf)}`)};
const variants=await resolvePdfVariants(source,edition,registry.variantManifest,{candidate:true,collectionRoot:root});
const retained=JSON.parse(await readFile(resolve(root,'site/retained-releases.json'),'utf8'));
await installCandidateBookRoot(root,output,edition.id,source,pkg,retained);
let html=await readFile(resolve(output,edition.id,'index.html'),'utf8');
html=await installPromptBlocks(source,html,pkg);html=await installTerminalBlocks(source,html,pkg);html=await installArtworkPairs(source,edition,output,html,pkg);html=await installDiagrams(source,html,pkg);edition.markdown=await writeMarkdownEdition(output,edition,html);html=installReaderDownloads(html,edition,variants);
html=html.replace('<p class="cover-date">','<p class="review-candidate" role="note">Review candidate · Publication has not been approved.</p><p class="cover-date">').replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/pdf-downloads.css"></head>');
html=addSiteTheme(html);validateSiteTheme(html);validateDownloads(html,edition,variants);await writeFile(resolve(output,edition.id,'index.html'),html);
const headers=[];
for(const variant of variants){
 const dest=safePath(output,variant.publicUrl.slice(1));await mkdir(dirname(dest),{recursive:true});await cp(safePath(root,variant.path),dest);
 headers.push({source:variant.publicUrl,headers:[{key:'Content-Type',value:'application/pdf'},{key:'Content-Disposition',value:`attachment; filename="${variant.downloadFilename}"`},{key:'X-Robots-Tag',value:'noindex, nofollow'}]});
}
const dateLabel=new Date(edition.date+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const editionSummary=reviewEditionSummary(edition,decision,previous);
let editionHtml=`<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex,nofollow"><title>${escape(edition.title)} · Edition review</title><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/pdf-downloads.css"></head><body id="book-top"><header class="mobile-bar"><a href="/">← All handbooks</a><a class="mobile-title" href="/${edition.id}/">${escape(edition.title)}</a><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/">← All handbooks</a><a class="sidebar-brand" href="/${edition.id}/"><span>Edition review</span><strong>${escape(edition.title)}</strong></a><div class="sidebar-meta"><a href="/${edition.id}/">Read the handbook</a></div></aside><main id="main-content"><section class="chapter"><h1>Edition review</h1><p>Review candidate · Publication has not been approved.</p><p>${escape(publication.author)} · ${escape(dateLabel)}</p>${editionSummary}${editionDownloadDetails(edition,variants)}${registry.reviewSummary?`<p>${escape(registry.reviewSummary)}</p>`:""}<p><a href="/${edition.id}/">Read the handbook</a> · <a href="/">All handbooks</a></p></section></main></div></body></html>`;
editionHtml=addSiteTheme(editionHtml);validateSiteTheme(editionHtml);validateDownloads(editionHtml,edition,variants);await writeFile(resolve(output,edition.id,'editions','v'+edition.version,'index.html'),editionHtml);
let gallery=await readFile(resolve(output,'index.html'),'utf8');const cover=renderGalleryCover(html);
const reviewCard=`<article class="handbook-card"><a class="handbook-card-link" href="/${edition.id}/" aria-label="Read ${escape(edition.title)} review candidate">${cover}</a></article>`;
gallery=installReviewGalleryCard(gallery,edition.id,reviewCard,{replaceExisting:!!approved});
gallery=gallery.replace('<div class="handbook-grid" aria-label="Handbooks">',`<p role="note">Review preview · ${escape(edition.title)} is an unapproved candidate.</p><div class="handbook-grid" aria-label="Handbooks">`);
validateGalleryCover(gallery,'/'+edition.id+'/',html);validateGalleryPublications(gallery,[...gallery.matchAll(/class="handbook-card-link" href="([^"]+)"/g)].map(match=>match[1]));await writeFile(resolve(output,'index.html'),gallery);
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nDisallow: /\n');await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
await writeFile(resolve(output,'../candidate-headers.json'),JSON.stringify({headers},null,2)+'\n');
await writeFile(resolve(output,'../preview-build.json'),JSON.stringify({status:'passed',mode:'candidate',publicationApproved:false,edition,variants,readerInputSha256:pkg.files[pkg.html],headers},null,2)+'\n');
console.log('Built isolated review collection: '+output);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
