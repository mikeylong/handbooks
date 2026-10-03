#!/usr/bin/env node
// Explicit isolated review assembly; catalog and approval registry are read-only inputs.
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {resolve,dirname,basename} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {digest,safePath} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {installArtworkPairs} from '../../publish-evidence-backed-handbook/scripts/artwork-pairs.mjs';
import {installDiagrams} from '../../publish-evidence-backed-handbook/scripts/diagrams.mjs';
import {resolvePdfVariants,installReaderDownloads,downloadLinks,editionDownloadDetails,validateDownloads} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {addSiteTheme,validateSiteTheme} from '../../publish-evidence-backed-handbook/scripts/site-theme.mjs';
import {renderGalleryCover,validateGalleryCover} from './gallery-covers.mjs';
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
const edition={id:registry.book,...manifest,...publication,pdfUrl:`/${registry.book}/${basename(manifest.pdf)}`};
const variants=await resolvePdfVariants(source,edition,registry.variantManifest,{candidate:true,collectionRoot:root});
await mkdir(resolve(output,edition.id),{recursive:true});await cp(resolve(source,pkg.readerDirectory),resolve(output,edition.id),{recursive:true});
let html=await readFile(resolve(output,edition.id,'index.html'),'utf8');
html=await installArtworkPairs(source,edition,output,html,pkg);html=await installDiagrams(source,html,pkg);html=installReaderDownloads(html,edition,variants);
html=html.replace('<p class="cover-date">','<p class="review-candidate" role="note">Review candidate · Publication has not been approved.</p><p class="cover-date">').replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/pdf-downloads.css"></head>');
html=addSiteTheme(html);validateSiteTheme(html);validateDownloads(html,edition,variants);await writeFile(resolve(output,edition.id,'index.html'),html);
const headers=[];
for(const variant of variants){
 const dest=safePath(output,variant.publicUrl.slice(1));await mkdir(dirname(dest),{recursive:true});await cp(safePath(root,variant.path),dest);
 headers.push({source:variant.publicUrl,headers:[{key:'Content-Type',value:'application/pdf'},{key:'Content-Disposition',value:`attachment; filename="${variant.downloadFilename}"`},{key:'X-Robots-Tag',value:'noindex, nofollow'}]});
}
const dateLabel=new Date(edition.date+'T00:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let editionHtml=`<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="robots" content="noindex,nofollow"><title>${escape(edition.title)} · Edition review</title><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/gallery.css"><link rel="stylesheet" href="/pdf-downloads.css"></head><body id="book-top"><header class="mobile-bar"><a href="/">← All handbooks</a><a class="mobile-title" href="/${edition.id}/">${escape(edition.title)}</a><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/">← All handbooks</a><a class="sidebar-brand" href="/${edition.id}/"><span>Edition review</span><strong>${escape(edition.title)}</strong></a><div class="sidebar-meta"><a href="/${edition.id}/">Read the handbook</a></div></aside><main id="main-content"><section class="chapter"><h1>Edition review</h1><p>Review candidate · Publication has not been approved.</p><p>${escape(publication.author)} · ${escape(dateLabel)} · Proposed first edition ${escape(edition.version)}</p><p>There is no approved previous edition. The retained August PDF is a peer draft; no release changelog is required.</p>${editionDownloadDetails(edition,variants)}${registry.reviewSummary?`<p>${escape(registry.reviewSummary)}</p>`:""}<p><a href="/${edition.id}/">Read the handbook</a> · <a href="/">All handbooks</a></p></section></main></div></body></html>`;
editionHtml=addSiteTheme(editionHtml);validateSiteTheme(editionHtml);validateDownloads(editionHtml,edition,variants);await writeFile(resolve(output,edition.id,'editions','v'+edition.version,'index.html'),editionHtml);
let gallery=await readFile(resolve(output,'index.html'),'utf8');const cover=renderGalleryCover(html);
gallery=gallery.replace('<div class="handbook-grid" aria-label="Handbooks">',`<p role="note">Review preview · ${escape(edition.title)} is an unapproved candidate.</p><div class="handbook-grid" aria-label="Handbooks"><article class="handbook-card"><a class="handbook-card-link" href="/${edition.id}/" aria-label="Read ${escape(edition.title)} review candidate">${cover}</a>${downloadLinks(edition,variants,{compact:true})}</article>`);
validateGalleryCover(gallery,'/'+edition.id+'/',html);validateDownloads(gallery,edition,variants);await writeFile(resolve(output,'index.html'),gallery);
await writeFile(resolve(output,'robots.txt'),'User-agent: *\nDisallow: /\n');await writeFile(resolve(output,'sitemap.xml'),'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
await writeFile(resolve(output,'../candidate-headers.json'),JSON.stringify({headers},null,2)+'\n');
await writeFile(resolve(output,'../preview-build.json'),JSON.stringify({status:'passed',mode:'candidate',publicationApproved:false,edition,variants,readerInputSha256:pkg.files[pkg.html],headers},null,2)+'\n');
console.log('Built isolated review collection: '+output);
