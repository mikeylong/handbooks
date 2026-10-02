import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateLibrary} from './book-sources.mjs';
const books=JSON.parse(await readFile(new URL('../library.json',import.meta.url),'utf8'));
validateLibrary(books);
assert.throws(()=>validateLibrary([...books,{...books[1],id:'another-book'}]),/own repository/);
for(const update of [{commit:'main'},{repository:'mikeylong/../../private'},{id:'../book'},{pdfSha256:'wrong'}])assert.throws(()=>validateLibrary([{...books[0],...update}]),/Invalid source pin/);
console.log('Source ownership passed: duplicate repos, mutable refs, unsafe paths and invalid PDF pins are rejected.');
