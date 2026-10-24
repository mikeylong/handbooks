import assert from 'node:assert/strict';
import {validateVariantIdentity,downloadLinks,validateDownloads,installReaderDownloads,editionPdfUrl,removePrintGuidance,validatePrintGuidanceAbsent,validateReaderDownloadPlacements} from './pdf-downloads.mjs';
const edition={id:'future-title',title:'Future title',version:'2.0.0',date:'2026-10-02',pdf:'previous.pdf',sha256:'a'.repeat(64),pages:25,markdown:{version:'2.0.0',publicUrl:'/future-title/editions/v2.0.0/future-title-v2.0.0.md',downloadFilename:'future-title-v2.0.0.md',sha256:'c'.repeat(64),bytes:12345}};
const m={schemaVersion:1,book:edition.id,...edition,variants:['light','dark'].map((theme,i)=>({theme,displayName:i?'Late night version':'Daytime version',appearanceRevision:1,approvalStatus:'candidate',sha256:(i?'b':'a').repeat(64),bytes:1000,pages:25,publicUrl:`/future-title/editions/v2.0.0/future-title-v2.0.0-2026-10-02-${i?'late-night':'daytime'}-r1.pdf`,downloadFilename:`future-title-v2.0.0-2026-10-02-${i?'late-night':'daytime'}-r1.pdf`,pageMap:{path:'map.json',sha256:'c'.repeat(64)}}))};
assert.equal(validateVariantIdentity(m,edition,{candidate:true}).length,2);
assert.throws(()=>validateVariantIdentity(m,edition),/Unapproved/);
for(const [change,error] of [[x=>x.variants.push(x.variants[0]),/Duplicate/],[x=>x.version='3.0.0',/edition mismatch/],[x=>x.variants[1].publicUrl='/../private.pdf',/Unsafe/],[x=>x.variants[0].pages=24,/Daytime identity/],[x=>x.variants.pop(),/both downloads/],[x=>x.variants[1].displayName='Dark PDF',/metadata/],[x=>delete x.variants[1].pageMap,/page map/]]){
 const broken=structuredClone(m);change(broken);assert.throws(()=>validateVariantIdentity(broken,edition,{candidate:true}),error);
}
// Future handbook chrome must derive the title from metadata, without per-book patches.
const reader='<header class="mobile-bar"><a href="/">Back</a><div class="mobile-actions"></div></header><aside class="sidebar"><a href="book.pdf" download>PDF</a></aside><main id="main-content"><section class="cover"><a href="book.pdf" download>PDF</a></section></main><dialog id="toc-dialog"><div class="dialog-footer"><a href="book.pdf" download>PDF</a></div></dialog>';
const rendered=installReaderDownloads(reader,{...edition,title:'Future & handbook'},m.variants);
assert.match(rendered,/<a class="mobile-title" href="#book-top">Future &amp; handbook<\/a>/);
const existing=installReaderDownloads(reader.replace('<div class="mobile-actions">','<a class="mobile-title" href="#book-top">Existing title</a><div class="mobile-actions">'),edition,m.variants);
assert.equal((existing.match(/class="mobile-title"/g)||[]).length,1);
// Current and future covers keep printing purpose inside the Daytime download row.
const coverReader=extra=>reader.replace('<section class="cover">','<section class="cover extra"><h1>Future title</h1><p class="cover-date">October 2, 2026 · Version 2.0.0</p>'+extra+'<nav class="cover-actions site-only">').replace('</section></main>','</nav></section></main>');
for(const extra of ['', '<section class="release-window site-only">Legacy panel</section>', '<p class="pdf-print-guidance">Use the Daytime version for printing.</p>', "<p class='extra pdf-print-guidance'>Old printing note</p>", '<p>Use the Daytime <em>version</em> for printing.</p>']){
 const installed=installReaderDownloads(coverReader(extra),edition,m.variants);
 assert.doesNotMatch(installed,/pdf-print-guidance|Use the Daytime version for printing[.]/);
 assert.match(installed,/<strong class="download-name">Daytime version<\/strong><span class="download-purpose">For printing<\/span>/);
 validateDownloads(installed,edition,m.variants);
}
for(const note of ['<p class="pdf-print-guidance">Legacy</p>', '<p>Use the Daytime version for printing.</p>', '<p>Use the Daytime <em>version</em> for printing.</p>']){
 assert.throws(()=>validatePrintGuidanceAbsent(note),/Standalone PDF printing guidance/);
 const clean=removePrintGuidance('<p>Keep handbook prose.</p>'+note+'<p>Keep edition metadata.</p>');
 assert.equal(clean,'<p>Keep handbook prose.</p><p>Keep edition metadata.</p>');
 assert.equal(removePrintGuidance(clean),clean);
 assert.throws(()=>validateDownloads(rendered+note,edition,m.variants),/Standalone PDF printing guidance/);
}
// Reject misplaced groups rather than accepting any matching download link.
assert.deepEqual(validateReaderDownloadPlacements(rendered).locations,['rail','cover','contents']);
for(const bad of [
 rendered.replace('class="sidebar"','class="wrong-rail"'),
 rendered.replace('class="cover"','class="wrong-cover"'),
 rendered.replace('class="dialog-footer"','class="wrong-footer"'),
 rendered.replace('</main>',downloadLinks(edition,m.variants)+'</main>'),
 rendered.replace('</main>','<section class="pdf-end-downloads"></section></main>'),
 rendered.replace('</main>','<a href="orphan.pdf" download>Unwrapped PDF</a></main>'),
 rendered.replace('data-pdf-theme="light"','data-pdf-theme="wrong"')
])assert.throws(()=>validateReaderDownloadPlacements(bad));
assert.throws(()=>validateDownloads(rendered.replace('</main>','<section class="pdf-end-downloads"></section></main>'),edition,m.variants),/Bottom-of-main/);
const legacyBottom=reader.replace('</main>','<section class="pdf-end-downloads"><a href="book.pdf" download>PDF</a></section></main>');
assert.equal(installReaderDownloads(legacyBottom,edition,m.variants).includes('pdf-end-downloads'),false);
const similarClass=reader.replace('</main>','<section class="pdf-end-downloads-note"><p>Keep this prose.</p></section></main>');
assert.match(installReaderDownloads(similarClass,edition,m.variants),/Keep this prose[.]/);
const {externalLinks}=await import('./edition-links.mjs');
for(const source of ['<a href="#chapter">Chapter</a>','<a href="/book.pdf" download>PDF</a>','<a href="https://handbooks.surfaces.systems/book/">Book</a>','<a href="mailto:">Email</a>'])assert.equal(externalLinks(source),source);
const external=externalLinks('<a href="https://example.org/" target="_self" rel="external">Source</a>');
assert.match(external,/target="_blank"/);assert.match(external,/rel="external noopener noreferrer"/);assert.equal(externalLinks(external),external);
const html=downloadLinks(edition,m.variants);validateDownloads(html,edition,m.variants);
const legacy=[{...m.variants[0],publicUrl:'/output/pdf/old-daytime.pdf'},m.variants[1]];
const canonical=downloadLinks(edition,legacy);
assert.match(canonical,/href="\/future-title\/editions\/v2\.0\.0\/old-daytime\.pdf"/);
assert.doesNotMatch(canonical,/href="\/output\/pdf\//);
validateDownloads(canonical,edition,legacy);
assert.equal(editionPdfUrl(edition,'/future-title/daytime.pdf'),'/future-title/editions/v2.0.0/daytime.pdf');
assert.throws(()=>editionPdfUrl(edition,'/../private.pdf'),/Unsafe PDF edition route/);
assert.throws(()=>validateDownloads(canonical.replace('/future-title/editions/v2.0.0/old-daytime.pdf','/output/pdf/old-daytime.pdf'),edition,legacy),/Missing download/);
// Ordering must survive reversed manifest input and compact placements.
for(const compact of [false,true]){
 const ordered=downloadLinks(edition,[...m.variants].reverse(),{compact});
 assert.ok(ordered.indexOf('Markdown edition')<ordered.indexOf('Daytime version'));
 assert.ok(ordered.indexOf('Daytime version')<ordered.indexOf('Late night version'));
 assert.doesNotMatch(ordered,/aria-hidden="true">\s*[·•]/);
 assert.match(ordered,/role="group" aria-label="Download Future title"/);
 const anchors=[...ordered.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(a=>a[0]);
 const reordered=ordered.replace(anchors.join(''),[anchors[1],anchors[0],anchors[2]].join(''));
 assert.throws(()=>validateDownloads(reordered,edition,m.variants),/first download/);
}
const {downloadSize}=await import('./download-row.mjs');
assert.equal(downloadSize(26300935),'26.3 MB');assert.equal(downloadSize(207145),'208 KB');
assert.throws(()=>downloadSize(undefined),/measured download size/);
assert.throws(()=>validateDownloads(html.replace('late-night-r1.pdf','removed.pdf'),edition,m.variants),/Missing download/);
console.log('PDF variant identity, approval, edition, safe paths, duplicate variants, measured labels and missing controls passed.');

// Exercise measured files and hash-bound proof, not only metadata in memory.
if(process.argv[2]){
 const {mkdtemp,cp,writeFile,rm,readFile,realpath}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {resolve}=await import('node:path');
 const {execFileSync}=await import('node:child_process');const {digest}=await import('./reader-paths.mjs');const {resolvePdfVariants}=await import('./pdf-downloads.mjs');
 const root=await realpath(await mkdtemp(resolve(tmpdir(),'pdf-download-gates-')));
 try{
  const variants=[];
  for(const [i,theme] of ['light','dark'].entries()){
   const src=resolve(process.argv[2],theme+'.pdf');await cp(src,resolve(root,theme+'.pdf'));const bytes=await readFile(src),sha=digest(bytes),pages=Number(execFileSync('pdfinfo',[src],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)[1]);
   const map=JSON.stringify({sha256:sha,pages:Array.from({length:pages},(_,i)=>({page:i+1}))});await writeFile(resolve(root,theme+'-map.json'),map);
   const proof=JSON.stringify({status:'passed',candidateSha256:sha});await writeFile(resolve(root,'parity.json'),proof);
   variants.push({...m.variants[i],path:theme+'.pdf',sha256:sha,bytes:bytes.length,pages,pageMap:{path:theme+'-map.json',sha256:digest(map)},proof:{parity:{path:'parity.json',sha256:digest(proof)}}});
  }
  const e={...edition,pdf:'light.pdf',sha256:variants[0].sha256,pages:variants[0].pages},manifest={...m,pdf:e.pdf,sha256:e.sha256,pages:e.pages,variants};
  async function check(record){const bytes=JSON.stringify(record);await writeFile(resolve(root,'manifest.json'),bytes);return resolvePdfVariants(root,e,{path:'manifest.json',sha256:digest(bytes)},{candidate:true});}
  assert.equal((await check(manifest)).length,2);
  for(const [change,error] of [[x=>x.variants[1].pages++,/measured PDF/],[x=>x.variants[1].sha256='e'.repeat(64),/Stale PDF artifact/],[x=>x.variants[1].pageMap.sha256='e'.repeat(64),/Stale page map/],[x=>x.variants[1].proof.parity.sha256='e'.repeat(64),/parity/],[x=>x.variants[1].publicUrl=x.variants[1].publicUrl.replace('v2.0.0','v3.0.0'),/edition route/],[x=>x.variants[1].path='../private.pdf',/Unsafe/]]){
   const bad=structuredClone(manifest);change(bad);await assert.rejects(()=>check(bad),error);
  }
  console.log('Measured PDF count, artifact/map/proof hashes, edition routes and unsafe artifact paths rejected as expected.');
 }finally{await rm(root,{recursive:true,force:true});}
}
