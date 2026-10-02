import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,basename} from 'node:path';
import {editionLinks} from '../../site/scripts/edition-links.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const book=root;
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const pdf=resolve(book,manifest.pdf);
if(digest(await readFile(pdf))!==manifest.sha256) throw new Error('Evaluation PDF digest mismatch');
const pages=Number(execFileSync('pdfinfo',[pdf],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)?.[1]);
if(pages!==manifest.pages) throw new Error('Evaluation page count mismatch');
const text=execFileSync('pdftotext',[pdf,'-'],{encoding:'utf8'});
const html=await readFile(resolve(book,'reader/index.html'),'utf8');
for(const forbidden of ['linkedin','linkedin.com','/Users/mike','Review pilot','Not a release']) {
 if((text+'\n'+html).toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`Unexpected release text: ${forbidden}`);
}
for(let i=1;i<=12;i++) {
 if(!text.includes(`CHAPTER ${String(i).padStart(2,'0')}`)||!text.includes(`Worksheet ${i}:`)||!html.includes(`Worksheet ${i}:`)) throw new Error(`Missing chapter or worksheet ${i}`);
}
for(const asset of manifest.art) if(digest(await readFile(resolve(book,asset.path)))!==asset.sha256) throw new Error(`Art changed: ${asset.path}`);
if(digest(await readFile(resolve(book,'reader',basename(pdf))))!==manifest.sha256) throw new Error('Reader download mismatch');
const publication=JSON.parse(await readFile(resolve(root,'publication.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(publication.sourceRepository!==pkg.repository.url || publication.releaseUrl!==`https://handbooks.surfaces.systems/ai-evaluation/editions/v${manifest.version}/` || !editionLinks(html,publication).includes(publication.editionUrl)) throw new Error('Reader repository or release link must belong to this handbook');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(new Set(ids).size!==ids.length) throw new Error('Duplicate reader IDs');
for(const link of html.matchAll(/href="#([^"]+)"/g)) if(!ids.includes(link[1])) throw new Error(`Missing target ${link[1]}`);
const sources=[...text.matchAll(/\[S\d+\]/g)];
if(new Set(sources.map(x=>x[0])).size!==25) throw new Error('Expected 25 sources');
const validation=JSON.parse(await readFile(resolve(book,'qa/validation.json'),'utf8'));
if(validation.status!=='passed'||validation.sha256!==manifest.sha256||validation.pages!==pages) throw new Error('Reviewed PDF differs from release');
console.log(JSON.stringify({status:'passed',version:manifest.version,pages,sha256:manifest.sha256,chapters:12,worksheets:12,sources:25,courseRemoval:'passed',readerDownload:'passed',frozenArt:'passed'},null,2));
