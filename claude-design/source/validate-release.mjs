import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
const root=[import.meta.dirname,...Array.from({length:10},(_,i)=>resolve(import.meta.dirname,...Array(i+1).fill('..')))].find(path=>existsSync(resolve(path,'catalog.json'))&&existsSync(resolve(path,'site/scripts/book-sources.mjs')));
assert.ok(root,'Run this adapter within a handbooks collection');
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT||resolve(root,'publish-evidence-backed-handbook');
const {digest,safePath}=await import(pathToFileURL(resolve(toolkit,'scripts/reader-paths.mjs')));
const {resolvePdfVariants}=await import(pathToFileURL(resolve(toolkit,'scripts/pdf-downloads.mjs')));
const {validateLibrary,validatePackage,APPROVAL_REGISTRY}=await import(pathToFileURL(resolve(root,'site/scripts/book-sources.mjs')));

export function validateContentContract(text,html,version,{candidate=false}={}){
 assert.doesNotMatch(text,/The October 2 review exercised|local handoff inspection passed/i);
 assert.doesNotMatch(html,/The October 2 review exercised|local handoff inspection passed/i);
 if(/^1\.[01]\./.test(version)){
  assert.match(text,/npm ci --ignore-scripts/);assert.match(text,/Move between the applications/);
  assert.ok(html.includes('claude-design-v'+version+'-local-exercise.zip'));
 }else{
  assert.match(text,/Velori/);assert.match(text,/handoff\/new-run\//);
  assert.match(text,/source conformance/i);assert.doesNotMatch(text,/npm run validate:handoff/);
  assert.match(html,/velori-store-[\d.]+-mit-(?:release|candidate)\.zip/);
 }
 if(!candidate)assert.doesNotMatch(html,/Publication has not been approved/);
}

export async function main(){
const {values:args}=parseArgs({options:{registry:{type:'string'}}});
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const pin=validateLibrary(catalog).find(b=>b.id==='claude-design');assert.ok(pin);
let book=resolve(root,'claude-design'),pkg,variantPin;
const candidate=!!args.registry;
if(candidate){
 const registry=JSON.parse(await readFile(resolve(args.registry),'utf8'));
 assert.equal(registry.schemaVersion,1);assert.equal(registry.mode,'candidate');assert.equal(registry.book,'claude-design');
 book=safePath(root,registry.source);assert.equal(await realpath(book),book,'Candidate source cannot be a symlink');
 pkg=registry.package;variantPin=registry.variantManifest;
 assert.ok(variantPin?.path&&/^[a-f0-9]{64}$/.test(variantPin.sha256),'Pinned candidate PDF variants required');
 assert.equal(pkg.id,'claude-design');assert.equal(pkg.readerDirectory,'reader');assert.equal(pkg.html,'reader/index.html');
 for(const [path,sha] of Object.entries(pkg.files)){
  const file=safePath(book,path);assert.ok((await lstat(file)).isFile());assert.equal(await realpath(file),file);
  assert.equal(digest(await readFile(file)),sha,'Stale candidate package file: '+path);
 }
}else{
 pkg=await validatePackage(book,pin);
 variantPin=APPROVAL_REGISTRY.books.find(b=>b.id===pin.id).variantManifest;
}
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json'),'utf8'));
assert.equal(pkg.version,manifest.version);assert.equal(pkg.files[manifest.pdf],manifest.sha256);assert.ok(pkg.files[pkg.html]);
if(candidate){
 assert.equal(manifest.approvalStatus,'candidate');
 const publication=JSON.parse(await readFile(resolve(book,'publication.json'),'utf8'));
 assert.equal(publication.approvalStatus,'candidate');assert.equal(publication.sourceRepository,catalog.repository);
 for(const field of ['editionUrl','releaseUrl'])assert.equal(new URL(publication[field],catalog.publicHost).pathname,`/claude-design/editions/v${manifest.version}/`);
}else assert.equal(pin.pages,manifest.pages,'Catalog page count differs from the approved PDF');
for(const path of Object.keys(pkg.files))assert.ok(path===manifest.pdf||path.startsWith('reader/'),'Unexpected package member: '+path);
const comparison=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,'edition-diff.json'),'utf8'));
for(const path of Object.values(comparison.artifacts)){
 assert.match(path,/^[A-Za-z0-9-]+\.patch$/);
 assert.ok((await readFile(resolve(book,'qa','v'+manifest.version,path))).length,'Missing edition comparison patch');
}
const variants=await resolvePdfVariants(book,{id:pin.id,...manifest},variantPin,{collectionRoot:root,candidate});
assert.deepEqual(variants.map(variant=>variant.theme).sort(),['dark','light'],'Both PDF appearances are required');
const html=await readFile(resolve(book,pkg.html),'utf8');
for(const v of variants){
 const bytes=await readFile(resolve(root,v.path));assert.equal(digest(bytes),v.sha256);
 const validation=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,v.theme==='light'?'daytime-validation.json':'late-night-validation.json'),'utf8'));
 assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);
 const text=execFileSync('pdftotext',[resolve(root,v.path),'-'],{encoding:'utf8'});
 validateContentContract(text,html,manifest.version,{candidate});
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(link[1]),'Missing target '+link[1]);
assert.equal((html.match(/class="chapter-art"/g)||[]).length,11);
assert.match(html,/class="handbooks-return-mobile"/);assert.match(html,/href="\/gallery.css"/);
assert.match(html,/https:\/\/handbooks.surfaces.systems\/claude-design\//);
for(const match of html.matchAll(/href="([^"#]+\.zip)"/g)){
 const url=new URL(match[1],'https://handbooks.surfaces.systems/claude-design/');
 if(url.origin==='https://handbooks.surfaces.systems'&&url.pathname.startsWith('/claude-design/')){
  const path='reader/'+url.pathname.slice('/claude-design/'.length);assert.ok(pkg.files[path],'Unpinned sample download: '+path);
 }
}
console.log(JSON.stringify({status:'passed',mode:candidate?'candidate':'approved',edition:manifest.version,pages:manifest.pages,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256})),readerSha256:pkg.files[pkg.html],chapters:11,nativeWorkflow:'not certified by local exercise',navigation:'passed'},null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
