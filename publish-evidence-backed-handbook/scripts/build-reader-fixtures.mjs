// Synthetic regression geometry only. These images are not handbook artwork.
import {mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {digest} from './reader-paths.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';
import {addSiteTheme,validateSiteTheme} from './site-theme.mjs';
import {renderDiagram} from './diagrams.mjs';
function crc(bytes) {let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(name,bytes){const kind=Buffer.from(name),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(bytes.length);check.writeUInt32BE(crc(Buffer.concat([kind,bytes])));return Buffer.concat([length,kind,bytes,check]);}
function png(width,height,dark){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const stride=1+width*4,pixels=Buffer.alloc(stride*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*stride+1+x*4;const central=x>width*.2&&x<width*.8&&y>height*.2&&y<height*.8;const value=dark?238:45;pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=dark?(central?255:0):255;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
const output=process.argv[2];if(!output) throw Error('Usage: node build-reader-fixtures.mjs <isolated-output-directory>');
const root=resolve(output),assets=fileURLToPath(new URL('../assets/reader/',import.meta.url));await mkdir(root,{recursive:true});
for(const name of ['reader.css','theme.css','theme.js','reader.js']) await cp(resolve(assets,name),resolve(root,name));
const definitions=[{title:'Feedback loop',kind:'sequence',nodes:[{id:'1',label:'Decide'},{id:'2',label:'Test'},{id:'3',label:'Learn'}],edges:[{from:'1',to:'2'},{from:'2',to:'3'},{from:'3',to:'1',feedback:true}],note:'New evidence restarts the loop.'},{title:'Evidence branches',kind:'branch',nodes:[{id:'source',label:'Evidence'},{id:'a',label:'Calibration',detail:'Align raters'},{id:'b',label:'Held-out test',detail:'Estimate performance'}],edges:[{from:'source',to:'a'},{from:'source',to:'b'}]}];
for(const scenario of [{id:'existing-title-next-edition',version:'2.0.0',count:3},{id:'future-handbook',version:'1.0.0',count:25}]){
 const source=resolve(root,'inputs',scenario.id),pairs=[],files={};let figures='';
 for(let i=1;i<=scenario.count;i++){
  const dims=i===1?[2048,1024]:i===2?[512,1536]:[1024,1024],number=String(i).padStart(2,'0'),light=`reader/assets/chapter-${number}.png`,dark=`assets/chapter-art/dark/chapter-${number}.png`,lightBytes=png(...dims,false),darkBytes=png(...dims,true);
  for(const [path,bytes] of [[light,lightBytes],[dark,darkBytes]]){await mkdir(dirname(resolve(source,path)),{recursive:true});await writeFile(resolve(source,path),bytes);}
  files[light]=digest(lightBytes);pairs.push({light,dark,lightSha256:files[light],darkSha256:digest(darkBytes),darkDimensions:dims,outerBackground:'transparent',prompt:'Synthetic responsive-sizing regression geometry',acquisitionMode:'generated',generator:'test-fixture',styleReferenceSha256:'a'.repeat(64),reviewStatus:'accepted'});
  figures+=`<h2>Chapter ${i}</h2><figure class="unfamiliar-opener" data-artwork-role="chapter"><img src="assets/chapter-${number}.png" alt="Synthetic test geometry" loading="lazy"></figure>`;
 }
 await writeFile(resolve(source,'artwork-pairs.json'),JSON.stringify({schemaVersion:1,book:scenario.id,artwork:pairs}));
 const reader=resolve(root,scenario.id);await mkdir(reader,{recursive:true});await cp(resolve(source,'reader/assets'),resolve(reader,'assets'),{recursive:true});
 let html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><link rel="stylesheet" href="/reader.css"></head><body><header class="mobile-bar"><div class="mobile-actions"></div></header><div class="book-shell"><aside class="sidebar"><div class="sidebar-meta"></div></aside><main id="main-content"><h1>${scenario.id} ${scenario.version}</h1>${definitions.map(d=>'<figure data-diagram-rendered="true">'+renderDiagram(d)+'</figure>').join('')}${figures}</main></div></body></html>`;
 html=await installArtworkPairs(source,scenario,root,html,{readerDirectory:'reader',files});html=addSiteTheme(html);validateSiteTheme(html);await writeFile(resolve(reader,'index.html'),html);
}
console.log('Built next-edition and 25-chapter future-reader fixtures from skill-owned runtime and assets.');
