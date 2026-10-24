/** Shared PDF identity resolver and explicit download controls. */
import {readFile,lstat,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {safePath,digest} from './reader-paths.mjs';
import {markdownLink,parseReaderHtml} from './markdown-downloads.mjs';
import {downloadRow,downloadSize} from './download-row.mjs';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export const PDF_NAMES=Object.freeze({light:'Daytime version',dark:'Late night version'});
export function editionPdfUrl(edition,publicUrl){
 if(!/^[a-z0-9-]+$/.test(edition.id)||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(edition.version)||!/^\/[A-Za-z0-9/_.-]+\.pdf$/.test(publicUrl)||publicUrl.includes('..'))throw Error('Unsafe PDF edition route');
 return `/${edition.id}/editions/v${edition.version}/${publicUrl.split('/').pop()}`;
}
export function validateVariantIdentity(manifest, edition, {candidate=false}={}) {
 if(manifest.schemaVersion!==1||manifest.book!==edition.id||manifest.title!==edition.title||manifest.version!==edition.version||manifest.date!==edition.date||manifest.pdf!==edition.pdf||manifest.sha256!==edition.sha256||manifest.pages!==edition.pages)throw Error('PDF variant content-edition mismatch');
 const themes=new Set();
 for(const v of manifest.variants??[]){
  if(themes.has(v.theme)||!PDF_NAMES[v.theme])throw Error('Duplicate or invalid PDF variant');themes.add(v.theme);
  if(v.displayName!==PDF_NAMES[v.theme]||v.appearanceRevision<1||!Number.isSafeInteger(v.pages)||v.pages<1||! /^[a-f0-9]{64}$/.test(v.sha256)||!Number.isSafeInteger(v.bytes)||v.bytes<1)throw Error('Invalid PDF variant metadata');
  if(v.approvalStatus!=='approved'&&!(candidate&&v.approvalStatus==='candidate'))throw Error('Unapproved PDF variant');
  if(!/^\/[A-Za-z0-9/_.-]+\.pdf$/.test(v.publicUrl)||v.publicUrl.includes('..')||! /^[a-z0-9.-]+\.pdf$/.test(v.downloadFilename))throw Error('Unsafe download path');
  const suffix=v.theme==='light'?'daytime':'late-night';
  if(v.theme==='dark'&&v.publicUrl!==`/${edition.id}/editions/v${edition.version}/${v.downloadFilename}`)throw Error('Wrong PDF content-edition route');
  if(v.downloadFilename!==`${edition.id}-v${edition.version}-${edition.date}-${suffix}-r${v.appearanceRevision}.pdf`)throw Error('Wrong saved PDF filename');
  if(v.theme==='light'&&(v.sha256!==edition.sha256||v.pages!==edition.pages))throw Error('Retained Daytime identity mismatch');
  if(!v.pageMap?.path||!v.pageMap?.sha256)throw Error('Missing measured page map');
 }
 if(!themes.has('light')||!themes.has('dark'))throw Error('New appearance manifest requires both downloads');
 return manifest.variants;
}
export async function resolvePdfVariants(source,edition,manifestPin,{candidate=false,collectionRoot=source,measurePdfPages=true}={}){
 if(!manifestPin)return [{theme:'light',displayName:PDF_NAMES.light,appearanceRevision:1,approvalStatus:'approved',path:edition.pdf,publicUrl:editionPdfUrl(edition,edition.pdfUrl),downloadFilename:`${edition.id}-v${edition.version}-${edition.date}-daytime-r1.pdf`,sha256:edition.sha256,pages:edition.pages,bytes:(await lstat(safePath(source,edition.pdf))).size}];
 const file=safePath(collectionRoot,manifestPin.path),bytes=await readFile(file);
 if(digest(bytes)!==manifestPin.sha256)throw Error('Stale PDF manifest hash');
 const manifest=JSON.parse(bytes);const variants=validateVariantIdentity(manifest,edition,{candidate});
 for(const v of variants){
  const p=safePath(collectionRoot,v.path);if(await realpath(p)!==p)throw Error('PDF cannot be a symlink');
  const b=await readFile(p);if(digest(b)!==v.sha256||b.length!==v.bytes)throw Error('Stale PDF artifact');
  // Release checks measure the PDF directly. Static assembly consumes exact-hash
  // approved artifacts and their measured maps, without requiring Poppler on hosts.
  if(measurePdfPages){
   const pages=Number(execFileSync('pdfinfo',[p],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)?.[1]);if(pages!==v.pages)throw Error('Wrong measured PDF page count');
  }
  const mapPath=safePath(collectionRoot,v.pageMap.path),mapBytes=await readFile(mapPath);if(digest(mapBytes)!==v.pageMap.sha256)throw Error('Stale page map hash');
  const map=JSON.parse(mapBytes);if(map.sha256!==v.sha256||map.pages.length!==v.pages)throw Error('Wrong page map identity');
  if(v.theme==='dark'){
   const proof=await readFile(safePath(collectionRoot,v.proof.parity.path));if(digest(proof)!==v.proof.parity.sha256||JSON.parse(proof).status!=='passed'||JSON.parse(proof).candidateSha256!==v.sha256)throw Error('Failed PDF parity');
   if(!candidate&&(!v.proof.visualApproval||v.proof.visualApproval.sha256!==v.sha256||v.proof.visualApproval.status!=='approved'))throw Error('Missing exact-hash visual approval');
  }
 }
 return variants.map(v=>({...v,publicUrl:editionPdfUrl(edition,v.publicUrl)}));
}
export function downloadLinks(edition,variants,{compact=false}={}) {
 const ordered=variants.map(v=>({...v,publicUrl:editionPdfUrl(edition,v.publicUrl)})).sort((a,b)=>['light','dark'].indexOf(a.theme)-['light','dark'].indexOf(b.theme));
 return `<span class="pdf-downloads${compact?' downloads-compact':''}" data-pdf-downloads role="group" aria-label="Download ${escape(edition.title)}"><span class="pdf-download-title">Download</span>${markdownLink(edition)}${ordered.map(v=>`<a class="pdf-download-link" href="${escape(v.publicUrl)}" download="${escape(v.downloadFilename)}" data-pdf-theme="${v.theme}" aria-label="Download ${escape(edition.title)}, ${escape(v.displayName)}, content edition ${escape(edition.version)}, ${v.pages} pages, ${downloadSize(v.bytes)}">${downloadRow(v.displayName,'PDF',v.theme==='light'?'For printing':'For dark reading',`${v.pages} pages, ${downloadSize(v.bytes)}`)}</a>`).join('')}</span>`;
}
const printGuidanceText = 'Use the Daytime version for printing.';
export function removePrintGuidance(html) {
 return html.replace(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi,(paragraph,attributes,body)=>{
  const classes=attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2].split(/\s+/)??[];
  const text=body.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
  return classes.includes('pdf-print-guidance')||text===printGuidanceText?'':paragraph;
 });
}
export function validatePrintGuidanceAbsent(html) {
 const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 if(/\bclass\s*=\s*["'][^"']*\bpdf-print-guidance\b/i.test(html)||text.includes(printGuidanceText)) {
  throw Error('Standalone PDF printing guidance must be omitted');
 }
 return {status:'passed'};
}
/** Reader-only contract; edition pages retain their own download controls. */
export function validateReaderDownloadPlacements(html) {
 const groups=[],nodes=[];
 const has=(node,name)=>(node.attrs?.class??'').split(/\s+/).includes(name);
 function walk(node,ancestors=[]) {
  nodes.push(node);
  if(node.attrs?.['data-pdf-downloads']!==undefined)groups.push({node,ancestors});
  for(const child of node.children??[])walk(child,[...ancestors,node]);
 }
 walk(parseReaderHtml(html));
 if(nodes.some(n=>has(n,'pdf-end-downloads')))throw Error('Bottom-of-main download block is forbidden');
 if(groups.length!==3)throw Error('Reader requires exactly three download groups');
 const slots={
  rail:({ancestors})=>ancestors.some(n=>n.tag==='aside'&&has(n,'sidebar'))&&!ancestors.some(n=>n.tag==='main'),
  cover:({ancestors})=>ancestors.some(n=>has(n,'cover'))&&ancestors.some(n=>n.tag==='main'&&n.attrs?.id==='main-content'),
  contents:({ancestors})=>ancestors.some(n=>has(n,'dialog-footer'))&&ancestors.some(n=>n.tag==='dialog'&&n.attrs?.id==='toc-dialog')
 };
 for(const [name,matches]of Object.entries(slots))if(groups.filter(matches).length!==1)throw Error('Reader requires one download group in '+name);
 for(const group of groups)if(Object.values(slots).filter(matches=>matches(group)).length!==1)throw Error('Download group outside approved reader locations');
 const controls=node=>{
  const found=[];function visit(n){if(n.tag==='a'&&n.attrs?.download!==undefined)found.push(n);for(const c of n.children??[])visit(c);}visit(node);return found;
 };
 const signatures=groups.map(({node})=>controls(node).map(n=>[n.attrs.href,n.attrs.download,n.attrs['data-markdown-download']!==undefined?'markdown':n.attrs['data-pdf-theme']]));
 if(signatures.some(s=>s.length<2||s[0][2]!=='markdown'||JSON.stringify(s)!==JSON.stringify(signatures[0])))throw Error('Reader locations must offer the same Markdown-first downloads');
 for(const node of nodes.filter(n=>n.attrs?.['data-markdown-download']!==undefined||n.attrs?.['data-pdf-theme']!==undefined||(n.tag==='a'&&n.attrs?.download!==undefined&&/\.(?:pdf|md)(?:[?#]|$)/i.test(n.attrs.href??''))))if(!groups.some(g=>controls(g.node).includes(node)))throw Error('Download control outside approved reader group');
 return {status:'passed',locations:Object.keys(slots),groups:3};
}
export function installReaderDownloads(html,edition,variants) {
 html=removePrintGuidance(html);
 html=html.replace(/<section\b([^>]*)>[\s\S]*?<\/section>/gi,(section,attributes)=>{
  const classes=attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2].split(/\s+/)??[];
  return classes.includes('pdf-end-downloads')?'':section;
 });
 html=html.replace(/<header\b[^>]*class="mobile-bar"[^>]*>[\s\S]*?<\/header>/,header=>{
  if(/class="mobile-title"/.test(header)) return header;
  return header.replace(/<div class="mobile-actions"/,`<a class="mobile-title" href="#book-top">${escape(edition.title)}</a><div class="mobile-actions"`);
 });
 let count=0;html=html.replace(/<a\b[^>]*\bdownload(?:="[^"]*")?[^>]*>[\s\S]*?<\/a>/g,a=>{
  if(!/\.pdf(?:["?])/.test(a))return a;
  count++;return downloadLinks(edition,variants,{compact:!a.includes('action-link')});
 });
 if(count<2)throw Error('Missing cover/sidebar PDF downloads');
 validateReaderDownloadPlacements(html);
 return html;
}
export function editionDownloadDetails(edition,variants){
 return variants.map(v=>`<section class="pdf-edition-artifact"><h2>${v.displayName}</h2><p>${v.pages} pages · ${v.bytes.toLocaleString('en-US')} bytes</p><p>PDF appearance revision ${v.appearanceRevision}${v.appearanceDate?' · '+escape(v.appearanceDate):''}</p>${downloadLinks(edition,[v])}<p>SHA-256: <code>${v.sha256}</code></p></section>`).join('')+(variants.some(v=>v.theme==='dark')?'':'<p>The Late night version is not available for this edition.</p>');
}
export function validateDownloads(html,edition,variants){
 validatePrintGuidanceAbsent(html);
 const hasCover=node=>(node.attrs?.class??'').split(/\s+/).includes('cover')||(node.children??[]).some(hasCover);
 if(hasCover(parseReaderHtml(html)))validateReaderDownloadPlacements(html);
 markdownLink(edition);
 if(!html.includes(`href="${edition.markdown.publicUrl}"`)||!html.includes(`download="${edition.markdown.downloadFilename}"`)||!html.includes('data-markdown-download'))throw Error('Missing Markdown edition download');
 for(const group of html.matchAll(/<span\b[^>]*data-pdf-downloads[^>]*>[\s\S]*?<a\b[^>]*>/g))if(!group[0].includes('data-markdown-download'))throw Error('Markdown must be the first download option');
 for(const v of variants){
  if(!html.includes(`download="${v.downloadFilename}"`)||!html.includes(`href="${editionPdfUrl(edition,v.publicUrl)}"`)||!html.includes(`data-pdf-theme="${v.theme}"`)||!html.includes(`content edition ${edition.version}, ${v.pages} pages`))throw Error('Missing download or accessible identity: '+v.displayName);
 }
 for(const anchor of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g))if(/<a\b/.test(anchor[0].slice(2)))throw Error('Nested download');
 return {status:'passed',variants:variants.length};
}
