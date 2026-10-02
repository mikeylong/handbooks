import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {validateLibrary,safePath,validatePackage} from './book-sources.mjs';
const catalog=JSON.parse(await readFile(new URL('../../catalog.json',import.meta.url),'utf8'));
const books=validateLibrary(catalog);
for(const id of ['claude-design','poisonous-mushrooms','ai-product-design']) {
 const modified=structuredClone(catalog);const draft=modified.books.find(b=>b.id===id);draft.status='published';draft.version='1.0.0';draft.pdfSha256='a'.repeat(64);
 assert.throws(()=>validateLibrary(modified),/Unapproved public edition/);
}
for(const path of ['../private','/etc/passwd','book/../../private','..\\private'])assert.throws(()=>safePath('/collection',path),/Unsafe/);
const directory=await mkdtemp(resolve(tmpdir(),'handbooks-negative-'));
try {
 await writeFile(resolve(directory,'publication-package.json'),JSON.stringify({id:books[1].id,version:books[1].version,readerDirectory:'reader',html:'reader/index.html',files:{[books[1].pdf]:books[1].pdfSha256,'reader/index.html':'a'.repeat(64)}}));
 // Exercise an actual changed file with an approved manifest, never the canonical package.
 const {cp,mkdir}=await import('node:fs/promises');const source=new URL('../../'+books[1].directory+'/',import.meta.url);
 await cp(source,directory,{recursive:true});
 await writeFile(resolve(directory,books[1].pdf),'changed PDF');await assert.rejects(validatePackage(directory,books[1]),/Approved package changed/);
 await cp(new URL(books[1].pdf,source),resolve(directory,books[1].pdf));
 await writeFile(resolve(directory,'reader/index.html'),'new unapproved reader');await assert.rejects(validatePackage(directory,books[1]),/Approved package changed/);
 await cp(new URL('reader/index.html',source),resolve(directory,'reader/index.html'));
 const packageManifest=JSON.parse(await readFile(resolve(directory,'publication-package.json'),'utf8'));const asset=Object.keys(packageManifest.files).find(path=>path.startsWith('reader/assets/'));
 await writeFile(resolve(directory,asset),'changed artwork');await assert.rejects(validatePackage(directory,books[1]),/Approved package changed/);
 console.log('Draft publication, unsafe paths, changed PDF, unapproved reader and changed artwork are rejected.');
} finally {await rm(directory,{recursive:true,force:true});}
