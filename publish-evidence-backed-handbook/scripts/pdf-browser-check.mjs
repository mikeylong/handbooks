/** Shared browser QA. Supply records and paths through the host Playwright CLI. */
export async function checkPdfBrowser(page,{baseUrl,books,screenshotDirectory,downloadDirectory}){
 const records=[];const paths=['/',...books.flatMap(b=>[`/${b.id}/`,`/${b.id}/editions/v${b.version}/`,`/${b.id}/editions/v${b.version}`])];
 for(const width of [390,1440])for(const mode of ['system','light','dark']){
  await page.setViewportSize({width,height:900});await page.emulateMedia({media:'screen',colorScheme:'dark'});
  await page.goto(baseUrl+'/');await page.evaluate(mode=>localStorage.setItem('handbook-theme',mode),mode);
  for(const path of paths){
   await page.goto(baseUrl+path);await page.evaluate(()=>document.fonts.ready);
   const links=page.locator('a[data-pdf-theme]');const count=await links.count();if(count<2)throw Error('Missing paired PDF controls: '+path);
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
    await page.locator('.cover a[href="#contents"]').click();if(!page.url().endsWith('#contents'))throw Error('Explore failed');
    await page.locator('[data-open-search]:visible').first().click();if(!(await page.locator('#search-dialog').isVisible()))throw Error('Search failed');await page.keyboard.press('Escape');
    const toc=page.locator('[data-open-toc]:visible').first();if(await toc.count()){await toc.click();if(!(await page.locator('#toc-dialog').isVisible()))throw Error('Contents failed');await page.keyboard.press('Escape');}
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
  const p=await context.newPage();for(const path of paths){await p.goto(baseUrl+path);if(await p.locator('a[data-pdf-theme="light"]').count()<1||await p.locator('a[data-pdf-theme="dark"]').count()<1)throw Error('Missing fallback download');records.push({fallback,path,status:'passed'});}await context.close();
 }
 return {status:'passed',records};
}
