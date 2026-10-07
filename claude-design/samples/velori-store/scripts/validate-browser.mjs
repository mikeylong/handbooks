import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {allConfigurations,caption,LABELS,DEFAULTS,STORAGE_KEY,CART_STORAGE_KEY,productAssets} from '../src/model.mjs';
const url=process.env.VELORI_URL||'http://127.0.0.1:4197/';
const output=process.env.VELORI_VALIDATION_DIR||'validation';fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const context=await browser.newContext({viewport:{width:1024,height:768}});const page=await context.newPage(),errors=[],failed=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
const chosen=(group,value)=>page.locator(`[data-choice="${group}:${value}"]`);
const ready=async(c)=>{await page.locator('[data-image-state=ready]').waitFor();await page.locator(`.product-render[data-configuration="${caption(c)}"]`).waitFor();assert.equal(await page.locator('.caption').textContent(),caption(c));};
const color=async value=>{await page.getByRole('combobox').click();await page.getByRole('option',{name:LABELS[value],exact:true}).click();};
const choose=async(c)=>{for(const key of ['shell','face','accessory'])await chosen(key,c[key]).click();await color(c.color);await ready(c);};
const results=[];
try{
 await page.goto(url);await page.evaluate(()=>{localStorage.setItem('velori.configuration.v1',JSON.stringify({shell:'graphite',face:'simple',color:'amber',accessory:'none'}));localStorage.setItem('clear.review.v1','private-review-sentinel');});await page.reload();await ready(DEFAULTS);
 assert.deepEqual(await page.locator('.store').boundingBox(),{x:0,y:0,width:1024,height:768});
 const baseline=await page.evaluate(()=>({height:document.querySelector('.primary').offsetHeight,radius:getComputedStyle(document.querySelector('.primary')).borderRadius,fill:getComputedStyle(document.querySelector('.primary')).backgroundColor,gap:getComputedStyle(document.querySelector('.accessory')).gap}));assert.deepEqual(baseline,{height:48,radius:'12px',fill:'rgb(32, 38, 43)',gap:'24px'});
 await page.screenshot({path:`${output}/configure.png`});
 for(const c of allConfigurations()){
  await choose(c);for(const key of ['shell','face','accessory'])assert.equal(await chosen(key,c[key]).getAttribute('aria-pressed'),'true');
  assert.ok((await page.locator('.product-photo').getAttribute('src')).endsWith(productAssets(c).photo));
  assert.equal(await page.locator('.product-shell').count(),productAssets(c).shell?1:0);
  const mask=await page.locator('.expression-layer').evaluate(n=>getComputedStyle(n).maskImage);assert.ok(mask.includes(`face-${c.face}.png`));results.push(caption(c));
 }
 const c={shell:'pebble',face:'simple',color:'mint',accessory:'bag'};await choose(c);
 await page.getByRole('button',{name:'View accessory details'}).click();await page.getByRole('heading',{name:'Carry bag.'}).waitFor();await page.screenshot({path:`${output}/accessory-bag.png`});await page.getByRole('button',{name:'Charging dock',exact:true}).click();await page.getByRole('heading',{name:'Charging dock.'}).waitFor();await page.screenshot({path:`${output}/accessory-dock.png`});await page.getByRole('button',{name:'← Back to configurator',exact:true}).click();await ready(c);assert.equal(await page.locator('#accessory-details').evaluate(n=>document.activeElement===n),true);
 await page.locator('#continue').focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Check your configuration'}).waitFor();for(const key of ['shell','face','color','accessory'])assert.equal(await page.locator(`[data-summary=${key}]`).textContent(),LABELS[c[key]]);await page.screenshot({path:`${output}/review.png`});await page.reload();await ready(c);assert.equal(await page.locator('[data-summary=accessory]').textContent(),'Carry bag');await page.getByRole('button',{name:'Edit configuration'}).focus();await page.keyboard.press('Enter');await ready(c);assert.equal(await page.locator('#continue').evaluate(n=>document.activeElement===n),true);
 await page.locator('#continue').click();await page.getByRole('heading',{name:'Check your configuration'}).waitFor();await page.goBack();await ready(c);
 // Cart keeps one saved snapshot while later configuration changes remain a draft.
 await page.locator('#continue').click();await page.getByRole('heading',{name:'Check your configuration'}).waitFor();
 await page.locator('#add-to-cart').focus();await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Added to your cart'}).waitFor();await ready(c);
 assert.equal(await page.locator('.quantity').textContent(),'Quantity: 1');assert.equal(await page.locator('.cart-options h2').count(),1);
 for(const key of ['shell','face','color','accessory'])assert.equal(await page.locator(`[data-summary=${key}]`).textContent(),LABELS[c[key]]);
 assert.deepEqual(JSON.parse(await page.evaluate(k=>sessionStorage.getItem(k),CART_STORAGE_KEY)),{configuration:c,quantity:1});
 await page.reload();await ready(c);await page.screenshot({path:`${output}/cart.png`});
 await page.getByRole('link',{name:'Configurator',exact:true}).click();await choose({...c,shell:'graphite',accessory:'none'});
 await page.getByRole('link',{name:'Cart',exact:true}).click();await page.getByRole('heading',{name:'Added to your cart'}).waitFor();await ready(c);
 await page.getByRole('button',{name:'Edit cart item',exact:true}).click();await ready(c);assert.equal(await page.locator('#continue').textContent(),'Continue');
 const updated={...c,accessory:'none'};await chosen('accessory','none').click();await ready(updated);await page.locator('#continue').click();
 await page.getByRole('heading',{name:'Check your configuration'}).waitFor();await page.locator('#add-to-cart').dblclick();
 await page.getByRole('heading',{name:'Added to your cart'}).waitFor();await ready(updated);assert.equal(await page.locator('.quantity').textContent(),'Quantity: 1');
 assert.deepEqual(JSON.parse(await page.evaluate(k=>sessionStorage.getItem(k),CART_STORAGE_KEY)),{configuration:updated,quantity:1});
 await page.getByRole('button',{name:'Edit cart item',exact:true}).click();await choose(c);
 // Dropdown: opening, navigation, cancel, typeahead, bounds and Tab close.
 const combo=page.getByRole('combobox');await combo.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');await ready({...c,color:'amber'});
 await combo.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('Escape');assert.equal(await combo.getAttribute('aria-expanded'),'false');assert.ok((await combo.textContent()).includes('Amber'));
 await page.keyboard.press('b');await page.keyboard.press('Enter');await ready({...c,color:'blue'});await combo.focus();await page.keyboard.press('Alt+ArrowDown');await page.keyboard.press('Home');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await ready({...c,color:'white'});await combo.click();await page.keyboard.press('Tab');assert.equal(await combo.getAttribute('aria-expanded'),'false');
 // Changes in the same event turn must not let an old image overwrite the last choice.
 await page.evaluate(()=>{for(const value of ['chalk','graphite','pebble','graphite'])document.querySelector(`[data-choice="shell:${value}"]`).click();document.querySelector('[data-choice="accessory:none"]').click();});const last={shell:'graphite',face:'simple',color:'white',accessory:'none'};await ready(last);await page.reload();await ready(last);
 assert.equal(await page.evaluate(()=>localStorage.getItem('clear.review.v1')),'private-review-sentinel');assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('velori.configuration.v1'))).shell,'graphite');assert.deepEqual(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),STORAGE_KEY)),last);
 await page.getByRole('button',{name:'Reset configuration',exact:true}).click();await ready(DEFAULTS);assert.equal(await page.evaluate(k=>localStorage.getItem(k),STORAGE_KEY),null);assert.equal(await page.evaluate(()=>localStorage.getItem('clear.review.v1')),'private-review-sentinel');
 await page.getByRole('link',{name:'Cart',exact:true}).click();await page.getByRole('heading',{name:'Your cart is empty'}).waitFor();
 assert.equal(await page.locator('.quantity').count(),0);assert.equal(await page.locator('.product-photo').count(),0);
 await page.getByRole('button',{name:'Configure Velori',exact:true}).click();await ready(DEFAULTS);assert.equal(await page.locator('#continue').textContent(),'Continue');
 // Unavailable accessories require a deliberate replacement before adding.
 const unavailableContext=await browser.newContext({viewport:{width:1024,height:768}}),up=await unavailableContext.newPage();await up.goto(`${url}?unavailable=bag`);
 await up.locator('[data-choice="shell:graphite"]').click();await up.locator('[data-choice="face:simple"]').click();await up.locator('[data-choice="accessory:bag"]').click();await up.getByRole('combobox').click();await up.getByRole('option',{name:'Amber',exact:true}).click();
 await up.locator('#continue').click();await up.getByRole('alert').waitFor();assert.equal(await up.locator('#add-to-cart').count(),0);assert.equal(await up.locator('[data-summary=accessory]').textContent(),'Carry bag');
 await up.getByRole('button',{name:'Choose None',exact:true}).click();assert.equal(await up.locator('[data-summary=shell]').textContent(),'Graphite');assert.equal(await up.locator('[data-summary=face]').textContent(),'Simple');assert.equal(await up.locator('[data-summary=color]').textContent(),'Amber');
 await up.locator('#add-to-cart').click();await up.getByRole('heading',{name:'Added to your cart'}).waitFor();assert.equal(await up.locator('[data-summary=accessory]').textContent(),'None');
 await up.getByRole('button',{name:'Reset configuration',exact:true}).click();await up.getByRole('heading',{name:'Make Velori yours.'}).waitFor();assert.equal(await up.evaluate(k=>sessionStorage.getItem(k),CART_STORAGE_KEY),null);await unavailableContext.close();
 // Real failed network image, then retry after network recovery, with choices retained.
 const failureContext=await browser.newContext({viewport:{width:1024,height:768}}),failurePage=await failureContext.newPage();await failurePage.route('**/assets/velori/chalk-dock.png',r=>r.abort());await failurePage.goto(url);await failurePage.getByText('Product image unavailable.',{exact:true}).waitFor();await failurePage.locator('#continue').click();await failurePage.getByRole('heading',{name:'Check your configuration'}).waitFor();assert.equal(await failurePage.locator('[data-summary=accessory]').textContent(),'Dock');await failurePage.screenshot({path:`${output}/unavailable-review.png`});await failurePage.unroute('**/assets/velori/chalk-dock.png');await failurePage.getByRole('button',{name:'Retry image'}).click();await failurePage.locator('[data-image-state=ready]').waitFor();await failureContext.close();
 await page.goto(`${url}?fixture=purple-continue`);await ready(DEFAULTS);assert.equal(await page.locator('.primary').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(115, 87, 216)');await page.goto(`${url}?fixture=accessory-gap-8`);await ready(DEFAULTS);assert.equal(await page.locator('.accessory').evaluate(n=>getComputedStyle(n).gap),'8px');
 await page.goto(url);await page.setViewportSize({width:390,height:844});await ready(DEFAULTS);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('#continue').click();await page.getByRole('heading',{name:'Check your configuration'}).waitFor();await page.screenshot({path:`${output}/mobile-review.png`,fullPage:true});
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}}));const bp=await blocked.newPage();await bp.goto(url);await bp.locator('[data-image-state=ready]').waitFor();await bp.locator('[data-choice="shell:graphite"]').click();await bp.getByText('Browser storage is unavailable. Choices and cart will last for this visit.').waitFor();await bp.locator('#continue').click();await bp.getByRole('heading',{name:'Check your configuration'}).waitFor();assert.equal(await bp.locator('[data-summary=shell]').textContent(),'Graphite');await blocked.close();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 fs.writeFileSync(`${output}/result.json`,JSON.stringify({passed:true,url,combinations:results,baseline,checks:['asset loading','configuration selection','bag composite layers','accessory details and return focus','review and edit with keyboard','cart image and four values','one-item cart snapshot','edit saved cart and replace without duplicates','same-session cart reload','unavailable accessory replacement','empty cart recovery','browser Back','reload persistence','dropdown Enter Space arrows Home End Escape Tab typeahead Alt arrows','rapid changes','CLEAR storage independence','reset isolation','real unavailable image and retry','named violation fixtures','mobile overflow'],errors,failed},null,2));console.log(`PASS: ${results.length} combinations and complete journey.`);
}finally{await browser.close();}
