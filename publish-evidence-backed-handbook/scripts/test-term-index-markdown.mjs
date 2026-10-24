import assert from 'node:assert/strict';
import {readerMarkdown} from './markdown-downloads.mjs';
const h='<main id="main-content"><section class="chapter" id="first"><h2>First topic</h2><p>Body.</p></section><section class="chapter"><h2>Index of terms</h2><div data-term-index><div class="index-columns"><section class="index-group"><h3>A</h3><ul><li><span class="index-term">Acceptance</span><span class="index-pages"><a href="#first">17</a></span></li></ul></section></div></div></section></main>';
const {markdown}=readerMarkdown(h,{id:'fixture',title:'Fixture',version:'1.0.0',date:'2026-10-23'});
assert.match(markdown, /### A/);assert.match(markdown, /- \*\*Acceptance:\*\* \[17\]\(#first-topic\)/);assert(!markdown.includes('Acceptance17'));
assert.throws(()=>readerMarkdown(h.replace('>17</a>','>A long quoted heading</a>'),{id:'fixture',title:'Fixture',version:'1.0.0',date:'2026-10-23'}),/compact page/);
console.log('PASS one Markdown list entry per index term with compact destination links');
