// Run through the host's Playwright CLI: async page => checkReaderBrowser(page, options).
// Fixture inputs are built by build-reader-fixtures.mjs, outside publication output.
export async function checkReaderBrowser(page, {urls, screenshotDirectory}) {
  await checkReaderTableAlignment(page, {urls});
  const results=[];
  for(const url of urls) {
    await page.emulateMedia({media:'screen'});
    await page.goto(url);
    for(const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      for(const mode of ['light','dark']) {
        await page.evaluate(mode=>localStorage.setItem('handbook-theme',mode),mode);await page.reload();
        const images=page.locator('figure[data-artwork-paired] img');
        for(let i=0;i<await images.count();i++) {
          const image=images.nth(i);await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());
          if((await image.evaluate(img=>img.currentSrc.includes('/assets/dark/')))!==(mode==='dark')) throw Error('Wrong artwork source: '+url);
        }
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const info=await page.evaluate(()=>({
          overflow:document.documentElement.scrollWidth>innerWidth,
          artCount:document.querySelectorAll('figure[data-artwork-paired]').length,
          diagrams:[...document.querySelectorAll('.semantic-diagram')].map(d=>({color:getComputedStyle(d).color,background:getComputedStyle(d.closest('figure')).backgroundColor,labels:[...d.querySelectorAll('strong')].map(t=>({label:t.textContent,size:parseFloat(getComputedStyle(t).fontSize)}))})),
          images:[...document.querySelectorAll('figure[data-artwork-paired] img')].map(img=>({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height,figure:img.closest('figure').getBoundingClientRect().width,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,fit:getComputedStyle(img).objectFit}))
        }));
        if(info.overflow) throw Error('Page overflow: '+url+' '+width);
        for(const img of info.images) if(img.width>img.figure+1 || (img.fit!=='contain'&&Math.abs(img.width/img.height-img.naturalWidth/img.naturalHeight)>.01)) throw Error('Artwork geometry: '+url);
        for(const diagram of info.diagrams) {
          if(diagram.labels.some(t=>t.size<16)) throw Error('Small diagram label: '+url);
          if(mode==='dark'&&diagram.background!=='rgba(0, 0, 0, 0)') throw Error('Diagram background plate: '+url);
        }
        await page.emulateMedia({media:'print'});
        const print=await page.evaluate(()=>({semantic:[...document.querySelectorAll('.semantic-diagram')].every(d=>getComputedStyle(d).display==='none'),original:[...document.querySelectorAll('.diagram-print')].every(d=>getComputedStyle(d).display!=='none')}));
        if(!print.semantic||!print.original) throw Error('Print diagram selection: '+url);
        await page.waitForFunction(()=>[...document.querySelectorAll('figure[data-artwork-paired] img')].every(img=>!img.currentSrc.includes('/assets/dark/')));
        const printImages=page.locator('figure[data-artwork-paired] img');
        for(let i=0;i<await printImages.count();i++) {const image=printImages.nth(i);await image.evaluate(img=>img.decode());if(await image.evaluate(img=>img.currentSrc.includes('/assets/dark/'))) throw Error('Dark print artwork: '+url);}
        await page.emulateMedia({media:'screen'});
        if(screenshotDirectory) {
          const diagram=page.locator('.semantic-diagram').first();if(await diagram.count()) await diagram.scrollIntoViewIfNeeded();
          await page.screenshot({path:screenshotDirectory+'/'+new URL(url).pathname.replaceAll('/','_')+width+'-'+mode+'.png'});
        }
        results.push({url,width,mode,...info});
      }
    }
    await page.evaluate(()=>localStorage.removeItem('handbook-theme'));
    for(const scheme of ['dark','light']) {
      await page.emulateMedia({colorScheme:scheme});await page.reload();
      if(await page.evaluate(()=>document.documentElement.dataset.theme)!==scheme) throw Error('System theme: '+url);
    }
  }
  return results;
}

export async function checkReaderFallbacks(page, urls) {
  const browser=page.context().browser(), results=[];
  for(const url of urls) {
    for(const scheme of ['light','dark']) {
      const context=await browser.newContext({javaScriptEnabled:false,colorScheme:scheme,viewport:{width:390,height:900}});
      try {
        const p=await context.newPage();await p.goto(url);
        const images=p.locator('figure[data-artwork-paired] img');
        for(let i=0;i<await images.count();i++) {const image=images.nth(i);await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());if((await image.evaluate(img=>img.currentSrc.includes('/assets/dark/')))!==(scheme==='dark')) throw Error('No-JavaScript artwork source: '+url);}
        const screen=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,themeScriptAbsent:!document.documentElement.dataset.theme}));
        if(screen.overflow || !screen.themeScriptAbsent) throw Error('No-JavaScript screen layout: '+url);
        await p.emulateMedia({media:'print'});await p.waitForTimeout(300);
        if(await p.evaluate(()=>[...document.querySelectorAll('figure[data-artwork-paired] img')].some(img=>img.currentSrc.includes('/assets/dark/')))) throw Error('No-JavaScript print artwork: '+url);
        results.push({url,scheme,...screen,printFallback:true});
      } finally {await context.close();}
    }
    const context=await browser.newContext({viewport:{width:390,height:900}});
    try {
      await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Blocked storage');}}));
      const p=await context.newPage();await p.goto(url);
      await p.locator('[data-theme-trigger]:visible').first().click();await p.locator('[data-theme-choice=dark]:visible').click();
      if(await p.evaluate(()=>document.documentElement.dataset.theme)!=='dark') throw Error('Blocked storage theme: '+url);
      results.push({url,blockedStorage:true});
    } finally {await context.close();}
  }
  return results;
}

// Shared table layout contract for frozen readers and future-title fixtures.
export async function checkReaderTableAlignment(page, {urls}) {
  const results=[];
  for (const url of urls) {
    await page.goto(url);
    await page.evaluate(()=>document.fonts.ready);
    for (const width of [390,1440]) {
      await page.setViewportSize({width,height:900});
      for (const mode of ['light','dark']) {
        await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
        const info=await page.evaluate(()=>{
          const wrappers=[...document.querySelectorAll('td > table:has(> tbody > tr:only-child > td:only-child)')];
          const offsets=wrappers.flatMap(table=>{
            const marker=table.querySelector('p');
            const adjacent=table.parentElement.nextElementSibling?.querySelector('p');
            return marker && adjacent ? [Math.abs(marker.getBoundingClientRect().top-adjacent.getBoundingClientRect().top)] : [];
          });
          const dataCells=[...document.querySelectorAll('[data-nested-data] td')];
          return {markers:offsets.length,maxOffset:Math.max(0,...offsets),nestedDataPreserved:dataCells.every(cell=>parseFloat(getComputedStyle(cell).paddingTop)>0),overflow:document.documentElement.scrollWidth>innerWidth};
        });
        if(info.maxOffset>1 || !info.nestedDataPreserved || info.overflow) throw Error('Table alignment: '+JSON.stringify({url,width,mode,...info}));
        results.push({url,width,mode,...info});
      }
    }
  }
  return results;
}
