// Shared collection/reader metadata. Asset generation is an explicit, frozen-input step.
import {cp, mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const decode=value=>value.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[n]));
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([,key,a,b])=>[key.toLowerCase(),decode(a??b)]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readerSharingIdentity(html){
 const cover=html.match(/<section\b[^>]*class="cover"[^>]*>([\s\S]*?)<section\b/)?.[1];
 const field=pattern=>decode(cover?.match(pattern)?.[1]?.replace(/<[^>]*>/g,'').trim()??'');
 const title=field(/<h1\b[^>]*>([\s\S]*?)<\/h1>/),description=field(/<p\b[^>]*class="cover-subtitle"[^>]*>([\s\S]*?)<\/p>/);
 if(!title||!description)throw Error('Sharing metadata needs the current reader cover title and subtitle');
 return {title,description};
}
export function addSharingMetadata(html,page,brand,card){
 if(!page.title||!page.description||!page.url.startsWith(brand.origin+'/'))throw Error('Invalid sharing page identity');
 let [head,...rest]=html.split('</head>');if(!rest.length)throw Error('Sharing metadata requires a document head');
 head=head.replace(/<meta\b[^>]*>/gi,tag=>{const a=attrs(tag);return /^(?:og:|twitter:)/i.test(a.property??a.name??'')||a.name==='description'?'':tag;});
 head=head.replace(/<link\b[^>]*>/gi,tag=>{const a=attrs(tag);return (a.rel??'').split(/\s+/).some(r=>r==='icon'||r==='apple-touch-icon')?'':tag;});
 const image=brand.origin+'/assets/sharing/'+card.file;
 const meta=(key,value)=>`<meta ${key.startsWith('og:')?'property':'name'}="${key}" content="${escape(value)}">`;
 const tags=[
  '<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
  '<link rel="icon" type="image/png" href="/assets/brand/favicon-16.png" sizes="16x16">',
  '<link rel="icon" type="image/png" href="/assets/brand/favicon-32.png" sizes="32x32">',
  '<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg" sizes="any">',
  '<link rel="apple-touch-icon" href="/assets/brand/favicon-180.png" sizes="180x180">',
  meta('description',page.description),meta('og:site_name',brand.siteName),meta('og:type','website'),
  meta('og:title',page.title),meta('og:description',page.description),meta('og:url',page.url),
  meta('og:image',image),meta('og:image:secure_url',image),meta('og:image:type','image/png'),
  meta('og:image:width',card.width),meta('og:image:height',card.height),meta('og:image:alt',card.alt),
  meta('twitter:card','summary_large_image'),meta('twitter:title',page.title),
  meta('twitter:description',page.description),meta('twitter:image',image),meta('twitter:image:alt',card.alt),
 ];
 const block='<!-- handbook-sharing:start -->\n'+tags.join('\n')+'\n<!-- handbook-sharing:end -->';
 if(html.includes('<!-- handbook-sharing:start -->'))return html.replace(/<!-- handbook-sharing:start -->[\s\S]*?<!-- handbook-sharing:end -->/,block);
 return head+block+'\n</head>'+rest.join('</head>');
}
export function validateSharingMetadata(html,page,brand,card){
 const head=html.split('</head>')[0];const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag])=>attrs(tag));
 const get=key=>{const values=metas.filter(m=>(m.property??m.name)===key);if(values.length!==1)throw Error('Missing or duplicate sharing metadata: '+key);return values[0].content;};
 const image=brand.origin+'/assets/sharing/'+card.file;
 for(const [key,value] of Object.entries({'description':page.description,'og:title':page.title,'og:description':page.description,'og:url':page.url,'og:site_name':brand.siteName,'og:image':image,'og:image:width':'1200','og:image:height':'630','og:image:type':'image/png','og:image:alt':card.alt,'twitter:card':'summary_large_image','twitter:image':image,'twitter:image:alt':card.alt,'twitter:title':page.title,'twitter:description':page.description}))if(get(key)!==value)throw Error('Stale or wrong sharing metadata: '+key);
 const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(([tag])=>attrs(tag));
 for(const [rel,href,sizes] of [['icon','/favicon.ico','16x16 32x32 48x48'],['icon','/assets/brand/favicon-16.png','16x16'],['icon','/assets/brand/favicon-32.png','32x32'],['icon','/assets/brand/favicon.svg','any'],['apple-touch-icon','/assets/brand/favicon-180.png','180x180']])if(links.filter(a=>a.rel===rel&&a.href===href&&a.sizes===sizes).length!==1)throw Error('Missing sharing favicon: '+href);
 if(links.some(a=>a.rel==='icon'&&!['/favicon.ico','/assets/brand/favicon-16.png','/assets/brand/favicon-32.png','/assets/brand/favicon.svg'].includes(a.href)))throw Error('Legacy favicon remains on current page');
 return {status:'passed',url:page.url,image};
}
export async function installSharingAssets({output,assetRoot,brand,pages}){
 const manifest=JSON.parse(await readFile(resolve(assetRoot,'manifest.json'),'utf8'));
 const toolkit=fileURLToPath(new URL('../',import.meta.url));
 if(sha(await readFile(resolve(toolkit,'assets/brand/book-mark.json')))!==manifest.markSha256)throw Error('Favicon geometry changed; regenerate sharing assets');
 for(const name of ['SourceSerif4-Bold.ttf','NotoSans-Regular.ttf'])if(sha(await readFile(resolve(toolkit,'assets/design-system/fonts',name)))!==manifest.fonts?.[name])throw Error('Sharing font changed; regenerate assets');
 if(manifest.schemaVersion!==1||JSON.stringify(manifest.brand)!==JSON.stringify(brand))throw Error('Sharing brand changed; regenerate assets with build-sharing-assets.py');
 const copy=async(source,target,hash)=>{const bytes=await readFile(source);if(sha(bytes)!==hash)throw Error('Sharing asset hash mismatch: '+source);await mkdir(dirname(target),{recursive:true});await cp(source,target);};
 for(const [name,record] of Object.entries(manifest.icons)){
  if(!/^favicon(?:-\d+)?\.(?:png|svg|ico)$/.test(name))throw Error('Unsafe favicon name');
  await copy(resolve(assetRoot,'icons',name),resolve(output,'assets/brand',name),record.sha256);
 }
 await copy(resolve(assetRoot,'icons/favicon.ico'),resolve(output,'favicon.ico'),manifest.icons['favicon.ico'].sha256);
 const cardsUsed=new Set();const results=[];
 for(const page of pages){
  const card=manifest.cards[page.id];if(!card||card.file!==page.id+'.png'||card.title!==page.coverTitle||card.description!==page.description)throw Error('Missing or stale sharing card for '+page.id+'; regenerate with build-sharing-assets.py');
  if(card.width!==1200||card.height!==630||!card.alt)throw Error('Sharing card needs dimensions and alt text');
  if(!cardsUsed.has(page.id)){
   const image=await readFile(resolve(assetRoot,card.file));if(image.subarray(1,4).toString()!=='PNG'||image.readUInt32BE(16)!==1200||image.readUInt32BE(20)!==630)throw Error('Invalid sharing PNG dimensions');
   // An edition can reuse its title's card; its title and canonical URL remain edition-specific.
   if(sha(await readFile(resolve(output,card.artwork.path)))!==card.artwork.sha256)throw Error('Sharing chapter artwork changed; regenerate assets');
   await copy(resolve(assetRoot,card.file),resolve(output,'assets/sharing',card.file),card.sha256);cardsUsed.add(page.id);
  }
  const file=resolve(output,page.path);const html=addSharingMetadata(await readFile(file,'utf8'),page,brand,card);
  results.push(validateSharingMetadata(html,page,brand,card));await writeFile(file,html);
 }
 if(cardsUsed.size!==Object.keys(manifest.cards).length)throw Error('Unused sharing card or missing public title');
 return results;
}
