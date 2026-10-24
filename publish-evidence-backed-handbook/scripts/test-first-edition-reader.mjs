#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {validateFirstEditionEvidence,validateFirstEditionPackage} from './build-first-edition-reader.mjs';
const m={title:'Fixture',version:'1.0.0',date:'2026-10-23',pages:1,sha256:'a'.repeat(64)};
const v={status:'passed',profile:'candidate',failures:[],artifactSha256:m.sha256,stats:{pages:1},changelogDecision:{firstEdition:true,includeChangelog:false}};
const input={baseline:null,decision:{status:'not-applicable',includeChangelog:false,entryCount:0,expectedEntries:[],requiredPdfState:{changelogPages:0}},measurements:{light:structuredClone(m),dark:structuredClone(m)},validations:{light:structuredClone(v),dark:structuredClone(v)},parity:{status:'passed',failures:[],retainedSha256:m.sha256,candidateSha256:m.sha256}};
validateFirstEditionEvidence(input);
const negatives=[
 ['invented approved baseline',x=>x.baseline={version:'0.0.0'}],
 ['missing first-edition declaration',x=>delete x.baseline],
 ['false unchanged-edition decision',x=>x.decision.status='passed'],
 ['unmatched validation PDF',x=>x.validations.dark.artifactSha256='b'.repeat(64)],
 ['unmatched pair proof',x=>x.parity.retainedSha256='b'.repeat(64)],
 ['different content edition',x=>x.measurements.dark.version='1.1.0']
];
for(const [name,mutate]of negatives){const x=structuredClone(input);mutate(x);assert.throws(()=>validateFirstEditionEvidence(x),undefined,name);}
let packageChecks=[];
if(process.argv[2]) {
 const original=resolve(process.argv[2]);await validateFirstEditionPackage(original);
 const temporary=await mkdtemp(resolve(tmpdir(),'handbook-first-edition-tests-'));
 try {
  const copy=resolve(temporary,'package');await cp(original,copy,{recursive:true});
  const receipt=JSON.parse(await readFile(resolve(copy,'first-edition-package.json'),'utf8'));
  const reader=resolve(copy,'site',receipt.edition.id,'index.html');
  await writeFile(reader,(await readFile(reader,'utf8'))+'<!-- changed -->');
  await assert.rejects(validateFirstEditionPackage(copy),/inventory mismatch/);packageChecks.push('full-payload tampering rejected');
  receipt.approvalStatus='approved';await writeFile(resolve(copy,'first-edition-package.json'),JSON.stringify(receipt));
  await assert.rejects(validateFirstEditionPackage(copy),/contains approval/);packageChecks.push('inherited approval rejected');
 }finally{await rm(temporary,{recursive:true,force:true});}
}
console.log(JSON.stringify({status:'passed',negativeCases:negatives.map(x=>x[0]),packageChecks}));
