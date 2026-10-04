import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
import {resolvePdfVariants} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
import {validateLibrary,validatePackage,APPROVAL_REGISTRY} from '../../site/scripts/book-sources.mjs';
const root=resolve(import.meta.dirname,'../..'),book=resolve(root,'claude-design');
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const pin=validateLibrary(catalog).find(b=>b.id==='claude-design');assert.ok(pin);
const pkg=await validatePackage(book,pin);
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json'),'utf8'));
assert.equal(pin.pages,manifest.pages,'Catalog page count differs from the approved PDF');
const comparison=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,'edition-diff.json'),'utf8'));
for(const path of Object.values(comparison.artifacts)){
 assert.match(path,/^[A-Za-z0-9-]+\.patch$/);
 assert.ok((await readFile(resolve(book,'qa','v'+manifest.version,path))).length,'Missing edition comparison patch');
}
const registry=APPROVAL_REGISTRY.books.find(b=>b.id===pin.id);
const variants=await resolvePdfVariants(book,{id:pin.id,...manifest},registry.variantManifest,{collectionRoot:root});
for(const v of variants){
 const bytes=await readFile(resolve(root,v.path));assert.equal(digest(bytes),v.sha256);
 const validation=JSON.parse(await readFile(resolve(book,'qa','v'+manifest.version,v.theme==='light'?'daytime-validation.json':'late-night-validation.json'),'utf8'));
 assert.equal(validation.status,'passed');assert.equal(validation.artifactSha256,v.sha256);
 const text=execFileSync('pdftotext',[resolve(root,v.path),'-'],{encoding:'utf8'});
 assert.doesNotMatch(text,/The October 2 review exercised|local handoff inspection passed/i);
 assert.match(text,/npm ci --ignore-scripts/);
 assert.match(text,/Move between the applications/);
}
const html=await readFile(resolve(book,pkg.html),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(link[1]),'Missing target '+link[1]);
assert.equal((html.match(/class="chapter-art"/g)||[]).length,11);
assert.match(html,/class="handbooks-return-mobile"/);assert.match(html,/href="\/gallery.css"/);
assert.match(html,/https:\/\/handbooks.surfaces.systems\/claude-design\//);
assert.doesNotMatch(html,/Publication has not been approved/);
assert.doesNotMatch(html,/The October 2 review exercised|local handoff inspection passed/i);
assert.ok(html.includes('claude-design-v'+manifest.version+'-local-exercise.zip'));
console.log(JSON.stringify({status:'passed',edition:manifest.version,pages:manifest.pages,pdfs:variants.map(v=>({theme:v.theme,sha256:v.sha256})),readerSha256:pkg.files[pkg.html],chapters:11,nativeWorkflow:'not certified by local exercise',navigation:'passed'},null,2));
