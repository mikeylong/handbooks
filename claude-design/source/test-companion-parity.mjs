import assert from 'node:assert/strict';
import {validateExplorationContract,validateExplorationNativeEvidence,validateExplorationCompanionParity,validateExplorationPublicationAuthority,explorationSourceFingerprint} from './validate-design-exploration.mjs';

// Synthetic correction fixtures exercise the contract; they are not release evidence.
const version='2.1.1',starterSha='cac28455bdc7979867cfad5b2002e1a711a177bb12a5cb3db5c4c0c2aef7a4ca';
const prototypeSha='7d62bb3d5b178db5ed525985133dec5abc3a96399e6dcb3b36df4b3a27886ebe';
const oldContinuationSha='749de1c6a878c5d86f163d78db68f47e898cc39e2be1f9f04bb0097f90790961',newContinuationSha='1'.repeat(64);
const starter={filename:'velori-design-exploration-starter.fig',role:'starting material',sha256:starterSha,bytes:13891619,format:'native Figma .fig'};
const oldContinuation={filename:'answer-key/velori-review-continuation.fig',role:'static editable answer key',sha256:oldContinuationSha,bytes:13902566,format:'native Figma .fig'};
const continuation={...oldContinuation,sha256:newContinuationSha,bytes:14000000};
const paths={releaseManifest:'claude-design/baselines/v2.0.0/release-manifest.json',figmaCompanion:'claude-design/baselines/v2.0.0/figma-companion.json',roundtrip:'claude-design/qa/v2.0.0/figma-roundtrip-validation.json',publicationApproval:'claude-design/qa/v2.0.0/publication-approval.json'};
const nativeEvidence={edition:'2.0.0',...Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,{path,sha256:'2'.repeat(64)}]))};
const contract={kind:'design-exploration',chapterCount:9,archiveMemberCount:215,classifiedChangeIds:['C01','C02'],nativeStarter:{filename:starter.filename,sha256:starterSha},nativeEvidence,prototypeEvidence:{edition:'2.1.0',path:'claude-design/qa/v2.1.0/prototype-behavior.json',sha256:'3'.repeat(64)},companionParityEvidence:{path:`claude-design/qa/v${version}/companion-parity.json`,sha256:'4'.repeat(64)},sample:{publicUrl:`https://handbooks.surfaces.systems/claude-design/editions/v${version}/velori-design-exploration-v${version}.zip`,repositoryPath:`claude-design/reader/editions/v${version}/velori-design-exploration-v${version}.zip`}};
const manifest={version,pages:55,releaseContract:contract};
validateExplorationContract(manifest);
for(const [name,mutate,expected] of [
 ['missing current correction proof',x=>delete x.releaseContract.companionParityEvidence,/edition-local/],
 ['unbound current correction proof',x=>delete x.releaseContract.companionParityEvidence.sha256,/hash required/],
 ['old current correction path',x=>x.releaseContract.companionParityEvidence.path='claude-design/qa/v2.1.0/companion-parity.json',/edition-local/],
 ['traversal correction path',x=>x.releaseContract.companionParityEvidence.path=`claude-design/qa/v${version}/../v2.1.0/proof.json`,/edition-local/],
 ['relabeled offline trial',x=>x.releaseContract.prototypeEvidence.edition=version,/original edition/],
 ['relocated offline trial',x=>x.releaseContract.prototypeEvidence.path=`claude-design/qa/v${version}/prototype-behavior.json`,/Tracked current prototype/]
]){const x=structuredClone(manifest);mutate(x);assert.throws(()=>validateExplorationContract(x),expected,name);}

const originalCompanion={handbookEdition:'2.0.0',artifacts:[starter,oldContinuation]};
const nativeRecords={releaseManifest:{sha256:nativeEvidence.releaseManifest.sha256,data:{version:'2.0.0',approvalStatus:'approved',releaseContract:{nativeStarter:contract.nativeStarter},publicationApproval:nativeEvidence.publicationApproval}},figmaCompanion:{sha256:nativeEvidence.figmaCompanion.sha256,data:originalCompanion},roundtrip:{sha256:nativeEvidence.roundtrip.sha256,data:{status:'passed',scope:'same account native export',validation:{missingFonts:[],reactions:0,styledTexts:22,instances:Array.from({length:10},(_,i)=>({mainComponent:{id:`7:${i}`}})),variableBoundNodes:66}}},publicationApproval:{sha256:nativeEvidence.publicationApproval.sha256,data:{status:'approved',command:'Land this'}}};
const companion={handbookEdition:version,artifacts:[starter,continuation]};
validateExplorationNativeEvidence(contract,{version,records:nativeRecords,companion});
const changedStarter=structuredClone(companion);changedStarter.artifacts[0].sha256='0'.repeat(64);
assert.throws(()=>validateExplorationNativeEvidence(contract,{version,records:nativeRecords,companion:changedStarter}),/Retained native starter identity changed/);
const sourceFiles={'velori-store/src/model.mjs':'5'.repeat(64),'velori-store/src/main.jsx':'6'.repeat(64),'velori-store/package.json':'7'.repeat(64),'velori-store/package-lock.json':'8'.repeat(64)};
const sourceSha256=explorationSourceFingerprint(sourceFiles);
assert.equal(explorationSourceFingerprint(Object.fromEntries(Object.entries(sourceFiles).reverse())),sourceSha256,'Source fingerprint must ignore filesystem enumeration order');
assert.notEqual(explorationSourceFingerprint({...sourceFiles,'velori-store/src/model.mjs':'0'.repeat(64)}),sourceSha256,'Changed archived source must change its fingerprint');
assert.throws(()=>explorationSourceFingerprint({'velori-store/src/main.jsx':'6'.repeat(64)}),/package metadata required/);
const checks=Object.fromEntries(['desktopAddToCart','cartChoices','editRestoration','snapshotIsolation','editedItemUpdate','repeatActivation','sameSessionReload','unavailableFixture','emptyCartRecovery','mobile','resetFixture','continueLabel'].map(key=>[key,true]));
const figmaPin={path:`claude-design/qa/v${version}/figma-companion-validation.json`,sha256:'9'.repeat(64)},reactPin={path:`claude-design/qa/v${version}/react-browser-validation.json`,sha256:'a'.repeat(64)};
const proof={schemaVersion:1,status:'passed',version,unchangedStarterSha256:starterSha,unchangedStandalonePrototypeSha256:prototypeSha,limitations:['No new native Claude Design generation trial is claimed. The Figma continuation is updated.'],figma:{status:'passed',artifactSha256:newContinuationSha,artifactBytes:continuation.bytes,validation:figmaPin,validationSha256:figmaPin.sha256,reviewAction:'Add to cart',cartFrameId:'2076:46',static:true},react:{status:'passed',packageVersion:version,sourceSha256,validation:reactPin,validationSha256:reactPin.sha256,checks}};
const frames=[{id:'2063:3',role:'review',editable:true,primaryAction:'Add to cart',missingFonts:[],instances:10,styledTexts:24,variableBoundNodes:70},{id:'2076:46',role:'cart',editable:true,missingFonts:[],instances:10,styledTexts:24,variableBoundNodes:70,choices:{finish:'Graphite',face:'Simple',expression:'Amber',accessory:'Carry bag'},quantity:1,productImage:true}];
const validationRecords={figma:{sha256:figmaPin.sha256,data:{schemaVersion:1,status:'passed',version,artifact:{sha256:newContinuationSha,bytes:continuation.bytes},static:true,reviewAction:'Add to cart',cartFrameId:'2076:46',frames}},react:{sha256:reactPin.sha256,data:{schemaVersion:1,status:'passed',version,packageVersion:version,sourceSha256,checks:structuredClone(checks)}}};
const archive={sha256:{...sourceFiles,['velori-store/'+starter.filename]:starterSha,['velori-store/'+continuation.filename]:newContinuationSha,'velori-store/answer-key/velori-review-prototype.html':prototypeSha},bytes:{['velori-store/'+continuation.filename]:continuation.bytes},packageVersion:version,lockVersion:version,lockPackageVersion:version,sourceSha256};
const context={version,contract,nativeRecords,companion,archive,prototypeProof:{version:'2.1.0',prototype:{sha256:prototypeSha}},validationRecords};
validateExplorationCompanionParity(proof,context);
const flexible=structuredClone(context);flexible.validationRecords.figma.data.frames[0].instances=[{mainComponent:{id:'7:1'}}];flexible.validationRecords.figma.data.frames[0].styledTexts=25;flexible.validationRecords.figma.data.frames[0].variableBoundNodes=72;
validateExplorationCompanionParity(proof,flexible);
for(const [name,mutate,expected] of [
 ['wrong correction edition',x=>x.proof.version='2.1.0',/edition mismatch/],
 ['native scope omitted',x=>x.proof.limitations=[],/trial scope/],
 ['modified starter proof',x=>x.proof.unchangedStarterSha256='0'.repeat(64),/starter proof mismatch/],
 ['modified standalone answer',x=>x.context.archive.sha256['velori-store/answer-key/velori-review-prototype.html']='0'.repeat(64),/Standalone prototype changed/],
 ['old Figma continuation',x=>x.context.companion.artifacts[1].sha256=oldContinuationSha,/new cart correction/],
 ['stale Figma artifact',x=>x.proof.figma.artifactSha256=oldContinuationSha,/current continuation/],
 ['stale Figma validation',x=>x.context.validationRecords.figma.sha256='0'.repeat(64),/Stale current Figma/],
 ['missing Figma validation pin',x=>delete x.proof.figma.validation,/edition-local/],
 ['old Figma validation path',x=>x.proof.figma.validation.path='claude-design/qa/v2.0.0/roundtrip.json',/edition-local/],
 ['omitted cart frame',x=>x.context.validationRecords.figma.data.frames.pop(),/Review and Cart frames/],
 ['Review wrong action',x=>x.context.validationRecords.figma.data.frames[0].primaryAction='Confirm configuration',/Review action/],
 ['missing cart choice',x=>delete x.context.validationRecords.figma.data.frames[1].choices.accessory,/four fixture choices/],
 ['duplicate cart quantity',x=>x.context.validationRecords.figma.data.frames[1].quantity=2,/quantity must be one/],
 ['missing native product image',x=>x.context.validationRecords.figma.data.frames[1].productImage=false,/product image/],
 ['missing current Figma font',x=>x.context.validationRecords.figma.data.frames[0].missingFonts=['Arimo'],/Missing current Figma fonts/],
 ['missing editability',x=>x.context.validationRecords.figma.data.frames[1].editable=false,/Editable native/],
 ['stale React source',x=>x.context.archive.sourceSha256='0'.repeat(64),/archived sample/],
 ['wrong React package edition',x=>x.context.archive.packageVersion='0.2.1',/package edition mismatch/],
 ['wrong lockfile edition',x=>x.context.archive.lockPackageVersion='0.2.1',/lockfile root edition mismatch/],
 ['stale React validation',x=>x.context.validationRecords.react.sha256='0'.repeat(64),/Stale current React/],
 ['missing React validation pin',x=>delete x.proof.react.validation,/edition-local/],
 ['old React proof path',x=>x.proof.react.validation.path='claude-design/qa/v2.1.0/browser.json',/edition-local/],
 ['omitted current cart check',x=>delete x.proof.react.checks.desktopAddToCart,/React check required/],
 ['failed current cart validation',x=>x.context.validationRecords.react.data.checks.snapshotIsolation=false,/React validation check required/],
 ['changed prior trial',x=>x.context.prototypeProof.version=version,/Retained prototype edition changed/]
]){const x=structuredClone({proof,context});mutate(x);assert.throws(()=>validateExplorationCompanionParity(x.proof,x.context),expected,name);}

validateExplorationPublicationAuthority({status:'approved',command:'Land this'});
validateExplorationPublicationAuthority({status:'approved',command:'address this and make a new release',authority:{kind:'explicit-user-release'}});
for(const approval of [{status:'candidate',command:'Land this'},{status:'approved',command:'address this and make a new release'},{status:'approved',command:'publish anything',authority:{kind:'explicit-user-release'}}])assert.throws(()=>validateExplorationPublicationAuthority(approval));
console.log('Companion correction fixtures passed: unchanged starter/standalone answer, new native Review/Cart artifact, current archived React source, pinned validations, truthful retained trial scope and explicit release authority. Synthetic fixture evidence is not publication evidence.');
