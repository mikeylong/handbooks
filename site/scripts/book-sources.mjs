import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

export function validateLibrary(books) {
  if(!Array.isArray(books)||!books.length)throw Error('No published books');
  const ids=new Set(),repos=new Set();
  for(const book of books){
    if(!/^[a-z][a-z0-9-]+$/.test(book.id)||!/^mikeylong\/[a-z0-9-]+$/.test(book.repository)||!/^[a-f0-9]{40}$/.test(book.commit)||!/^[a-f0-9]{64}$/.test(book.pdfSha256))throw Error('Invalid source pin');
    if(ids.has(book.id)||repos.has(book.repository))throw Error('Every handbook must have its own repository');
    ids.add(book.id);repos.add(book.repository);
  }
}

export async function sourceFor(root,book,localSources) {
  if(localSources){
    if(!localSources[book.id])throw Error('Missing local source');
    return resolve(localSources[book.id]);
  }
  const cache=resolve(root,'.cache/books',book.id);
  await rm(cache,{recursive:true,force:true});await mkdir(cache,{recursive:true});
  const response=await fetch(`https://codeload.github.com/${book.repository}/tar.gz/${book.commit}`,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error(`Cannot fetch ${book.repository}@${book.commit}: ${response.status}`);
  const archive=resolve(cache,'source.tar.gz');await writeFile(archive,Buffer.from(await response.arrayBuffer()));
  const listing=execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
  const prefix=book.repository.split('/')[1]+'-'+book.commit;
  for(const path of listing){
    if(path.split('/')[0]!==prefix||path.startsWith('/')||path.split('/').includes('..'))throw Error('Unsafe source archive path');
  }
  const types=execFileSync('tar',['-tvzf',archive],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
  if(types.some(line=>!['-','d'].includes(line[0])))throw Error('Source archive must contain only files and directories');
  const output=resolve(cache,'source');await mkdir(output);
  execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',output]);
  return output;
}
