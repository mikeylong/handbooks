import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateReaderDownloadPlacements} from '../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const output=process.env.HANDBOOK_SITE_OUTPUT??resolve(root,'site/output/site');
for(const book of catalog.books.filter(book=>book.status==='published')){
 const html=await readFile(resolve(output,book.id,'index.html'),'utf8');
 assert.equal(validateReaderDownloadPlacements(html).groups,3);
 let companions=[];
 try{companions=JSON.parse(await readFile(resolve(root,book.directory,'reader-downloads.json'),'utf8')).companions;}
 catch(error){if(error.code!=='ENOENT')throw error;}
 const links=[...html.matchAll(/<a\b[^>]*data-companion-download[^>]*>/g)].map(match=>match[0]);
 assert.equal(links.length,companions.length*3,'Configured companion materials must appear in all three reader locations');
 for(const choice of companions)assert.equal(links.filter(link=>link.includes(`download="${choice.filename}"`)).length,3);
 assert.throws(()=>validateReaderDownloadPlacements(html.replace('</main>','<section class="pdf-end-downloads"></section></main>')),/Bottom-of-main/);
 console.log('PASS three reader download locations:',book.id);
}
