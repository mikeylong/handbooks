// Synthetic regression geometry only. These images are not handbook artwork.
import {mkdir,writeFile,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {digest} from './reader-paths.mjs';
import {installArtworkPairs} from './artwork-pairs.mjs';
import {addSiteTheme,validateSiteTheme} from './site-theme.mjs';
import {renderDiagram} from './diagrams.mjs';
import {installReaderDownloads} from './pdf-downloads.mjs';
function crc(bytes) {let value=0xffffffff;for(const byte of bytes){value^=byte;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(name,bytes){const kind=Buffer.from(name),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(bytes.length);check.writeUInt32BE(crc(Buffer.concat([kind,bytes])));return Buffer.concat([length,kind,bytes,check]);}
function png(width,height,dark){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const stride=1+width*4,pixels=Buffer.alloc(stride*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*stride+1+x*4;const central=x>width*.2&&x<width*.8&&y>height*.2&&y<height*.8;const value=dark?238:45;pixels[i]=pixels[i+1]=pixels[i+2]=value;pixels[i+3]=dark?(central?255:0):255;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);}
const output=process.argv[2];if(!output) throw Error('Usage: node build-reader-fixtures.mjs <isolated-output-directory>');
const root=resolve(output),assets=fileURLToPath(new URL('../assets/reader/',import.meta.url));await mkdir(root,{recursive:true});
await mkdir(resolve(root,'assets/fonts'),{recursive:true});
for(const name of ['source-serif-4-latin-variable.woff2','source-serif-4-latin-variable-italic.woff2']) await cp(fileURLToPath(new URL('../assets/design-system/fonts/'+name,import.meta.url)),resolve(root,'assets/fonts',name));
for(const name of ['reader.css','theme.css','theme.js','reader.js','pdf-downloads.css']) await cp(resolve(assets,name),resolve(root,name));
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
 let html=`<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="/pdf-downloads.css"><script src="/reader.js" defer></script></head><body><header class="mobile-bar"><div class="mobile-actions"><button data-open-toc>Contents</button></div></header><div class="book-shell"><aside class="sidebar"><div class="sidebar-meta"><a href="fixture.pdf" download>PDF</a></div></aside><main id="main-content"><section class="cover"><h1>${scenario.id} ${scenario.version}</h1><nav class="cover-actions"><a class="action-link" href="#contents">Explore the handbook</a><a href="fixture.pdf" download>PDF</a></nav></section><section id="contents"><h2>Contents</h2></section>${definitions.map(d=>'<figure data-diagram-rendered="true">'+renderDiagram(d)+'</figure>').join('')}<section id="table-alignment-fixture"><h2>Repeated learning loop</h2><div class="table-scroll"><table><tr><td><table><tr><td><p>1</p></td></tr></table></td><td><p>Read the example.</p></td></tr><tr><td><table><tr><td><p>2</p></td></tr></table></td><td><p>Complete a worksheet with enough explanatory text to wrap onto several lines on a narrow screen.</p></td></tr></table></div><div class="table-scroll"><table><tr><td><table data-nested-data><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table></td></tr></table></div></section>${figures}</main></div><dialog class="toc-dialog" id="toc-dialog"><div class="dialog-header"><h2>Contents</h2><button class="dialog-close" data-close-toc>Close</button></div><nav><a href="#contents">Contents</a></nav><div class="dialog-footer"><a href="fixture.pdf" download>PDF</a></div></dialog></body></html>`;
 html=await installArtworkPairs(source,scenario,root,html,{readerDirectory:'reader',files});const edition={id:scenario.id,title:scenario.id,version:scenario.version,date:'2026-10-23',markdown:{version:scenario.version,publicUrl:`/${scenario.id}/editions/v${scenario.version}/${scenario.id}-v${scenario.version}.md`,downloadFilename:`${scenario.id}-v${scenario.version}.md`,bytes:128,sha256:'a'.repeat(64)}};
 const variants=['light','dark'].map(theme=>({theme,displayName:theme==='light'?'Daytime version':'Late night version',publicUrl:`/${scenario.id}/editions/v${scenario.version}/${scenario.id}-${theme}.pdf`,downloadFilename:`${scenario.id}-${theme}.pdf`,pages:25,bytes:128}));
 // Download targets are synthetic layout fixtures, never release artifacts.
 html=installReaderDownloads(html,edition,variants);html=addSiteTheme(html);validateSiteTheme(html);await writeFile(resolve(reader,'index.html'),html);
}
console.log('Built next-edition and 25-chapter future-reader fixtures from skill-owned runtime and assets.');
