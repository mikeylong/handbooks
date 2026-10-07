import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,mkdir,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
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

// Exercise CLI dispatch: no supplied registry may fall through to approved files.
const temporary=await mkdtemp(join(tmpdir(),'claude-candidate-dispatch-'));
try{
 const pkg=JSON.parse(await readFile(new URL('publication-package.json',book),'utf8'));
 const {digest}=await import('../../publish-evidence-backed-handbook/scripts/reader-paths.mjs');
 const variantManifest={path:'claude-design/pdf-variants.json',sha256:digest(await readFile(new URL('pdf-variants.json',book)))};
 for(const [name,registry,message] of [
  ['invalid schema',{schemaVersion:99,mode:'candidate',book:'claude-design'},'99'],
  ['missing source',{schemaVersion:1,mode:'candidate',book:'claude-design',source:'claude-design/missing-candidate',package:pkg,variantManifest},'missing-candidate'],
  ['approved book is not candidate',{schemaVersion:1,mode:'candidate',book:'claude-design',source:'claude-design',package:pkg,variantManifest},'Selected candidate manifest must remain candidate'],
  ['stale candidate package',{schemaVersion:1,mode:'candidate',book:'claude-design',source:'claude-design',package:{...pkg,files:{'reader/index.html':'0'.repeat(64)}},variantManifest},'Stale candidate package file']
 ]){
  const path=join(temporary,'registry.json');await writeFile(path,JSON.stringify(registry));
  const result=spawnSync(process.execPath,[new URL('validate-release.mjs',import.meta.url).pathname,'--registry',path],{encoding:'utf8'});
  assert.notEqual(result.status,0,name);assert.ok(result.stderr.includes(message),name+': '+result.stderr);
 }
 const fixture=await mkdtemp(join(book.pathname,'.candidate-dispatch-'));
 try{
  const comparison=JSON.parse(await readFile(new URL('qa/v2.0.0/edition-diff.json',book),'utf8'));
  const extras=['Claude_Design_Field_Guide_Source.md','figma-companion.json','qa/v2.0.0/edition-diff.json','qa/v2.0.0/daytime-validation.json','qa/v2.0.0/late-night-validation.json',...Object.values(comparison.artifacts).map(p=>'qa/v2.0.0/'+p)];
  for(const path of new Set([...Object.keys(pkg.files),...extras])){
   const target=join(fixture,path);await mkdir(dirname(target),{recursive:true});await link(new URL(path,book).pathname,target);
  }
  const selected={...manifest,approvalStatus:'candidate'};
  await writeFile(join(fixture,'release-manifest.json'),JSON.stringify(selected));
  const publication=JSON.parse(await readFile(new URL('publication.json',book),'utf8'));
  await writeFile(join(fixture,'publication.json'),JSON.stringify({...publication,approvalStatus:'candidate'}));
  const registry={schemaVersion:1,mode:'candidate',book:'claude-design',source:'claude-design/'+basename(fixture),package:pkg,variantManifest};
  const path=join(temporary,'registry.json');await writeFile(path,JSON.stringify(registry));
  const result=spawnSync(process.execPath,[new URL('validate-release.mjs',import.meta.url).pathname,'--registry',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.ok(result.stdout.includes(fixture),'Validate the selected candidate');
  assert.ok(result.stdout.includes('"publicationApproved": false'),'Candidate validation cannot authorize release');
 }finally{await rm(fixture,{recursive:true,force:true});}
 console.log('Candidate CLI isolation passed: the selected candidate validates without publication authority; invalid registry, missing source, approved-as-candidate and stale candidate bytes fail.');
}finally{await rm(temporary,{recursive:true,force:true});}
