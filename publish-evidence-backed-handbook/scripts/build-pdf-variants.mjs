#!/usr/bin/env node
/** Explicit candidates only. Runs each ReportLab theme in a fresh interpreter. */
import {readFile,mkdir,cp,writeFile,lstat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {pdfThemeCss} from './pdf-css.mjs';
import {safePath} from './reader-paths.mjs';
import {spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
const scripts=import.meta.dirname, toolkit=resolve(scripts,'..');
const {values:v}=parseArgs({options:{book:{type:'string'},config:{type:'string'},theme:{type:'string'},output:{type:'string'},python:{type:'string'},browser:{type:'string'},'playwright-module':{type:'string'}}});
for(const k of ['book','config','theme','output','python'])if(!v[k])throw Error('Missing --'+k);
if(!['light','dark'].includes(v.theme))throw Error('Invalid theme');
const book=resolve(v.book),config=JSON.parse(await readFile(v.config,'utf8')),out=resolve(v.output);
const run=(command,args)=>{const r=spawnSync(command,args,{stdio:'inherit',env:{...process.env,HANDBOOK_PUBLISHING_TOOLKIT:toolkit}});if(r.status!==0)throw Error(command+' failed: '+r.status);};
// Use the Python guard before any directory copy/render step.
run(v.python,['-c',`import sys;sys.path.insert(0,sys.argv[1]);from pdf_theme import isolated_output;isolated_output(sys.argv[2],sys.argv[3])`,scripts,book,out]);
let art;
if(v.theme==='dark'){
 art=resolve(dirname(out),out.split('/').at(-1).replace('.pdf','')+'-artwork');
 run(v.python,['-c',`import sys,json;sys.path.insert(0,sys.argv[1]);from pdf_artwork import normalize;normalize(sys.argv[2],sys.argv[3],json.load(open(sys.argv[4])))`,scripts,book,art,resolve(v.config)]);
}
if(config.renderer==='reportlab')run(v.python,[resolve(scripts,'build_reportlab_pdf.py'),'--book',book,'--config',resolve(v.config),'--theme',v.theme,'--output',out,...(art?['--artwork',art]:[])]);
else if(config.renderer==='chromium'){
 for(const k of ['browser','playwright-module'])if(!v[k])throw Error('Missing --'+k);
 let source=safePath(book,config.source);const work=resolve(dirname(out),'chromium-'+v.theme);
 if(config.authoring){
  const authoring=resolve(work,'book');await mkdir(authoring,{recursive:true});
  for(const input of config.authoring.inputs){await mkdir(dirname(safePath(authoring,input)),{recursive:true});await cp(safePath(book,input),safePath(authoring,input),{recursive:true});}
  await cp(safePath(book,config.authoring.frozenChangelog),safePath(authoring,config.authoring.targetChangelog));
  const a=spawnSync(config.authoring.command[0],config.authoring.command.slice(1),{cwd:authoring,stdio:'inherit',env:{...process.env,HANDBOOK_PUBLISHING_TOOLKIT:toolkit,HANDBOOK_CANDIDATE_DATE:config.authoring.date,HANDBOOK_BUILD_NOW:'2026-10-02T00:00:00Z'}});if(a.status!==0)throw Error('Canonical authoring failed');
  source=safePath(authoring,config.source);
 }
 await mkdir(work,{recursive:true});
 // Copy canonical source inputs into isolated work; frozen reader bytes stay intact.
 await cp(dirname(source),work,{recursive:true});
 let html=await readFile(source,'utf8');
 if(art){
  let n=0;
  html=html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/g,block=>{
   if(!block.includes('class="chapter-art"'))return block;
   const chapter=Number(block.match(/chapter-(\d+)/)?.[1]); if(!chapter)throw Error('Unmapped chapter art'); n++;
   return block.replace(/<source\b[^>]*>/g,'').replace(/src="[^"]+"/,`src="${resolve(art,`chapter-${String(chapter).padStart(2,'0')}.png`)}"`);
  });
  if(n!==config.chapterCount)throw Error('Missing chapter art placement');
 }
 await writeFile(resolve(work,'index.html'),html);
 const css=pdfThemeCss(v.theme);
 await writeFile(resolve(work,'pdf-theme.css'),css);
 const raw=resolve(work,'raw.pdf');
 run(process.execPath,[resolve(scripts,'render-chromium-pdf.mjs'),'--browser',v.browser,'--html',resolve(work,'index.html'),'--output',raw,'--theme',v.theme,'--theme-css',resolve(work,'pdf-theme.css'),'--playwright-module',v['playwright-module']]);
 run(v.python,[resolve(scripts,'finalize_chromium_pdf.py'),'--input',raw,'--output',out,'--theme',v.theme,'--config',resolve(v.config)]);
}else throw Error('Unsupported renderer');
console.log('Candidate: '+out);
