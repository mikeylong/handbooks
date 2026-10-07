import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,mkdir,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {existsSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {validateExplorationContract,validateExplorationContent,validateExplorationChangeCoverage,validateExplorationNativeEvidence,validateExplorationPrototypeEvidence} from './validate-design-exploration.mjs';
const book=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('release-manifest.json',book),'utf8'));
validateExplorationContract(manifest);
for(const [name,mutate] of [
 ['wrong host',x=>x.releaseContract.sample.publicUrl=x.releaseContract.sample.publicUrl.replace('handbooks.surfaces.systems','example.com')],
 ['wrong edition',x=>x.releaseContract.sample.publicUrl=x.releaseContract.sample.publicUrl.replace('v'+x.version,'v1.3.0')],
 ['private sample',x=>x.releaseContract.sample.repositoryPath='claude-design/review/private.zip'],
 ['missing native hash',x=>delete x.releaseContract.nativeStarter.sha256],
 ['missing classification',x=>x.releaseContract.classifiedChangeIds=[]],
 ['legacy contract relabeled',x=>x.version='1.3.0']
]){const x=structuredClone(manifest);mutate(x);assert.throws(()=>validateExplorationContract(x),undefined,name);}
const html=await readFile(new URL('reader/index.html',book),'utf8');
const text=execFileSync('pdftotext',[new URL(manifest.pdf,book).pathname,'-'],{encoding:'utf8'});
const contentOptions={candidate:manifest.approvalStatus==='candidate'};
validateExplorationContent(text,html,manifest.version,contentOptions);
assert.throws(()=>validateExplorationContent(text.replaceAll('unsupported','unverified'),html,manifest.version,contentOptions),undefined,'Do not drop the observed direct-edit failure');
assert.throws(()=>validateExplorationContent(text,html.replaceAll(`velori-design-exploration-v${manifest.version}.zip`,'missing.zip'),manifest.version,contentOptions),undefined,'Require the exercise download link');
assert.throws(()=>validateExplorationContent(text,html.replace('class="chapter-art"','class="missing-opener"'),manifest.version,contentOptions),undefined,'Require all nine chapter openers');
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
  ['stale candidate package',{schemaVersion:1,mode:'candidate',book:'claude-design',source:'claude-design',package:{...pkg,files:{'reader/index.html':'0'.repeat(64)}},variantManifest},'Stale candidate package file']
 ]){
  const path=join(temporary,'registry.json');await writeFile(path,JSON.stringify(registry));
  const result=spawnSync(process.execPath,[new URL('validate-release.mjs',import.meta.url).pathname,'--registry',path],{encoding:'utf8'});
  assert.notEqual(result.status,0,name);assert.ok(result.stderr.includes(message),name+': '+result.stderr);
 }
 const fixture=await mkdtemp(join(book.pathname,'.candidate-dispatch-'));
 try{
  const comparison=JSON.parse(await readFile(new URL(`qa/v${manifest.version}/edition-diff.json`,book),'utf8'));
  const qa=`qa/v${manifest.version}/`;
  const extras=['Claude_Design_Field_Guide_Source.md','figma-companion.json',qa+'edition-diff.json',qa+'daytime-validation.json',qa+'late-night-validation.json',...Object.values(comparison.artifacts).map(p=>qa+p)];
  if(manifest.releaseContract.prototypeEvidence){const proofPath=manifest.releaseContract.prototypeEvidence.path.slice('claude-design/'.length),proof=JSON.parse(await readFile(new URL(proofPath,book),'utf8'));extras.push(proofPath,proof.sourceEvidence.path.slice('claude-design/'.length));}
  if(manifest.releaseContract.companionParityEvidence){const proofPath=manifest.releaseContract.companionParityEvidence.path.slice('claude-design/'.length),proof=JSON.parse(await readFile(new URL(proofPath,book),'utf8'));extras.push(proofPath,...['figma','react'].map(key=>proof[key].validation.path.slice('claude-design/'.length)));}
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
  await writeFile(join(fixture,'release-manifest.json'),JSON.stringify({...selected,approvalStatus:'approved'}));
  const unapprovedDispatch=spawnSync(process.execPath,[new URL('validate-release.mjs',import.meta.url).pathname,'--registry',path],{encoding:'utf8'});
  assert.notEqual(unapprovedDispatch.status,0,'Approved fixture cannot be treated as candidate');assert.ok(unapprovedDispatch.stderr.includes('Selected candidate manifest must remain candidate'),unapprovedDispatch.stderr);
 }finally{await rm(fixture,{recursive:true,force:true});}
 console.log('Candidate CLI isolation passed: the selected candidate validates without publication authority; invalid registry, missing source, approved-as-candidate and stale candidate bytes fail.');
}finally{await rm(temporary,{recursive:true,force:true});}

const retainedBook=new URL('baselines/v2.0.0/',book);
const originalBook=existsSync(new URL('release-manifest.json',retainedBook))?retainedBook:book;
const original=JSON.parse(await readFile(new URL('release-manifest.json',originalBook),'utf8'));
const originalCompanion=JSON.parse(await readFile(new URL('figma-companion.json',originalBook),'utf8'));
const {digest:hash}=await import('../../publish-evidence-backed-handbook/scripts/reader-paths.mjs');
const nativeEvidence={edition:'2.0.0'},nativeRecords={};
for(const [key,path,source] of [
 ['releaseManifest','claude-design/baselines/v2.0.0/release-manifest.json',new URL('release-manifest.json',originalBook)],
 ['figmaCompanion','claude-design/baselines/v2.0.0/figma-companion.json',new URL('figma-companion.json',originalBook)],
 ['roundtrip','claude-design/qa/v2.0.0/figma-roundtrip-validation.json',new URL('qa/v2.0.0/figma-roundtrip-validation.json',book)],
 ['publicationApproval','claude-design/qa/v2.0.0/publication-approval.json',new URL('qa/v2.0.0/publication-approval.json',book)]
]){const bytes=await readFile(source);nativeEvidence[key]={path,sha256:hash(bytes)};nativeRecords[key]={sha256:hash(bytes),data:JSON.parse(bytes)};}
const successor=structuredClone(original);successor.version='2.1.0';successor.pages=55;
successor.releaseContract={...successor.releaseContract,classifiedChangeIds:['A01','A02'],archiveMemberCount:215,nativeEvidence,prototypeEvidence:{path:'claude-design/qa/v2.1.0/prototype-behavior.json',sha256:'1'.repeat(64)},sample:{publicUrl:'https://handbooks.surfaces.systems/claude-design/editions/v2.1.0/velori-design-exploration-v2.1.0.zip',repositoryPath:'claude-design/reader/editions/v2.1.0/velori-design-exploration-v2.1.0.zip'}};
validateExplorationContract(successor);
for(const [name,mutate,expected] of [
 ['missing archive count',x=>delete x.releaseContract.archiveMemberCount,/archive member count/],
 ['invalid page count',x=>x.pages=0,/page count/],
 ['duplicate classifications',x=>x.releaseContract.classifiedChangeIds.push('A01'),/Duplicate classified/],
 ['current native evidence edition',x=>x.releaseContract.nativeEvidence.edition='2.1.0',/must precede/],
 ['private native proof',x=>x.releaseContract.nativeEvidence.roundtrip.path='claude-design/review/private.json',/original edition/],
 ['unbound native proof',x=>delete x.releaseContract.nativeEvidence.roundtrip.sha256,/Native evidence hash/],
 ['private cart proof',x=>x.releaseContract.prototypeEvidence.path='claude-design/review/cart.json',/Tracked current prototype/],
 ['missing cart proof hash',x=>delete x.releaseContract.prototypeEvidence.sha256,/Prototype evidence hash/]
]){const x=structuredClone(successor);mutate(x);assert.throws(()=>validateExplorationContract(x),expected,name);}
const cartLedger={classifiedChangeIds:['A01','A02'],changes:[{groupedDraftEntries:['A01']},{groupedDraftEntries:['A02']}]};
validateExplorationChangeCoverage(cartLedger,successor.releaseContract);
for(const ids of [[],['A01','A01'],['A03']]){const x=structuredClone(cartLedger);x.changes[1].groupedDraftEntries=ids;assert.throws(()=>validateExplorationChangeCoverage(x,successor.releaseContract),/Every classified change/,JSON.stringify(ids));}
const nativeContext={version:'2.1.0',records:nativeRecords,companion:originalCompanion};
validateExplorationNativeEvidence(successor.releaseContract,nativeContext);
for(const [name,mutate,expected] of [
 ['changed original proof',x=>x.records.roundtrip.sha256='0'.repeat(64),/Stale retained native/],
 ['relabeled original edition',x=>x.records.releaseManifest.data.version='2.1.0',/edition changed/],
 ['unapproved native edition',x=>x.records.releaseManifest.data.approvalStatus='candidate',/approved edition/],
 ['changed native file',x=>x.companion.artifacts[0].sha256='0'.repeat(64),/artifact identity changed/],
 ['new native cart reactions',x=>x.records.roundtrip.data.validation.reactions=1,/0/]
]){const x=structuredClone(nativeContext);mutate(x);assert.throws(()=>validateExplorationNativeEvidence(successor.releaseContract,x),expected,name);}
const checks=Object.fromEntries(['desktopAddToCart','cartChoices','editRestoration','snapshotIsolation','editedItemUpdate','repeatActivation','sameSessionReload','unavailableFixture','emptyCartRecovery','mobile','resetFixture','continueLabel'].map(key=>[key,'passed']));
const cartProof={schemaVersion:1,status:'passed',version:'2.1.0',prototype:{archiveMember:'velori-store/answer-key/velori-review-prototype.html',sha256:'3'.repeat(64)},checks,sourceEvidence:{path:'claude-design/qa/v2.1.0/author-walkthrough.json',sha256:'4'.repeat(64)},limitations:['No new native Claude Design generation trial or new Figma cart frame is claimed.']};
const cartContext={version:'2.1.0',prototypeSha256:'3'.repeat(64),sourceSha256:'4'.repeat(64),sourceData:{version:'2.1.0',artifacts:{'velori-review-prototype.html':{sha256:'3'.repeat(64)}},checks:structuredClone(checks)}};
validateExplorationPrototypeEvidence(cartProof,cartContext);
for(const [name,mutate,expected] of [
 ['old HTML bytes',x=>x.prototype.sha256='0'.repeat(64),/archived HTML/],
 ['failed reset',x=>x.checks.resetFixture='failed',/check required: resetFixture/],
 ['missing Continue check',x=>delete x.checks.continueLabel,/check required: continueLabel/],
 ['invented walkthrough check',x=>x.checks.mobile='passed; inferred',/original walkthrough: mobile/],
 ['private source evidence',x=>x.sourceEvidence.path='claude-design/review/private.json',/tracked with the current edition/],
 ['stale source evidence',x=>x.sourceEvidence.sha256='0'.repeat(64),/Stale original prototype/],
 ['native scope omitted',x=>x.limitations=[],/native trial scope/]
]){const x=structuredClone(cartProof);mutate(x);assert.throws(()=>validateExplorationPrototypeEvidence(x,cartContext),expected,name);}
console.log('Cart successor fixtures passed: exact archive/page contract, classification coverage, immutable native evidence, archived prototype bytes, original walkthrough checks and Continue/Reset gates. Synthetic cart proof is test data, not publication evidence.');
await import('./test-companion-parity.mjs');
