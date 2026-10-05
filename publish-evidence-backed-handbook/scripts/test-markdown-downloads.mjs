import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readerMarkdown,writeMarkdownEdition,markdownLink} from './markdown-downloads.mjs';
import {downloadLinks,installReaderDownloads,validateDownloads} from './pdf-downloads.mjs';
const edition={id:'future-book',title:'Future & book',version:'3.0.0',date:'2026-10-04'};
const code='  first\n\n\n  second ```\n';
const html=`<main id="main-content"><section class="cover"><h1>Future &amp; book</h1><p>Cover chrome</p></section><section class="contents-page"><h2>Contents</h2></section><section class="chapter" id="first"><h2>A &amp; B</h2><p>A named &rarr; rule with <strong>bold</strong>, <em>emphasis</em>, <code>x_y</code>, and a <a href="#second">return</a>.</p><pre><code class="language-js">${code}</code></pre><ol start="8"><li>Eight<ul><li>Nested</li></ul></li><li>Nine</li></ol><table><caption>Measured inputs</caption><tr><th>Meaning</th><th>Value</th></tr><tr><td>One | two</td><td><p>1</p><p>2</p></td></tr></table><figure class="reader-prompt"><figcaption><span class="reader-prompt-title">Code | Preserve</span></figcaption><div class="reader-prompt-body"><p>Keep &lt;value&gt; and &#96;&#96;&#96; exactly.</p><p>Second line.</p></div></figure><div class="semantic-diagram"><strong>Frame</strong><details><summary>Diagram relationships</summary><ul><li>Frame → Ground (feedback)</li></ul></details></div><div class="diagram-print">Duplicate raster label</div></section><section class="chapter" id="second"><h2>A &amp; B</h2><p>Second chapter.</p></section></main>`;
const {markdown,index}=readerMarkdown(html,edition);
assert.match(markdown,/title: "Future & book"/);
assert.match(markdown,/A named → rule/);
assert.match(markdown,/\[return\]\(#a--b-1\)/);
assert.ok(markdown.includes('````js\n'+code+'````'));
assert.match(markdown,/8\. Eight/);assert.match(markdown,/9\. Nine/);
assert.match(markdown,/Measured inputs/);assert.ok(markdown.includes('One \\| two'));
assert.ok(markdown.includes('````text\nKeep <value> and ``` exactly.\nSecond line.\n````'));
assert.equal(index.prompts,1);assert.equal(index.sections.length,2);
assert.match(markdown,/Frame → Ground \(feedback\)/);
assert.doesNotMatch(markdown,/Cover chrome|Duplicate raster label|## Contents/);
assert.throws(()=>readerMarkdown('<main id="main-content"></main>',edition),/no chapters/);
assert.throws(()=>readerMarkdown(html,{...edition,id:'../private'}),/identity/);
assert.throws(()=>readerMarkdown(html.replace('href="#second"','href="javascript:bad"'),edition),/Unsafe/);
assert.throws(()=>markdownLink(edition),/Missing/);
// A future title must get a complete edition without per-book download markup.
const future='<main id="main-content">'+Array.from({length:25},(_,i)=>`<section class="chapter"><h2>Chapter ${i+1}</h2><p>Known result ${i+1}.</p></section>`).join('')+'</main>';
assert.equal(readerMarkdown(future,edition).index.sections.length,25);
const root=await mkdtemp(join(tmpdir(),'handbook-markdown-'));
try{
 edition.markdown=await writeMarkdownEdition(root,edition,html);
 const file=await readFile(join(root,edition.markdown.publicUrl),'utf8');assert.equal(file,markdown);
 const variants=[{publicUrl:'/book.pdf',downloadFilename:'book.pdf',theme:'light',displayName:'Daytime version',pages:25,bytes:1000}];
 const links=downloadLinks(edition,variants);validateDownloads(links,edition,variants);
 assert.ok(links.indexOf('Markdown edition')<links.indexOf('Daytime version'));
 assert.match(links,/Plain text for tools and reuse/);
 assert.match(links,/25 pages, 1 KB/);
 const reader='<a href="book.pdf" download>PDF</a><main><a href="book.pdf" download>PDF</a></main>';
 assert.equal((installReaderDownloads(reader,edition,variants).match(/data-markdown-download/g)||[]).length,3);
 assert.throws(()=>validateDownloads(links.replace('data-markdown-download','removed'),edition,variants),/Missing Markdown/);
 assert.throws(()=>markdownLink({...edition,markdown:{...edition.markdown,version:'4.0.0'}}),/wrong/);
}finally{await rm(root,{recursive:true,force:true});}
console.log('Markdown content, code whitespace, prompts, lists, tables, links, diagrams, edition safety, required placement, and 25-chapter future edition passed.');

// Publication is determined by the catalog, separately from artifact approval.
assert.match(readerMarkdown(html,{...edition,approvalStatus:'approved',publicationStatus:'published'}).markdown,/publication_status: "published"/);
assert.match(readerMarkdown(html,{...edition,approvalStatus:'approved'}).markdown,/publication_status: "candidate"/);
const worksheet='<main id="main-content"><section class="chapter"><h2>Worksheet</h2><table><caption>Extension brief</caption><tr><th>Field</th></tr><tr><td>Chosen robot</td></tr><tr><td>Accessories</td></tr></table></section></main>';
const single=readerMarkdown(worksheet,edition).markdown;
assert.ok(single.includes('| Field |\n| --- |\n| Chosen robot |\n| Accessories |'));
