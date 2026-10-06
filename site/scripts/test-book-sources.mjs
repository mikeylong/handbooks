import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,mkdir,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {validateLibrary,safePath,validatePackage,PUBLIC_EDITIONS} from './book-sources.mjs';
import {installCandidateBookRoot,installReviewSelfLinks} from './build-review-preview.mjs';
import {digest} from '../../publish-evidence-backed-handbook/scripts/reader-paths.mjs';
const catalog=JSON.parse(await readFile(new URL('../../catalog.json',import.meta.url),'utf8'));
const books=validateLibrary(catalog);
const fixture=books.find(b=>b.id==='ai-evaluation');
const reviewEdition={id:'claude-design',version:'1.3.0'};
const currentBook='https://handbooks.surfaces.systems/claude-design/';
const currentEdition=currentBook+'editions/v1.3.0/';
const navigation=`<link rel="canonical" href="${currentBook}"><a href="${currentBook}">Read</a><a class="edition" href='${currentEdition}?view=review&amp;format=html#downloads'>Edition</a><a href="${currentBook}editions/v1.2.1/">Earlier edition</a><a href="${currentEdition}daytime.pdf">PDF</a><a href="https://handbooks.surfaces.systems/ai-evaluation/">Other book</a><a data-href="${currentBook}" href="https://example.com/claude-design/">Source</a>`;
const localNavigation=installReviewSelfLinks(navigation,reviewEdition);
assert.ok(localNavigation.includes(`<link rel="canonical" href="${currentBook}">`));
assert.ok(localNavigation.includes('<a href="/claude-design/">Read</a>'));
assert.ok(localNavigation.includes("href='/claude-design/editions/v1.3.0/?view=review&amp;format=html#downloads'"));
for(const retained of [`${currentBook}editions/v1.2.1/`,`${currentEdition}daytime.pdf`,'https://handbooks.surfaces.systems/ai-evaluation/','https://example.com/claude-design/'])assert.ok(localNavigation.includes(`href="${retained}"`));
assert.ok(localNavigation.includes(`data-href="${currentBook}"`));
assert.equal(installReviewSelfLinks(localNavigation,reviewEdition),localNavigation);
assert.throws(()=>installReviewSelfLinks(navigation,{id:'../private',version:'1.3.0'}),/Invalid review edition route/);
console.log('Review navigation stays local for the current book and edition; canonical metadata, downloads, earlier editions and source links retain their destinations.');
assert.ok(books.some(b=>b.id==='claude-design'&&b.version===PUBLIC_EDITIONS['claude-design']));
const stale=structuredClone(catalog);stale.books.find(b=>b.id==='claude-design').version=PUBLIC_EDITIONS['claude-design']+'-unapproved-test';assert.throws(()=>validateLibrary(stale),/Unapproved public edition/);
for(const id of ['poisonous-mushrooms','ai-product-design']) {
 const modified=structuredClone(catalog);const draft=modified.books.find(b=>b.id===id);draft.status='published';draft.version='1.0.0';draft.pdfSha256='a'.repeat(64);
 assert.throws(()=>validateLibrary(modified),/Unapproved public edition/);
}
for(const path of ['../private','/etc/passwd','book/../../private','..\\private'])assert.throws(()=>safePath('/collection',path),/Unsafe/);
const directory=await mkdtemp(resolve(tmpdir(),'handbooks-negative-'));
try {
 await writeFile(resolve(directory,'publication-package.json'),JSON.stringify({id:fixture.id,version:fixture.version,readerDirectory:'reader',html:'reader/index.html',files:{[fixture.pdf]:fixture.pdfSha256,'reader/index.html':'a'.repeat(64)}}));
 // Exercise an actual changed file with an approved manifest, never the canonical package.
 const {cp,mkdir}=await import('node:fs/promises');const source=new URL('../../'+fixture.directory+'/',import.meta.url);
 await cp(source,directory,{recursive:true});
 await writeFile(resolve(directory,fixture.pdf),'changed PDF');await assert.rejects(validatePackage(directory,fixture),/Approved package changed/);
 await cp(new URL(fixture.pdf,source),resolve(directory,fixture.pdf));
 await writeFile(resolve(directory,'reader/index.html'),'new unapproved reader');await assert.rejects(validatePackage(directory,fixture),/Approved package changed/);
 await cp(new URL('reader/index.html',source),resolve(directory,'reader/index.html'));
 const packageManifest=JSON.parse(await readFile(resolve(directory,'publication-package.json'),'utf8'));const asset=Object.keys(packageManifest.files).find(path=>path.startsWith('reader/assets/'));
 await writeFile(resolve(directory,asset),'changed artwork');await assert.rejects(validatePackage(directory,fixture),/Approved package changed/);
 console.log('Draft publication, unsafe paths, changed PDF, unapproved reader and changed artwork are rejected.');
} finally {await rm(directory,{recursive:true,force:true});}

const review=await mkdtemp(resolve(tmpdir(),'handbooks-candidate-root-'));
try {
 const source=resolve(review,'source'),output=resolve(review,'site'),book='fixture-book';
 const files={};
 const put=async(path,bytes)=>{await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,bytes);};
 for(const [name,bytes] of Object.entries({'index.html':'candidate reader','new.css':'candidate style','assets/renamed.png':'candidate image','new-download.zip':'candidate download'})) {
  await put(resolve(source,'reader',name),bytes);files['reader/'+name]=digest(Buffer.from(bytes));
 }
 await put(resolve(source,'reader/unpinned-owner.json'),'excluded unpinned file');
 for(const name of ['index.html','old.css','assets/omitted.png','old-download.zip','editions/v2.0.0/index.html'])await put(resolve(output,book,name),'obsolete approved bytes');
 await put(resolve(output,'other-book/index.html'),'other book stays unchanged');
 const routes=[];
 for(const [i,url] of ['/fixture-book/editions/v1.0.0/index.html','/fixture-book/editions/v1.0.0/old.pdf','/fixture-book/retained-download.zip','/other-book/index.html'].entries()) {
  const bytes='retained artifact '+i,path='frozen-'+i;
  await put(resolve(review,path),bytes);routes.push({url,source:path,sha256:digest(Buffer.from(bytes))});
 }
 const pkg={readerDirectory:'reader',html:'reader/index.html',files},retained={schemaVersion:1,routes};
 await installCandidateBookRoot(review,output,book,source,pkg,retained);
 for(const [path,sha] of Object.entries(files))assert.equal(digest(await readFile(resolve(output,book,path.slice('reader/'.length)))),sha);
 for(const name of ['old.css','assets/omitted.png','old-download.zip','editions/v2.0.0/index.html','unpinned-owner.json'])await assert.rejects(readFile(resolve(output,book,name)),{code:'ENOENT'});
 for(const route of routes.filter(route=>route.url.startsWith('/'+book+'/')))assert.equal(digest(await readFile(resolve(output,route.url.slice(1)))),route.sha256);
 assert.equal(await readFile(resolve(output,'other-book/index.html'),'utf8'),'other book stays unchanged');
 await writeFile(resolve(source,'reader/new.css'),'changed candidate style');
 await assert.rejects(installCandidateBookRoot(review,output,book,source,pkg,retained),/Stale candidate reader/);
 assert.equal(await readFile(resolve(output,book,'new.css'),'utf8'),'candidate style');
 assert.ok((await readdir(output)).every(name=>!name.startsWith('.review-book-')));
 console.log('Candidate roots use only pinned files and retained book routes; obsolete CSS, images, downloads and unpinned files are excluded, other books and failed-stage output are preserved.');
} finally {await rm(review,{recursive:true,force:true});}
