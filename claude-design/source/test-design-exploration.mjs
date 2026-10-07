import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateExplorationContract,validateExplorationContent} from './validate-design-exploration.mjs';
const book=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('release-manifest.json',book),'utf8'));
validateExplorationContract(manifest);
for(const [name,mutate] of [
 ['wrong host',x=>x.releaseContract.sample.publicUrl=x.releaseContract.sample.publicUrl.replace('handbooks.surfaces.systems','example.com')],
 ['wrong edition',x=>x.releaseContract.sample.publicUrl=x.releaseContract.sample.publicUrl.replace('v2.0.0','v1.3.0')],
 ['private sample',x=>x.releaseContract.sample.repositoryPath='claude-design/review/private.zip'],
 ['missing native hash',x=>delete x.releaseContract.nativeStarter.sha256],
 ['missing classification',x=>x.releaseContract.classifiedChangeIds.pop()],
 ['legacy contract relabeled',x=>x.version='1.3.0']
]){const x=structuredClone(manifest);mutate(x);assert.throws(()=>validateExplorationContract(x),undefined,name);}
const html=await readFile(new URL('reader/index.html',book),'utf8');
const text=execFileSync('pdftotext',[new URL(manifest.pdf,book).pathname,'-'],{encoding:'utf8'});
validateExplorationContent(text,html,manifest.version);
assert.throws(()=>validateExplorationContent(text.replaceAll('unsupported','unverified'),html,manifest.version),undefined,'Do not drop the observed direct-edit failure');
assert.throws(()=>validateExplorationContent(text,html.replaceAll('velori-design-exploration-v2.0.0.zip','missing.zip'),manifest.version),undefined,'Require the exercise download link');
assert.throws(()=>validateExplorationContent(text,html.replace('class="chapter-art"','class="missing-opener"'),manifest.version),undefined,'Require all nine chapter openers');
console.log('V2 contract and content fixtures passed; wrong hosts/editions, private downloads, missing pins, incomplete classifications and missing reader evidence fail. Publication approval is not tested by these fixtures.');
