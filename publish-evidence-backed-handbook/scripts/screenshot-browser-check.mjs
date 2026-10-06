/** Headless synthetic crop regression; never a product capture or approval. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {resolve, relative, extname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {values}=parseArgs({options:{root:{type:'string'},browser:{type:'string'},'playwright-module':{type:'string'},output:{type:'string'}},strict:true});
for(const key of ['root','browser','playwright-module','output'])if(!values[key])throw Error('Missing --'+key);
const root=resolve(values.root),out=resolve(values.output);
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/crop-book/'))throw Error('Unknown fixture route');
  const path=resolve(root,pathname.slice('/crop-book/'.length)||'index.html');
  if(relative(root,path).startsWith('..'))throw Error('Unsafe fixture path');
  const content=await readFile(path);
  res.writeHead(200,{'content-type':({'.html':'text/html','.png':'image/png','.jpg':'image/jpeg'})[extname(path)]??'application/octet-stream'});res.end(content);
 }catch(error){res.writeHead(404);res.end('Missing fixture asset');}
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
const base=`http://127.0.0.1:${server.address().port}`;
const {chromium}=await import(pathToFileURL(resolve(values['playwright-module'],'index.mjs')));
let browser;
try{
 browser=await chromium.launch({executablePath:resolve(values.browser),headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
 const context=await browser.newContext({viewport:{width:500,height:500},deviceScaleFactor:1});
 const page=await context.newPage();
 await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
 await page.goto(base+'/crop-book/',{waitUntil:'load'});
 await page.locator('.reader-screenshot-crop img').evaluate(image=>image.decode());
 const viewport=page.locator('.reader-screenshot-crop');
 const metrics=async()=>page.locator('.reader-screenshot-crop img').evaluate(image=>{const s=getComputedStyle(image);return {image:JSON.parse(JSON.stringify(image.getBoundingClientRect())),viewport:JSON.parse(JSON.stringify(image.parentElement.getBoundingClientRect())),width:s.width,height:s.height,left:s.left,top:s.top,maxWidth:s.maxWidth,maxHeight:s.maxHeight,margin:s.margin};});
 const layout={reader:await metrics()};
 const bounds=await viewport.boundingBox();assert.equal(bounds.width,200);assert.equal(bounds.height,150);
 await viewport.screenshot({path:resolve(out,'reader.png')});
 const larger=await page.locator('#figure-region .reader-screenshot-larger').getAttribute('href');assert.match(larger,/region-panel-1\.html$/);
 await page.emulateMedia({media:'print'});
 layout.print=await metrics();
 await viewport.screenshot({path:resolve(out,'print.png')});
 await page.emulateMedia({media:'screen'});
 await page.goto(base+larger,{waitUntil:'load'});
 await page.locator('.reader-screenshot-crop img').evaluate(image=>image.decode());
 layout.larger=await metrics();
 await page.locator('.reader-screenshot-crop').screenshot({path:resolve(out,'larger.png')});
 await page.setViewportSize({width:1280,height:1200});
 await page.goto(base+'/crop-book/',{waitUntil:'load'});
 await page.locator('.size-fixture img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
 const sizeMetrics=async()=>page.locator('.size-fixture .reader-screenshot-image').evaluateAll(anchors=>anchors.map(anchor=>{const image=anchor.querySelector('img'),box=image.getBoundingClientRect(),parent=anchor.closest('section').getBoundingClientRect();return {nativeWidth:image.naturalWidth,width:box.width,height:box.height,parentWidth:parent.width,left:box.left,right:box.right,maximum:getComputedStyle(anchor).maxWidth};}));
 layout.nativeWide=await sizeMetrics();
 assert.equal(layout.nativeWide[0].nativeWidth,147);assert.equal(layout.nativeWide[0].width,147);assert.equal(layout.nativeWide[0].height,50);assert.equal(layout.nativeWide[0].maximum,'147px');
 assert.equal(layout.nativeWide[0].parentWidth,760);assert.equal(layout.nativeWide[0].left,(760-147)/2);
 assert.equal(layout.nativeWide[1].nativeWidth,1024);assert.equal(layout.nativeWide[1].width,760);
 await page.setViewportSize({width:120,height:1200});
 layout.nativeNarrow=await sizeMetrics();
 for(const image of layout.nativeNarrow){assert.equal(image.width,120);assert.equal(image.parentWidth,120);assert(image.right<=120);}
 assert(Math.abs(layout.nativeNarrow[0].height-50*120/147)<.02);
 await page.setViewportSize({width:500,height:500});
 const frameMetrics=async()=>page.locator('#figure-region,#legacy-frame').evaluateAll(figures=>figures.map(figure=>{const css=getComputedStyle(figure);return {id:figure.id,background:css.backgroundColor,color:css.color,padding:css.padding};}));
 const checkFrames=frames=>{assert.deepEqual(frames[0],{id:'figure-region',background:'rgba(0, 0, 0, 0)',color:'rgb(238, 236, 230)',padding:'0px'});assert.deepEqual(frames[1],{id:'legacy-frame',background:'rgb(228, 225, 217)',color:'rgb(23, 23, 22)',padding:'16px'});};
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 layout.explicitDark=await frameMetrics();checkFrames(layout.explicitDark);
 await viewport.screenshot({path:resolve(out,'explicit-dark.png')});
 await page.evaluate(()=>delete document.documentElement.dataset.theme);
 await page.emulateMedia({colorScheme:'dark'});
 layout.systemDark=await frameMetrics();checkFrames(layout.systemDark);
 await viewport.screenshot({path:resolve(out,'system-dark.png')});
 const result={status:'passed',browser:await browser.version(),checks:['reader crop viewport','larger view uses same crop','print viewport preserves crop','147px panel stays native at wide viewport','all panels shrink to narrow viewport','screenshots inherit Dark foreground without generic frame','System Dark keeps legacy frame and screenshot colors'],layout,limitations:'Synthetic RGB source. Pixel equality is verified by the calling Python regression.'};
 await writeFile(resolve(out,'browser-check.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
