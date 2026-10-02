async page => {
 const base='http://127.0.0.1:4181', out='/Users/mike/handbooks/ai-consulting/candidate-2026-10-01/site-repository/output/playwright/appearance';
 const records=[];let checks=0;
 const check=(ok,message)=>{checks++;if(!ok)throw Error(message);};
 const control=p=>p.locator('.theme-control').filter({visible:true}).first();
 const choose=async(p,value)=>{const c=control(p);await c.locator('[data-theme-trigger]').click();await c.locator(`[data-theme-choice="${value}"]`).click();};
 await page.emulateMedia({colorScheme:'light',media:'screen'});
 for(const width of [1280,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/production-ai-engineering/','/ai-evaluation/','/ai-consulting/']){
   await page.goto(base+route);const c=control(page),trigger=c.locator('[data-theme-trigger]');
   const before=await trigger.boundingBox();
   for(const value of ['dark','light','system']){
    const scrollBefore=await page.evaluate(()=>scrollY);
    await trigger.click();check(await c.locator(`[data-theme-choice="${value}"]`).isVisible(),'menu visible');
    const menu=await c.locator('.theme-menu').boundingBox();check(menu.x>=0&&menu.x+menu.width<=width&&menu.y>=0&&menu.y+menu.height<=900,'menu within viewport '+width+route);
    await c.locator(`[data-theme-choice="${value}"]`).click();
    check(await page.evaluate(()=>document.documentElement.dataset.theme)===(value==='system'?'light':value),'correct theme');
    check(await trigger.getAttribute('aria-label')==='Appearance: '+value[0].toUpperCase()+value.slice(1),'accessible current choice');
    check(await c.locator('.theme-menu').isHidden(),'selection closes menu');
    check(await trigger.evaluate(e=>e===document.activeElement),'focus returns');
    check(await page.evaluate(()=>scrollY)===scrollBefore,'no scroll jump');
    const after=await trigger.boundingBox();check(JSON.stringify(before)===JSON.stringify(after),'stable control bounds');
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    check(await page.locator('[data-theme-choice][aria-checked="true"]').count()===(route==='/'?1:2),'one selected mode in each control');
   }
   await trigger.focus();await page.keyboard.press('ArrowDown');
   check(await c.locator('[data-theme-choice="system"]').evaluate(e=>e===document.activeElement),'keyboard opens at active choice');
   await page.keyboard.press('ArrowDown');check(await c.locator('[data-theme-choice="light"]').evaluate(e=>e===document.activeElement),'arrow navigation');
   await page.keyboard.press('End');await page.keyboard.press('Enter');check(await page.evaluate(()=>document.documentElement.dataset.theme)==='dark','keyboard selection');
   await trigger.click();await page.keyboard.press('Escape');check(await c.locator('.theme-menu').isHidden()&&await trigger.evaluate(e=>e===document.activeElement),'Escape restores focus');
   await trigger.click();await page.keyboard.press('Tab');check(await c.locator('.theme-menu').isHidden(),'Tab dismisses');check(await page.evaluate(()=>document.activeElement!==document.body&&!document.activeElement.closest('.theme-menu')),'Tab continues outside the menu');
   await trigger.click();await page.mouse.click(2,898);check(await c.locator('.theme-menu').isHidden(),'outside click dismisses');
   await page.reload();check(await page.evaluate(()=>document.documentElement.dataset.theme)==='dark','saved preference survives reload');
   await choose(page,'system');await page.emulateMedia({colorScheme:'dark'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');check(true,'system follows OS');
   await choose(page,'light');await page.emulateMedia({colorScheme:'light'});await page.emulateMedia({colorScheme:'dark'});check(await page.evaluate(()=>document.documentElement.dataset.theme)==='light','manual choice remains fixed');
   await page.emulateMedia({colorScheme:'light'});
   if(route!=='/'){
    const art=await page.locator('#main-content figure img').first().evaluate(e=>{const s=getComputedStyle(e);return[s.filter,s.maskImage,s.clipPath,s.mixBlendMode];});check(JSON.stringify(art)==='["none","none","none","normal"]','art preserved');
   }
   if(width===1280||width===390){await control(page).locator('[data-theme-trigger]').click();await page.screenshot({path:`${out}/${route==='/'?'gallery':route.split('/')[1]}-${width}-light.png`});await page.keyboard.press('Escape');await choose(page,'dark');await control(page).locator('[data-theme-trigger]').click();await page.screenshot({path:`${out}/${route==='/'?'gallery':route.split('/')[1]}-${width}-dark.png`});await page.keyboard.press('Escape');}
   records.push({route,width,choices:'Light/Dark/System',keyboard:'passed',layout:'stable',persistence:'passed'});
  }
 }
 await page.setViewportSize({width:390,height:844});
 for(const route of ['/production-ai-engineering/','/ai-evaluation/','/ai-consulting/']){
  await page.goto(base+route);await choose(page,'dark');
  await page.getByRole('button',{name:'Search',exact:true}).filter({visible:true}).first().click();await page.locator('#handbook-search').fill('risk');await page.locator('[data-search-results] a').first().waitFor();await page.locator('[data-close-search]').click();
  await page.getByRole('button',{name:'Contents',exact:true}).click();await page.locator('#toc-dialog a[href^="#"]').first().click();
  await page.locator('[aria-label="All handbooks"]:visible').first().click();check(await page.evaluate(()=>document.documentElement.dataset.theme)==='dark','navigation preserves preference');await page.goBack();check(await page.evaluate(()=>document.documentElement.dataset.theme)==='dark','Back preserves preference');
  await page.emulateMedia({media:'print'});check(await control(page).count()===0,'print hides control');check(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor)==='rgb(255, 255, 255)','print uses white paper');await page.emulateMedia({media:'screen'});
 }
 const other=await page.context().newPage();await other.goto(base+'/ai-evaluation/');await choose(other,'light');await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');check(true,'cross-tab change');await other.close();
 const browser=page.context().browser();
 const blocked=await browser.newContext({colorScheme:'dark',viewport:{width:390,height:844}});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const b=await blocked.newPage();await b.goto(base+'/ai-consulting/');await choose(b,'light');check(await b.evaluate(()=>document.documentElement.dataset.theme)==='light','blocked storage works');await blocked.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,colorScheme:'dark'});const n=await nojs.newPage();await n.goto(base+'/ai-consulting/');check(await n.locator('.theme-control').filter({visible:true}).count()===0,'no JS hides control');check(await n.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--paper').trim())==='#191918','no JS follows system');await nojs.close();
 await page.goto(base+'/production-ai-engineering/');await page.setViewportSize({width:1280,height:900});await choose(page,'system');
 return {status:'passed',checks,records,additional:['search and mobile contents for all three readers','cross-tab preference','navigation and Back','blocked storage','no JavaScript','white printing','original artwork'],screenshots:16};
}
