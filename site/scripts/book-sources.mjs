import {readFile,lstat,realpath} from 'node:fs/promises';
import {toolkitModule} from './handbook-toolkit.mjs';
const {safePath, digest} = await toolkitModule('reader-paths.mjs');
import {resolve,relative,isAbsolute} from 'node:path';
export const PUBLIC_EDITIONS = Object.freeze({'production-ai-engineering':'1.4.0','ai-evaluation':'1.0.0','ai-consulting':'1.0.0'});
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
 const pkg=JSON.parse(await readFile(resolve(source,'publication-package.json'),'utf8'));
 if(pkg.id!==book.id||pkg.version!==book.version||pkg.files?.[book.pdf]!==book.pdfSha256||!pkg.files?.[pkg.html]||pkg.html!==pkg.readerDirectory+'/index.html')throw Error('Approved package identity mismatch');
 const expectedReader=book.id==='production-ai-engineering'?'handbook':'reader';if(pkg.readerDirectory!==expectedReader)throw Error('Invalid approved reader directory');
 for(const [path,sha] of Object.entries(pkg.files)) {
  if(path!==book.pdf&&!path.startsWith(expectedReader+'/'))throw Error('Unexpected public package file');
  const file=safePath(source,path);if(!(await lstat(file)).isFile()||await realpath(file)!==file||digest(await readFile(file))!==sha)throw Error('Approved package changed: '+book.id+'/'+path);
 }
 return pkg;
}
