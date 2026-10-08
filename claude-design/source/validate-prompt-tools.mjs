import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT||Array.from({length:10},(_,i)=>resolve(here,...Array(i).fill('..'),'publish-evidence-backed-handbook')).find(path=>existsSync(resolve(path,'SKILL.md')));
assert.ok(toolkit,'Shared handbook toolkit is required');
const {readerMarkdown}=await import(pathToFileURL(resolve(toolkit,'scripts/markdown-downloads.mjs')));

const destinations = new Map([['01','Claude Design'],['02','Claude Design'],['03','Claude Design'],['04','Claude Design'],['05','Claude Design'],['07','Claude Code']]);
const normalize = value => value.replace(/\s+/g,' ').trim();
const sha = value => createHash('sha256').update(value).digest('hex');

/** The exercise's six authoring examples must identify their actual recipient. */
export function validatePromptTools(source) {
  assert.doesNotMatch(source,/^```(?:text|txt|plaintext)?\s*$/m,'Use tool-named prompt directives for prose instructions; do not label them as code.');
  const lines=source.split('\n'),prompts=[];
  let chapter=null;
  for(let i=0;i<lines.length;i++) {
    const marker=lines[i].match(/^<!-- CHAPTER (\d+) \|/);
    if(marker)chapter=marker[1];
    const start=lines[i].match(/^::: prompt (.*?) \| (.+)$/);
    if(!start)continue;
    const line=i+1,body=[];
    while(++i<lines.length&&lines[i]!==':::')body.push(lines[i]);
    assert.ok(i<lines.length,'Unclosed prompt at line '+line);
    assert.equal(start[1],destinations.get(chapter),'Wrong prompt tool in chapter '+chapter);
    assert.ok(start[2].trim()&&!/^(?:code|prompt|example)$/i.test(start[2]),'Name the prompt task');
    assert.ok(body.join('\n').trim(),'Empty prompt');
    prompts.push({chapter,tool:start[1],title:start[2],line,body:body.join('\n'),bodySha256:sha(body.join('\n'))});
  }
  assert.deepEqual(prompts.map(p=>p.chapter),[...destinations.keys()],'Keep the six exercise prompts in their intended chapters.');
  assert.match(source,/Exclude the completed Review and Cart implementations from baseline context\./,'Keep both completed screens out of initial generation.');
  assert.doesNotMatch(source,/Continue to Code implementation|\| Code or Figma checks/,'Name Claude Code at the implementation destination.');
  return prompts;
}

export function validatePromptOutputs(source,{markdown,pdfText,html}={}) {
  const prompts=validatePromptTools(source);
  if(html!==undefined) {
    const blocks=[...html.matchAll(/<figure class="reader-prompt">[\s\S]*?<\/figure>/g)].map(match=>match[0]);
    assert.equal(blocks.length,prompts.length,'Render every example with prompt semantics.');
    assert.doesNotMatch(html,/class="reader-code(?:\s+[^"]*)?"/,'This edition contains prose prompts, not executable code examples.');
    for(let i=0;i<prompts.length;i++) {
      const p=prompts[i];
      const parsed=readerMarkdown('<main id="main-content"><section class="chapter" id="prompt-check"><h2>Prompt check</h2>'+blocks[i]+'</section></main>',{id:'claude-design',title:'Prompt validation',version:'2.1.2',date:'2026-10-07'});
      const flat=normalize(parsed.markdown);
      assert.equal(parsed.index.prompts,1,'Reader example must retain prompt semantics');
      assert.ok(flat.toUpperCase().includes((p.tool+' / '+p.title).toUpperCase()),'Missing reader tool/task heading: '+p.title);
      assert.ok(flat.includes(normalize(p.body)),'Changed or missing HTML prompt body: '+p.title);
    }
  }
  for(const [format,text] of [['Markdown',markdown],['PDF',pdfText]]) {
    if(text===undefined)continue;
    const flat=normalize(text),upper=flat.toUpperCase();
    for(const p of prompts) {
      assert.ok(upper.includes((p.tool+' / '+p.title).toUpperCase()),'Missing '+format+' tool/task heading: '+p.title);
      assert.ok(flat.includes(normalize(p.body)),'Changed or missing '+format+' prompt body: '+p.title);
    }
  }
  return {status:'passed',prompts:prompts.map(({body,...metadata})=>metadata)};
}
