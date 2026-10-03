import {readFile,lstat,realpath} from 'node:fs/promises';
import {toolkitModule} from './handbook-toolkit.mjs';
const {safePath, digest} = await toolkitModule('reader-paths.mjs');
import {resolve,relative,isAbsolute} from 'node:path';
import {readFileSync} from 'node:fs';
export const APPROVAL_REGISTRY=JSON.parse(readFileSync(new URL('../approval-registry.json',import.meta.url),'utf8'));
export const PUBLIC_EDITIONS=Object.freeze(Object.fromEntries(APPROVAL_REGISTRY.books.map(b=>[b.id,b.version])));
export {safePath, digest};
export function validateLibrary(catalog) {
 if(catalog.publicHost!=='https://handbooks.surfaces.systems'||catalog.repository!=='https://github.com/mikeylong/handbooks')throw Error('Invalid collection ownership or public host');
 if(JSON.stringify(catalog.approvedPublicEditions)!==JSON.stringify(PUBLIC_EDITIONS))throw Error('Public edition allowlist changed without approval');
 const books=catalog.books.filter(b=>b.status==='published'),ids=new Set();
 for(const b of books){
  if(!PUBLIC_EDITIONS[b.id]||PUBLIC_EDITIONS[b.id]!==b.version||b.directory!==b.id||b.repository!==catalog.repository||! /^[a-f0-9]{64}$/.test(b.pdfSha256))throw Error('Unapproved public edition');
  safePath('/collection',b.directory);safePath('/book',b.pdf);
  if(ids.has(b.id))throw Error('Duplicate public handbook');ids.add(b.id);
 }
 if(books.length!==Object.keys(PUBLIC_EDITIONS).length)throw Error('Missing approved public handbook');return books;
}
export async function sourceFor(siteRoot,book) {
 const root=resolve(siteRoot,'..'),source=safePath(root,book.directory);
 if(await realpath(source)!==source)throw Error('Book source must be a canonical local directory');return source;
}
export async function validatePackage(source,book) {
 const bytes=await readFile(resolve(source,'publication-package.json'));
 const approval=APPROVAL_REGISTRY.books.find(b=>b.id===book.id&&b.version===book.version);
 if(!approval||digest(bytes)!==approval.packageSha256)throw Error('Unapproved package manifest');
 const pkg=JSON.parse(bytes);
 if(pkg.id!==book.id||pkg.version!==book.version||pkg.files?.[book.pdf]!==book.pdfSha256||!pkg.files?.[pkg.html]||pkg.html!==pkg.readerDirectory+'/index.html')throw Error('Approved package identity mismatch');
 const expectedReader=book.id==='production-ai-engineering'?'handbook':'reader';if(pkg.readerDirectory!==expectedReader)throw Error('Invalid approved reader directory');
 for(const [path,sha] of Object.entries(pkg.files)) {
  if(path!==book.pdf&&!path.startsWith(expectedReader+'/'))throw Error('Unexpected public package file');
  const file=safePath(source,path);if(!(await lstat(file)).isFile()||await realpath(file)!==file||digest(await readFile(file))!==sha)throw Error('Approved package changed: '+book.id+'/'+path);
 }
 return pkg;
}
