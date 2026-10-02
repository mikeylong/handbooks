import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,basename} from 'node:path';
import {editionLinks} from './edition-links.mjs';
export async function validateReaderRelease(root, slug, checks) {
const book=root;
const manifest=JSON.parse(await readFile(resolve(book,'release-manifest.json'),'utf8'));
const digest=b=>createHash('sha256').update(b).digest('hex');
const pdf=resolve(book,manifest.pdf);
if(digest(await readFile(pdf))!==manifest.sha256) throw new Error('Handbook PDF digest mismatch');
const pages=Number(execFileSync('pdfinfo',[pdf],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)?.[1]);
if(pages!==manifest.pages) throw new Error('Handbook page count mismatch');
const text=execFileSync('pdftotext',[pdf,'-'],{encoding:'utf8'});
const html=await readFile(resolve(book,'reader/index.html'),'utf8');
for(const forbidden of checks.forbiddenText) {
 if((text+'\n'+html).toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`Unexpected release text: ${forbidden}`);
}
for(let i=1;i<=checks.chapters;i++) {
 if(!text.includes(`CHAPTER ${String(i).padStart(2,'0')}`)||!text.includes(`Worksheet ${i}:`)||!html.includes(`Worksheet ${i}:`)) throw new Error(`Missing chapter or worksheet ${i}`);
}
for(const asset of manifest.art) if(digest(await readFile(resolve(book,asset.path)))!==asset.sha256) throw new Error(`Art changed: ${asset.path}`);
if(digest(await readFile(resolve(book,'reader',basename(pdf))))!==manifest.sha256) throw new Error('Reader download mismatch');
const publication=JSON.parse(await readFile(resolve(root,'publication.json'),'utf8'));
const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(publication.sourceRepository!==pkg.repository.url || publication.releaseUrl!==`https://handbooks.surfaces.systems/${slug}/editions/v${manifest.version}/` || !editionLinks(html,publication).includes(publication.editionUrl)) throw new Error('Reader repository or release link must belong to this handbook');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(new Set(ids).size!==ids.length) throw new Error('Duplicate reader IDs');
for(const link of html.matchAll(/href="#([^"]+)"/g)) if(!ids.includes(link[1])) throw new Error(`Missing target ${link[1]}`);
let proseLists;
if(checks.semanticLists) {
proseLists = {
 bullets: [...html.matchAll(/<ul class="reader-prose-list">/g)].length,
 steps: [...html.matchAll(/<ol class="reader-prose-list">/g)].length,
 checklists: [...html.matchAll(/<ul class="reader-prose-list reader-checklist">/g)].length,
};
if (Object.values(proseLists).some(count => count === 0)
 || /<td><p>(?:-|\[ \])<\/p><\/td>/.test(html)) throw new Error('Prose lists must use list semantics rather than data tables');
const openers = [...html.matchAll(/<figure class="chapter-art"><img\b[^>]*>/g)];
if (openers.length !== checks.chapters || openers.some(([tag]) => !tag.includes('alt=""'))) throw new Error('Decorative chapter art must have an empty alternative');
}
const sources=[...text.matchAll(new RegExp('\\['+checks.sourcePrefix+'\\d+\\]','g'))];
if(new Set(sources.map(x=>x[0])).size!==checks.sources) throw new Error('Unexpected source count');
const validation=JSON.parse(await readFile(resolve(book,'qa/validation.json'),'utf8'));
if(validation.status!=='passed'||(validation.artifactSha256 ?? validation.sha256)!==manifest.sha256||(validation.stats?.pages ?? validation.pages)!==pages) throw new Error('Reviewed PDF differs from release');
console.log(JSON.stringify({status:'passed',version:manifest.version,pages,sha256:manifest.sha256,chapters:checks.chapters,worksheets:checks.chapters,sources:checks.sources,courseRemoval:'passed',readerDownload:'passed',frozenArt:'passed',...(checks.semanticLists?{proseLists,decorativeArt:'passed'}:{})},null,2));

}
