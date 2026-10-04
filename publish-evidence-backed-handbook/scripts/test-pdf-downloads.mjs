import assert from 'node:assert/strict';
import {validateVariantIdentity,downloadLinks,validateDownloads,installReaderDownloads} from './pdf-downloads.mjs';
const edition={id:'future-title',title:'Future title',version:'2.0.0',date:'2026-10-02',pdf:'previous.pdf',sha256:'a'.repeat(64),pages:25,markdown:{version:'2.0.0',publicUrl:'/future-title/editions/v2.0.0/future-title-v2.0.0.md',downloadFilename:'future-title-v2.0.0.md',sha256:'c'.repeat(64)}};
const m={schemaVersion:1,book:edition.id,...edition,variants:['light','dark'].map((theme,i)=>({theme,displayName:i?'Late night version':'Daytime version',appearanceRevision:1,approvalStatus:'candidate',sha256:(i?'b':'a').repeat(64),bytes:1000,pages:25,publicUrl:`/future-title/editions/v2.0.0/future-title-v2.0.0-2026-10-02-${i?'late-night':'daytime'}-r1.pdf`,downloadFilename:`future-title-v2.0.0-2026-10-02-${i?'late-night':'daytime'}-r1.pdf`,pageMap:{path:'map.json',sha256:'c'.repeat(64)}}))};
assert.equal(validateVariantIdentity(m,edition,{candidate:true}).length,2);
assert.throws(()=>validateVariantIdentity(m,edition),/Unapproved/);
for(const [change,error] of [[x=>x.variants.push(x.variants[0]),/Duplicate/],[x=>x.version='3.0.0',/edition mismatch/],[x=>x.variants[1].publicUrl='/../private.pdf',/Unsafe/],[x=>x.variants[0].pages=24,/Daytime identity/],[x=>x.variants.pop(),/both downloads/],[x=>x.variants[1].displayName='Dark PDF',/metadata/],[x=>delete x.variants[1].pageMap,/page map/]]){
 const broken=structuredClone(m);change(broken);assert.throws(()=>validateVariantIdentity(broken,edition,{candidate:true}),error);
}
// Future handbook chrome must derive the title from metadata, without per-book patches.
const reader='<header class="mobile-bar"><a href="/">Back</a><div class="mobile-actions"></div></header><a href="book.pdf" download>PDF</a><main><a href="book.pdf" download>PDF</a></main>';
const rendered=installReaderDownloads(reader,{...edition,title:'Future & handbook'},m.variants);
assert.match(rendered,/<a class="mobile-title" href="#book-top">Future &amp; handbook<\/a>/);
const existing=installReaderDownloads(reader.replace('<div class="mobile-actions">','<a class="mobile-title" href="#book-top">Existing title</a><div class="mobile-actions">'),edition,m.variants);
assert.equal((existing.match(/class="mobile-title"/g)||[]).length,1);
const {externalLinks}=await import('./edition-links.mjs');
for(const source of ['<a href="#chapter">Chapter</a>','<a href="/book.pdf" download>PDF</a>','<a href="https://handbooks.surfaces.systems/book/">Book</a>','<a href="mailto:">Email</a>'])assert.equal(externalLinks(source),source);
const external=externalLinks('<a href="https://example.org/" target="_self" rel="external">Source</a>');
assert.match(external,/target="_blank"/);assert.match(external,/rel="external noopener noreferrer"/);assert.equal(externalLinks(external),external);
const html=downloadLinks(edition,m.variants);validateDownloads(html,edition,m.variants);
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
