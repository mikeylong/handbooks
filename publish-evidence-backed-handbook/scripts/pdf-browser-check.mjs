/** Reject CTA stretching, clipping, and collisions introduced by download layout. */
export async function checkCoverActionLayout(page) {
 const result=await page.evaluate(()=>{
  const button=document.querySelector('.cover a[href="#contents"]');
  const downloads=button?.parentElement.querySelector('[data-pdf-downloads]');
  if(!button||!downloads)return {failures:['Missing cover actions']};
  const b=button.getBoundingClientRect(),p=button.parentElement.getBoundingClientRect(),d=downloads.getBoundingClientRect(),style=getComputedStyle(button);
  const range=document.createRange();range.selectNodeContents(button);const text=range.getBoundingClientRect();
  const pixels=value=>+value.replace('px','');
  const normalHeight=Math.max(64,2*pixels(style.lineHeight)+pixels(style.paddingTop)+pixels(style.paddingBottom)+pixels(style.borderTopWidth)+pixels(style.borderBottomWidth));
  const failures=[];
  if(b.height<44||b.height>normalHeight+1)failures.push('Explore button has an abnormal height');
  if(b.left<p.left-1||b.right>p.right+1||button.scrollWidth>button.clientWidth+1||text.left<b.left-1||text.right>b.right+1)failures.push('Explore button or label is clipped');
  if(d.top<b.bottom+8)failures.push('Downloads must follow Explore on a separate row');
  if(innerWidth<=640&&Math.abs(b.width-d.width)>1)failures.push('Mobile Explore and download widths differ');
  if(!downloads.querySelector('a')?.hasAttribute('data-markdown-download'))failures.push('Markdown is not first');
  return {width:innerWidth,buttonWidth:b.width,buttonHeight:b.height,downloadWidth:d.width,gap:d.top-b.bottom,failures};
 });
 if(result.failures.length)throw Error('Cover action layout: '+JSON.stringify(result));
 return result;
}

/** Check the same three reader containers in the actual browser DOM. */
export async function checkReaderDownloadPlacements(page) {
 const selectors=['.sidebar [data-pdf-downloads]','main#main-content .cover [data-pdf-downloads]','#toc-dialog .dialog-footer [data-pdf-downloads]'];
 if(await page.locator('[data-pdf-downloads]').count()!==3||await page.locator('.pdf-end-downloads').count())throw Error('Reader must have exactly three download groups and no bottom block');
 const choices=[];
 for(const selector of selectors){
  if(await page.locator(selector).count()!==1)throw Error('Missing or duplicate reader download location: '+selector);
  choices.push(await page.locator(selector+' a[download]').evaluateAll(links=>links.map(a=>[a.getAttribute('href'),a.getAttribute('download')])));
 }
 if((await page.locator('[data-pdf-downloads] .download-arrow').allTextContents()).some(text=>text!=='↓'))throw Error('Download arrow text is misdecoded');
 if(choices.some(c=>c.length<2||JSON.stringify(c)!==JSON.stringify(choices[0])))throw Error('Reader download choices differ between locations');
 return {status:'passed',groups:3,locations:selectors};
}

async function checkTocLayout(page) {
 if(await page.locator('.mobile-bar [data-pdf-downloads]').count()) throw Error('PDF downloads remain in mobile header');
 if(!(await page.locator('#toc-dialog .dialog-footer [data-pdf-downloads]').count())) throw Error('Missing Contents PDF downloads');
 await page.evaluate(() => document.fonts.ready);
 const failures = await page.locator('#toc-dialog nav a').evaluateAll(links => links.flatMap(link => {
  const title = link.querySelector('.toc-title') || link;
  const style = getComputedStyle(title), width = title.clientWidth;
  const range = document.createRange();range.selectNodeContents(title);
  const lines = new Set([...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => Math.round(r.top))).size;
  const canvas = document.createElement('canvas').getContext('2d');canvas.font = `${style.fontSize} ${style.fontFamily}`;
  const text = title.textContent.trim().replace(/\s+/g,' ');
  const expected = Math.ceil(canvas.measureText(text).width / Math.max(1,width)) + 1;
  return width < link.clientWidth * .6 || lines > expected || link.scrollWidth > link.clientWidth + 1
   ? [{text,width,linkWidth:link.clientWidth,lines,expected}] : [];
 }));
 if(failures.length) throw Error('Contents titles collapse or overflow: '+JSON.stringify(failures));
}

/** Shared browser QA. Supply records and paths through the host Playwright CLI. */
export async function checkPdfBrowser(page,{baseUrl,books,screenshotDirectory,downloadDirectory}){
 const records=[];const paths=['/',...books.flatMap(b=>[`/${b.id}/`,`/${b.id}/editions/v${b.version}/`,`/${b.id}/editions/v${b.version}`])];
 for(const width of [390,1440])for(const mode of ['system','light','dark']){
  await page.setViewportSize({width,height:900});await page.emulateMedia({media:'screen',colorScheme:'dark'});
  await page.goto(baseUrl+'/');await page.evaluate(mode=>localStorage.setItem('handbook-theme',mode),mode);
  for(const path of paths){
   await page.goto(baseUrl+path);await page.evaluate(()=>document.fonts.ready);
   const links=page.locator('a[data-pdf-theme]');const count=await links.count();if(path==='/'){if(await page.locator('[data-pdf-downloads],a[download]').count())throw Error('Gallery contains download controls');}else if(count<2)throw Error('Missing paired PDF controls: '+path);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Page overflow '+path+' '+width);
   const entries=[];
   for(let i=0;i<count;i++){
    const link=links.nth(i),theme=await link.getAttribute('data-pdf-theme'),href=await link.getAttribute('href'),name=await link.getAttribute('download'),label=await link.getAttribute('aria-label');
    const book=books.find(b=>label.includes(b.title)),v=book?.variants.find(v=>v.theme===theme);
    if(!v||name!==v.downloadFilename||!label.includes(`${v.pages} pages`)||!label.includes(`content edition ${book.version}`))throw Error('Wrong accessible PDF identity');
    const info=await page.evaluate(async href=>{const r=await fetch(href);const bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');return {status:r.status,mime:r.headers.get('content-type'),hash,bytes:bytes.byteLength};},href);
    if(info.status!==200||!info.mime.startsWith('application/pdf')||info.hash!==v.sha256||info.bytes!==v.bytes)throw Error('Wrong PDF HTTP identity');
    const visible=await link.isVisible();
    if(visible){
     await link.scrollIntoViewIfNeeded();await link.focus();if(!(await link.evaluate(l=>l===document.activeElement)))throw Error('PDF cannot receive keyboard focus');
     const [download]=await Promise.all([page.waitForEvent('download'),link.press('Enter')]);if(download.suggestedFilename()!==name)throw Error('Wrong saved download filename');
     await download.saveAs(downloadDirectory+'/'+width+'-'+mode+'-'+records.length+'-'+i+'-'+name);await download.delete();
    }
    entries.push({theme,href,name,label,visible,...info});
   }
   if(path==='/'||path===`/${books[0].id}/`){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${screenshotDirectory}/${width}-${mode}-${path==='/'?'gallery':'reader'}.png`});}
   if(/^\/[a-z-]+\/$/.test(path)){
    await checkReaderDownloadPlacements(page);
    await checkCoverActionLayout(page);
    await page.locator('.cover a[href="#contents"]').click();if(!page.url().endsWith('#contents'))throw Error('Explore failed');
    await page.locator('[data-open-search]:visible').first().click();if(!(await page.locator('#search-dialog').isVisible()))throw Error('Search failed');await page.keyboard.press('Escape');
    const toc=page.locator('[data-open-toc]:visible').first();if(await toc.count()){await toc.click();if(!(await page.locator('#toc-dialog').isVisible()))throw Error('Contents failed');await checkTocLayout(page);await page.keyboard.press('Escape');}
    await page.emulateMedia({media:'print'});await page.waitForFunction(()=>[...document.querySelectorAll('figure[data-artwork-paired] img')].every(i=>!i.currentSrc.includes('/assets/dark/')));
    if(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)!=='rgb(255, 255, 255)')throw Error('Browser printing is dark');await page.emulateMedia({media:'screen'});
    await page.locator('a.handbooks-return:visible,a.handbooks-return-mobile:visible').first().click();if(new URL(page.url()).pathname!=='/')throw Error('Gallery return failed');
   }
   records.push({width,mode,path,downloads:entries});
  }
 }
 for(const fallback of ['no-js','blocked-storage']){
  const context=await page.context().browser().newContext({javaScriptEnabled:fallback!=='no-js',viewport:{width:390,height:900},colorScheme:'dark'});
  if(fallback==='blocked-storage')await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked')}}));
  const p=await context.newPage();for(const path of paths){await p.goto(baseUrl+path);if(path==='/'){if(await p.locator('[data-pdf-downloads],a[download]').count())throw Error('Gallery contains fallback download controls');}else if(await p.locator('a[data-pdf-theme="light"]').count()<1||await p.locator('a[data-pdf-theme="dark"]').count()<1)throw Error('Missing fallback download');records.push({fallback,path,status:'passed'});}await context.close();
 }
 return {status:'passed',records};
}
