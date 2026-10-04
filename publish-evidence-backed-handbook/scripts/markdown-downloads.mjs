/** Portable Markdown editions derived from the exact assembled reader body. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {digest,safePath} from './reader-paths.mjs';
const entities=JSON.parse(await readFile(new URL('../assets/html-entities.json',import.meta.url),'utf8'));
const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi,(_,key)=>{
 if(key[0]==='#'){const n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));if(n<1||n>0x10ffff)throw Error('Invalid character reference');return String.fromCodePoint(n);}
 if(!(key+';' in entities))throw Error('Unknown HTML entity: '+key);return entities[key+';'];
});
const has=(n,c)=>(n.attrs?.class??'').split(/\s+/).includes(c);
const voids=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
function parse(html){
 const root={tag:'root',attrs:{},children:[]},stack=[root];
 const tokens=html.match(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<\/?[a-z][a-z\d]*\b(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+|</gi)??[];
 for(const token of tokens){
  if(/^<(?:script|style|!--)/i.test(token))continue;
  if(/^<\//.test(token)){const tag=token.match(/^<\/([\w]+)/)?.[1].toLowerCase();const at=stack.findLastIndex(n=>n.tag===tag);if(at>0)stack.length=at;continue;}
  if(/^<[a-z]/i.test(token)){
   const tag=token.match(/^<([\w]+)/)[1].toLowerCase(),attrs={};
   for(const m of token.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
   const node={tag,attrs,children:[]};stack.at(-1).children.push(node);if(!voids.has(tag)&&!token.endsWith('/>'))stack.push(node);
  }else stack.at(-1).children.push({tag:'#text',text:decode(token)});
 }
 return root;
}
function walk(n,fn){fn(n);for(const c of n.children??[])walk(c,fn);}
function plain(n){if(n.tag==='#text')return n.text;if(n.tag==='br')return '\n';return (n.children??[]).map(plain).join('')+(['p','li','tspan'].includes(n.tag)?'\n':'');}
function descendants(n,tag){const found=[];walk(n,x=>{if(x.tag===tag)found.push(x);});return found;}
const backslash=String.fromCharCode(92);
const esc=s=>s.replaceAll(backslash,backslash.repeat(2)).replace(/([`*_\[\]])/g,backslash+'$1');
function fenced(text,lang='text'){const fence='`'.repeat(Math.max(3,...[...text.matchAll(/`+/g)].map(m=>m[0].length+1)));return `\n\n${fence}${lang}\n${text.replace(/\n$/,'')}\n${fence}\n\n`;}
function headingText(n){function value(x){if(x.tag==='#text')return x.text;if(x.attrs?.['aria-hidden']==='true')return '';const t=(x.children??[]).map(value).join('');return x.tag==='span'?' '+t+' ':t;}return value(n).replace(/\s+/g,' ').trim();}
const slug=s=>s.toLowerCase().replace(/[^\w\- ]/g,'').replace(/ /g,'-');
export function readerMarkdown(html,edition){
 if(!/^[a-z0-9-]+$/.test(edition.id)||!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(edition.version)||!edition.title||!/^\d{4}-\d{2}-\d{2}$/.test(edition.date))throw Error('Invalid Markdown edition identity');
 const tree=parse(html),main=descendants(tree,'main').find(n=>n.attrs.id==='main-content');
 if(!main)throw Error('Markdown edition requires the actual reader body');
 const body=(main.children??[]).filter(n=>n.tag!=='#text'&&!has(n,'cover')&&!has(n,'contents-page')&&!has(n,'pdf-end-downloads')&&n.tag!=='nav');
 if(!body.some(n=>has(n,'chapter')))throw Error('Markdown edition has no chapters');
 const sections=[],anchors=new Map(),seen=new Map();
 for(const top of body)walk(top,n=>{
  if(/^h[2-6]$/.test(n.tag)){
   const title=headingText(n),base=slug(title),number=seen.get(base)??0;seen.set(base,number+1);
   n.markdownAnchor=base+(number?'-'+number:'');sections.push({title,anchor:n.markdownAnchor,level:Number(n.tag[1])});
  }
 });
 for(const top of body)walk(top,n=>{if(n.attrs?.id){let target;n.markdownAnchor?target=n:walk(n,c=>{if(!target&&c.markdownAnchor)target=c;});if(target)anchors.set(n.attrs.id,target.markdownAnchor);}});
 const url=value=>{
  if(value.startsWith('#')&&anchors.has(value.slice(1)))return '#'+anchors.get(value.slice(1));
  const resolved=new URL(value,`https://handbooks.surfaces.systems/${edition.id}/`);
  if(!['https:','http:','mailto:'].includes(resolved.protocol))throw Error('Unsafe Markdown link');return resolved.href;
 };
 let prompts=0;const codeBlocks=[];
 function codeBlock(text,language='text'){const key=`@@MARKDOWN-CODE-${codeBlocks.length}@@`;codeBlocks.push(fenced(text,language));return '\n\n'+key+'\n\n';}
 function render(n){
  if(n.tag==='#text')return esc(n.text.replace(/\s+/g,' '));
  if(n.attrs?.['aria-hidden']==='true'||['script','style','nav','source','button','input','defs'].includes(n.tag)||has(n,'diagram-print'))return '';
  const inner=()=>n.children.map(render).join('');
  if(has(n,'reader-prompt')){
   const titleNode=descendants(n,'span').find(x=>has(x,'reader-prompt-title'));
   const content=descendants(n,'div').find(x=>has(x,'reader-prompt-body'));
   if(!titleNode||!content)throw Error('Incomplete prompt in reader');
   const paragraphs=descendants(content,'p');prompts++;
   return '\n\n#### Prompt: '+esc(plain(titleNode).trim())+codeBlock((paragraphs.length?paragraphs.map(p=>plain(p).trim()).join('\n'):plain(content).trim()));
  }
  if(/^h[1-6]$/.test(n.tag))return '\n\n'+'#'.repeat(Math.max(2,Number(n.tag[1])))+' '+esc(headingText(n))+'\n\n';
  if(n.tag==='pre'){const code=descendants(n,'code')[0];return codeBlock(plain(n),(code?.attrs.class??'').match(/language-([\w-]+)/)?.[1]??'text');}
  if(n.tag==='code'){const t=plain(n).trim(),f='`'.repeat(Math.max(1,...[...t.matchAll(/`+/g)].map(m=>m[0].length+1)));return f+(t.startsWith('`')?' ':'')+t+(t.endsWith('`')?' ':'')+f;}
  if(['strong','b'].includes(n.tag))return '**'+inner().trim()+'**';
  if(['em','i'].includes(n.tag))return '*'+inner().trim()+'*';
  if(n.tag==='a'){const label=inner().trim(),href=n.attrs.href;return href?'['+label+']('+url(href).replaceAll('(','\\(').replaceAll(')','\\)')+')':label;}
  if(n.tag==='span')return ' '+inner().trim()+' ';
  if(n.tag==='br')return '\n';
  if(n.tag==='img')return n.attrs.alt?.trim()?'\n\nImage description: '+esc(n.attrs.alt)+'\n\n':'';
  if(n.tag==='svg')return '\n\nDiagram: '+['title','desc','text'].flatMap(tag=>descendants(n,tag).map(x=>esc(plain(x).trim()))).join('\n\n')+'\n\n';
  if(['ul','ol'].includes(n.tag)){
   let number=Number(n.attrs.start)||1;
   return '\n\n'+n.children.filter(x=>x.tag==='li').map(li=>{const s=render(li).trim();const prefix=n.tag==='ol'?number+++'. ':'- ';return prefix+s.replace(/\n/g,'\n'+' '.repeat(Math.max(4,prefix.length)));}).join('\n')+'\n\n';
  }
  if(n.tag==='table'){
   const rows=[];
   function collect(x){for(const c of x.children??[])if(c.tag==='tr')rows.push(c);else if(c.tag!=='table')collect(c);}
   collect(n);if(!rows.length)return '';
   const cells=rows.map(row=>row.children.filter(c=>['th','td'].includes(c.tag)));
   const caption=n.children.filter(c=>c.tag==='caption').map(render).join('');
   if(cells.every(row=>row.length===1))return caption+cells.map(row=>render(row[0])).join('\n\n');
   const width=Math.max(...cells.map(row=>row.length));
   const data=cells.map(row=>Array.from({length:width},(_,i)=>(row[i]?render(row[i]).trim():'').replace(/\n+/g,'<br>').replace(/\|/g,'\\|')));
   const header=cells[0].some(c=>c.tag==='th')?data.shift():Array(width).fill('');
   return caption+'\n\n'+[header,Array(width).fill('---'),...data].map(row=>'| '+row.join(' | ')+' |').join('\n')+'\n\n';
  }
  if(n.tag==='blockquote')return '\n\n'+inner().trim().replace(/^/gm,'> ')+'\n\n';
  if(n.tag==='hr')return '\n\n---\n\n';
  if(['p','div','section','article','aside','figure','figcaption','details','summary','dt','dd','dl','footer','header','caption'].includes(n.tag))return '\n\n'+inner().trim()+'\n\n';
  return inner();
 }
 let content=body.map(render).join('').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 content=content.replace(/@@MARKDOWN-CODE-(\d+)@@/g,(_,n)=>codeBlocks[Number(n)].trim());
 const metadata={title:edition.title,version:edition.version,date:edition.date,format:'machine-readable-markdown-v1',publication_status:edition.approvalStatus??'published',canonical_url:`https://handbooks.surfaces.systems/${edition.id}/`,source_reader_sha256:digest(html),...(edition.approvedReaderSha256?{approved_reader_sha256:edition.approvedReaderSha256}:{})};
 const markdown='---\n'+Object.entries(metadata).map(([k,v])=>k+': '+JSON.stringify(v)).join('\n')+'\n---\n\n# '+esc(edition.title)+'\n\n'+content+'\n';
 return {markdown,index:{schemaVersion:1,book:edition.id,version:edition.version,sourceReaderSha256:digest(html),sha256:digest(markdown),sections,prompts}};
}
export async function writeMarkdownEdition(output,edition,html){
 const {markdown,index}=readerMarkdown(html,edition),downloadFilename=`${edition.id}-v${edition.version}.md`,publicUrl=`/${edition.id}/editions/v${edition.version}/${downloadFilename}`;
 const file=safePath(output,publicUrl.slice(1));await mkdir(dirname(file),{recursive:true});await writeFile(file,markdown);
 await writeFile(file.slice(0,-3)+'.index.json',JSON.stringify(index,null,2)+'\n');
 return {format:'markdown',displayName:'Markdown edition',downloadFilename,publicUrl,sha256:digest(markdown),bytes:Buffer.byteLength(markdown),version:edition.version};
}
export function markdownLink(edition){
 const m=edition.markdown;
 if(!m||m.version!==edition.version||m.downloadFilename!==`${edition.id}-v${edition.version}.md`||m.publicUrl!==`/${edition.id}/editions/v${edition.version}/${m.downloadFilename}`||! /^[a-f0-9]{64}$/.test(m.sha256))throw Error('Missing or wrong Markdown edition');
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 return `<a class="pdf-download-link markdown-download-link" href="${m.publicUrl}" download="${m.downloadFilename}" data-markdown-download aria-label="Download ${escape(edition.title)}, Markdown edition, content edition ${escape(edition.version)}">Markdown edition</a>`;
}
