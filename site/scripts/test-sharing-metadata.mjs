import assert from 'node:assert/strict';
import {readFile, mkdtemp, cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {toolkitModule} from './handbook-toolkit.mjs';
const {addSharingMetadata,validateSharingMetadata,readerSharingIdentity,installSharingAssets}=await toolkitModule('sharing-metadata.mjs');
const root=new URL('../',import.meta.url).pathname,output=process.env.HANDBOOK_SITE_OUTPUT||resolve(root,'output/site');
const brand=JSON.parse(await readFile(resolve(root,'sharing-brand.json'),'utf8'));
const manifest=JSON.parse(await readFile(resolve(root,'site/assets/sharing/manifest.json'),'utf8'));
const catalog=JSON.parse(await readFile(resolve(root,'../catalog.json'),'utf8'));
const gallery={id:'collection',path:'index.html',url:brand.origin+'/',title:brand.collectionTitle+' · '+brand.author,coverTitle:brand.collectionTitle,description:brand.collectionDescription};
const pages=[gallery];
for(const book of catalog.books.filter(b=>b.status==='published')){
 const identity=readerSharingIdentity(await readFile(resolve(output,book.id,'index.html'),'utf8'));
 pages.push({id:book.id,path:book.id+'/index.html',url:brand.origin+'/'+book.id+'/',title:identity.title,coverTitle:identity.title,description:identity.description});
 pages.push({id:book.id,path:book.id+'/editions/v'+book.version+'/index.html',url:book.editionUrl,title:identity.title+' · Version '+book.version,coverTitle:identity.title,description:identity.description});
}
for(const page of pages){
 const html=await readFile(resolve(output,page.path),'utf8');const card=manifest.cards[page.id];
 assert.equal(validateSharingMetadata(html,page,brand,card).status,'passed');
 assert.equal(addSharingMetadata(html,page,brand,card),html,'Metadata installation is idempotent');
 for(const [name,broken] of [
  ['missing image',html.replace(/<meta property="og:image"[^>]*>/,'')],
  ['relative image',html.replace(/(<meta property="og:image" content=")[^"]+/, '$1/assets/sharing/wrong.png')],
  ['wrong image dimensions',html.replace('property="og:image:width" content="1200"','property="og:image:width" content="600"')],
  ['stale title',html.replace(/(<meta property="og:title" content=")[^"]+/, '$1Stale title')],
  ['wrong canonical identity',html.replace(/(<meta property="og:url" content=")[^"]+/, '$1https://example.invalid/')],
  ['missing icon',html.replace(/<link rel="icon" type="image\/svg\+xml"[^>]*>/,'')],
 ]){assert.notEqual(broken,html);assert.throws(()=>validateSharingMetadata(broken,page,brand,card),undefined,name);}
}
// Title punctuation and non-ASCII text must survive the shared head renderer.
const future={...gallery,title:'Future handbook: A & B “choices”',description:'Use <limits> & evidence.'};const futureHtml=addSharingMetadata('<html><head><title>Future</title></head><body>Preserved content.</body></html>',future,brand,manifest.cards.collection);
validateSharingMetadata(futureHtml,future,brand,manifest.cards.collection);assert(futureHtml.includes('<body>Preserved content.</body>'));
const temp=await mkdtemp(resolve(tmpdir(),'handbook-sharing-'));
try{
 const assets=resolve(temp,'assets'),site=resolve(temp,'site');await cp(resolve(root,'site/assets/sharing'),assets,{recursive:true});await mkdir(site,{recursive:true});
 const card=manifest.cards.collection;await mkdir(resolve(site,card.artwork.path,'..'),{recursive:true});await cp(resolve(output,card.artwork.path),resolve(site,card.artwork.path));
 await writeFile(resolve(site,'index.html'),'<html><head></head><body>Preserved content.</body></html>');
 await assert.rejects(()=>installSharingAssets({output:site,assetRoot:assets,brand,pages:[{...gallery,id:'future-book'}]}),/Missing or stale/);
 await assert.rejects(()=>installSharingAssets({output:site,assetRoot:assets,brand,pages:[{...gallery,coverTitle:'Changed cover'}]}),/Missing or stale/);
 const changedImage=Buffer.from(await readFile(resolve(assets,'collection.png')));changedImage[changedImage.length-10]^=1;await writeFile(resolve(assets,'collection.png'),changedImage);
 await assert.rejects(()=>installSharingAssets({output:site,assetRoot:assets,brand,pages:[gallery]}),/hash mismatch/);
 await writeFile(resolve(assets,'collection.png'),'corrupted image');
 await assert.rejects(()=>installSharingAssets({output:site,assetRoot:assets,brand,pages:[gallery]}),/Invalid sharing PNG|bounds|buffer|offset/i);
}finally{await rm(temp,{recursive:true,force:true});}
const retained=JSON.parse(await readFile(resolve(root,'retained-releases.json'),'utf8'));
for(const route of retained.routes.filter(r=>r.url.endsWith('.html'))){assert.deepEqual(await readFile(resolve(root,'..',route.source)),await readFile(resolve(output,route.url.slice(1))),'Retained historical HTML remains byte-identical');}
console.log(`PASS sharing metadata and favicon coverage for ${pages.length} current pages, stale/missing metadata guards, future-title text, and unchanged retained HTML`);
