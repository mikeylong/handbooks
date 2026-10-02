async page => {
 const base='http://127.0.0.1:4181/ai-consulting/',out='/Users/mike/handbooks/ai-consulting/candidate-2026-10-01/site-repository/output/playwright/reader-semantics';const records=[];
 for(const width of [1280,390,320]){
  await page.setViewportSize({width,height:900});await page.goto(base);
  for(const theme of ['light','dark']){
   const c=page.locator('.theme-control').filter({visible:true}).first();await c.locator('[data-theme-trigger]').click();await c.locator(`[data-theme-choice="${theme}"]`).click();
   const lists=page.locator('#main-content .reader-prose-list');const rows=await lists.evaluateAll(es=>es.map(e=>({tag:e.tagName,kind:e.className,overflow:e.scrollWidth>e.clientWidth,table:!!e.closest('table'),items:e.children.length})));
   if(rows.some(r=>r.overflow||r.table)||!rows.some(r=>r.tag==='OL')||!rows.some(r=>r.kind.includes('reader-checklist')))throw Error('List semantics or wrapping');
   if(await page.locator('#main-content .chapter-art img:not([alt=""])').count())throw Error('Decorative alternatives');
   for(const [kind,selector] of [['bullets','ul.reader-prose-list:not(.reader-checklist)'],['steps','ol.reader-prose-list'],['checklist','.reader-checklist']]){const list=page.locator('#main-content '+selector).first();await list.scrollIntoViewIfNeeded();await list.screenshot({path:`${out}/${kind}-${width}-${theme}.png`});}
   records.push({width,theme,lists:rows.length,semantics:'passed',wrapping:'passed',decorativeArt:'passed'});
  }
 }
 return {status:'passed',records};
}
