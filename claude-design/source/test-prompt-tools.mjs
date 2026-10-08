import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePromptTools,validatePromptOutputs} from './validate-prompt-tools.mjs';

const source=await readFile(process.argv[2]||new URL('../Claude_Design_Field_Guide_Source.md',import.meta.url),'utf8');
const rows=validatePromptTools(source);
assert.equal(rows.filter(p=>p.tool==='Claude Design').length,5);
assert.equal(rows.filter(p=>p.tool==='Claude Code').length,1);
for(const [name,changed] of [
  ['generic code formatting',source.replace(/^::: prompt .*? \| .*$/m,'```text').replace(':::','```')],
  ['design prompt sent to implementation',source.replace('::: prompt Claude Design','::: prompt Claude Code')],
  ['implementation prompt sent to design',source.replace('::: prompt Claude Code','::: prompt Claude Design')],
  ['missing tool name',source.replace('::: prompt Claude Design','::: prompt Code')],
  ['omitted cart exclusion',source.replace('Review and Cart implementations','Review implementation')],
  ['ambiguous destination',source.replace('Continue to implementation in Claude Code','Continue to Code implementation')]
])assert.throws(()=>validatePromptTools(changed),undefined,name);
const headers=rows.map(p=>p.tool+' / '+p.title).join('\n');
const validText=headers+'\n'+rows.map(p=>p.body).join('\n');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const validHtml=rows.map(p=>'<figure class="reader-prompt"><figcaption><span class="reader-prompt-title">'+escape(p.tool+' / '+p.title)+'</span></figcaption><div class="reader-prompt-body"><p>'+escape(p.body)+'</p></div></figure>').join('\n');
validatePromptOutputs(source,{markdown:validText,pdfText:validText,html:validHtml});
assert.throws(()=>validatePromptOutputs(source,{html:validHtml.replace(escape(rows[0].body),'REPLACED BODY')}),/HTML prompt body/,'Do not accept a reader with the right label and the wrong copyable instructions');
assert.throws(()=>validatePromptOutputs(source,{pdfText:validText.replace('Claude Code /','Code /')}),/Missing PDF/,'Do not lose the implementation tool name in PDF output');
assert.throws(()=>validatePromptOutputs(source,{markdown:validText.replace(rows[0].body,'Changed body')}),/prompt body/,'Preserve copyable prompt text');
console.log('PASS prompt destinations, source semantics, answer exclusions, and output tool/body preservation; invalid mutations fail.');
