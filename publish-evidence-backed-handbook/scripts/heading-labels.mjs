/** Mandatory current-edition heading policy. Historical packages are immutable. */
import {parseReaderHtml} from './markdown-downloads.mjs';
const prefix=/^\s*\d+(?:\.\d+)+(?:[.)])?\s+/u;
const text=n=>n.tag==='#text'?n.text:(n.children??[]).map(text).join('');
export function validateHtmlHeadingLabels(html){
 const headings=[];const visit=n=>{if(/^h[1-6]$/.test(n.tag))headings.push(text(n).replace(/\s+/g,' ').trim());for(const c of n.children??[])visit(c);};visit(parseReaderHtml(html));
 if(!headings.length)throw Error('Heading policy: reader has no headings');
 const bad=headings.filter(h=>prefix.test(h));if(bad.length)throw Error('Visible decimal subsection headings: '+bad.join('; '));
 return headings;
}
export function validateMarkdownHeadingLabels(markdown){
 let fence=null;const headings=[];
 for(const line of markdown.split('\n')){
  const f=line.match(/^\s*(`{3,}|~{3,})/);if(f){if(!fence)fence=f[1];else if(f[1][0]===fence[0]&&f[1].length>=fence.length)fence=null;continue;}
  if(fence)continue;const m=line.match(/^#{1,6}\s+(.+)$/);if(m)headings.push(m[1]);
 }
 if(!headings.length)throw Error('Heading policy: Markdown has no headings');
 const bad=headings.filter(h=>prefix.test(h));if(bad.length)throw Error('Visible decimal Markdown headings: '+bad.join('; '));
 return headings;
}
