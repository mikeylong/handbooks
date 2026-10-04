import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolvePdfVariants,installReaderDownloads,validateDownloads} from './pdf-downloads.mjs';
import {installDiagrams} from './diagrams.mjs';
import {installPromptBlocks} from './prompt-blocks.mjs';
import {writeMarkdownEdition} from './markdown-downloads.mjs';
import {safePath} from './reader-paths.mjs';
import {editionLinks} from './edition-links.mjs';
export async function buildApprovedReader(root, slug, {variantManifest=null,collectionRoot=root}={}) {
const manifest=JSON.parse(await readFile(resolve(root,'release-manifest.json'),'utf8'));
const publication=JSON.parse(await readFile(resolve(root,'publication.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
if(digest(await readFile(resolve(root,manifest.pdf)))!==manifest.sha256)throw Error('Approved PDF changed');
if(publication.sourceRepository!==pkg.repository.url)throw Error('Wrong handbook repository');
const output=resolve(root,'output/reader');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
await cp(resolve(root,'reader'),resolve(output,slug),{recursive:true});
if(digest(await readFile(resolve(output,slug,basename(manifest.pdf))))!==manifest.sha256)throw Error('Reader download differs from approved PDF');
let html=editionLinks(await readFile(resolve(output,slug,'index.html'),'utf8'),publication);
if(!html.includes(publication.editionUrl)||!html.includes(publication.releaseUrl))throw Error('Stale repository or release link');
if(!html.includes('href="/gallery.css"'))html=html.replace('</head>','<link rel="stylesheet" href="/gallery.css"><script src="/gallery-focus.js" defer></script></head>');
const edition={id:slug,...manifest,pdfUrl:'/'+slug+'/'+basename(manifest.pdf)};
const variants=await resolvePdfVariants(root,edition,variantManifest,{collectionRoot});
const approvedPackage=JSON.parse(await readFile(resolve(root,'publication-package.json'),'utf8'));
const markdownHtml=await installPromptBlocks(root,await installDiagrams(root,html,approvedPackage),approvedPackage);
edition.approvedReaderSha256=approvedPackage.files[approvedPackage.html];
edition.markdown=await writeMarkdownEdition(output,edition,markdownHtml);
html=installReaderDownloads(html,edition,variants);
validateDownloads(html,edition,variants);
html=html.replace('</head>','<link rel="stylesheet" href="/pdf-downloads.css"></head>');
await cp(new URL('../assets/reader/pdf-downloads.css',import.meta.url),resolve(output,'pdf-downloads.css'));
for(const v of variants){const target=safePath(output,v.publicUrl.slice(1));await mkdir(dirname(target),{recursive:true});await cp(safePath(variantManifest?collectionRoot:root,v.path),target);}
await writeFile(resolve(output,slug,'index.html'),html);
console.log(`Built ${slug} reader; approved PDF ${manifest.sha256}`);

}
