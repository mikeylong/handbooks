'use strict';
// A shared select-only combobox. The native select remains the value and fallback.
window.initializeVeloriSelect=function(root=document){
 const palette=VELORI_DESIGN_SYSTEM.selectControl.colors;
 for(const wrapper of root.querySelectorAll('[data-velori-select]')){
  if(wrapper.querySelector('.velori-select-trigger'))continue;
  const select=wrapper.querySelector('select');
  if(!select||select.disabled)continue;
  const label=document.querySelector('label[for="'+select.id+'"]');
  if(!label)continue;
  label.id||=select.id+'-label';
  const screen=wrapper.closest('.screen');
  const entries=[...select.options].map(option=>({value:option.value,label:option.textContent,color:palette[option.value.toLowerCase()]||'#f4f6f2'}));
  const element=(tag,cls)=>{const node=document.createElement(tag);node.className=cls;return node;};
  const icon=kind=>VELORI_ICONS.create(kind==='velori-select-check'?'check':'chevron-down',kind);
  const trigger=element('button','velori-select-trigger');trigger.type='button';trigger.id=select.id+'-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-labelledby',label.id);trigger.hidden=true;
  const chip=element('span','velori-select-swatch');chip.setAttribute('aria-hidden','true');const value=element('span','velori-select-value');trigger.append(chip,value,icon('velori-select-arrow'));wrapper.append(trigger);
  const menu=element('div','velori-select-menu');menu.id=select.id+'-listbox';menu.setAttribute('role','listbox');menu.setAttribute('aria-labelledby',label.id);menu.hidden=true;menu.setAttribute('popover','manual');trigger.setAttribute('aria-controls',menu.id);document.body.append(menu);
  const options=entries.map((entry,index)=>{const row=element('div','velori-select-option');row.id=select.id+'-option-'+index;row.setAttribute('role','option');row.setAttribute('aria-selected','false');const swatch=element('span','velori-select-swatch');swatch.setAttribute('aria-hidden','true');swatch.style.background=entry.color;const text=element('span','velori-select-option-label');text.textContent=entry.label;row.append(swatch,text,icon('velori-select-check'));row.addEventListener('pointermove',()=>activate(index));row.addEventListener('pointerdown',event=>event.preventDefault());row.addEventListener('click',()=>commit(index));menu.append(row);return row;});
  let enabled=false,opened=false,active=0,search='',searchedAt=0;
  const chosen=()=>Math.max(0,entries.findIndex(entry=>entry.value===select.value));
  function update(){const index=chosen();chip.style.background=entries[index].color;value.textContent=entries[index].label;for(let i=0;i<options.length;i++)options[i].setAttribute('aria-selected',String(i===index));}
  function position(){
   const r=trigger.getBoundingClientRect(),surface=wrapper.closest('#artifact');
   const scale=surface?surface.getBoundingClientRect().width/surface.offsetWidth:r.width/trigger.offsetWidth;
   const style=getComputedStyle(trigger),gap=VELORI_DESIGN_SYSTEM.selectControl.menu.gap*scale,gutter=8;
   // Top-layer popovers escape the artifact transform and its inherited tokens.
   // Keep coordinates in viewport pixels, but paint the consumer menu at the
   // same scale as its trigger, including type, swatches, spacing, and borders.
   for(const name of style)if(name.startsWith('--velori-'))menu.style.setProperty(name,style.getPropertyValue(name));
   menu.style.fontFamily=style.fontFamily;menu.style.fontSize=style.fontSize;menu.style.lineHeight=style.lineHeight;
   menu.style.transformOrigin='top left';menu.style.transform='scale('+scale+')';
   const width=Math.min(Math.max(r.width/scale,220),(window.innerWidth-gutter*2)/scale),paintedWidth=width*scale;
   menu.style.width=width+'px';menu.style.left=Math.max(gutter,Math.min(r.left,window.innerWidth-paintedWidth-gutter))+'px';
   menu.style.maxHeight='none';
   const fullHeight=menu.offsetHeight*scale,below=Math.max(0,window.innerHeight-r.bottom-gap-gutter),above=Math.max(0,r.top-gap-gutter);
   const up=below<fullHeight&&above>below,available=up?above:below,height=Math.min(fullHeight,available);menu.dataset.side=up?'above':'below';
   menu.style.maxHeight=available/scale+'px';
   const top=up?r.top-gap-height:r.bottom+gap;
   menu.style.top=Math.max(gutter,Math.min(top,window.innerHeight-gutter-height))+'px';
  }
  function activate(index){active=Math.max(0,Math.min(entries.length-1,index));for(let i=0;i<options.length;i++)options[i].dataset.active=String(i===active);if(opened){trigger.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView({block:'nearest'});}}
  function close(refocus=false){if(!opened)return;opened=false;if(menu.hidePopover)menu.hidePopover();menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');if(refocus&&enabled)trigger.focus({preventScroll:true});}
  function open(){if(!enabled||opened)return;update();opened=true;menu.hidden=false;if(menu.showPopover)menu.showPopover();trigger.setAttribute('aria-expanded','true');position();activate(chosen());}
  function commit(index){const entry=entries[index];select.value=entry.value;update();close(true);select.dispatchEvent(new Event('change',{bubbles:true}));}
  function enhance(){
   const next=!screen||!screen.classList.contains('color-chips');
   if(enabled===next){update();return;}
   const wasFocused=document.activeElement===trigger||document.activeElement===select;
   close(false);enabled=next;wrapper.classList.toggle('velori-select-enhanced',enabled);select.hidden=enabled;trigger.hidden=!enabled;label.htmlFor=enabled?trigger.id:select.id;
   if(enabled)select.setAttribute('aria-hidden','true');else select.removeAttribute('aria-hidden');
   update();if(wasFocused)(enabled?trigger:select).focus({preventScroll:true});
   wrapper.dispatchEvent(new Event('velori-select-layout',{bubbles:true}));
  }
  trigger.addEventListener('click',()=>{if(opened)close();else open();});
  trigger.addEventListener('keydown',event=>{
   const key=event.key;
   if(event.altKey&&(key==='ArrowUp'||key==='ArrowDown')){event.preventDefault();event.stopPropagation();if(key==='ArrowUp')close(true);else open();return;}
   if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(key)){event.preventDefault();event.stopPropagation();
    if(key==='Escape'){close(true);return;}
    if(key==='Enter'||key===' '){if(opened)commit(active);else open();return;}
    if(!opened){open();if(key==='Home')activate(0);if(key==='End')activate(entries.length-1);return;}
    activate(key==='Home'?0:key==='End'?entries.length-1:active+(key==='ArrowDown'?1:-1));return;
   }
   if(key==='Tab'){close();return;}
   if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();event.stopPropagation();const now=Date.now();search=now-searchedAt>700?key:search+key;searchedAt=now;open();const index=entries.findIndex(entry=>entry.label.toLowerCase().startsWith(search.toLowerCase()));if(index>=0)activate(index);}
  });
  trigger.addEventListener('blur',()=>close());
  document.addEventListener('pointerdown',event=>{if(opened&&!wrapper.contains(event.target)&&!menu.contains(event.target))close();},true);
  document.addEventListener('wheel',event=>{if(opened&&!menu.contains(event.target))close();},{capture:true,passive:true});
  window.addEventListener('resize',()=>{if(opened)position();});
  window.addEventListener('velori-surface-layout',()=>{if(opened)position();});
  window.addEventListener('scroll',event=>{if(opened&&!menu.contains(event.target))position();},true);
  const surface=wrapper.closest('#artifact');
  if(surface)new MutationObserver(()=>{if(opened)position();}).observe(surface,{attributes:true,attributeFilter:['style']});
  select.addEventListener('change',update);select.addEventListener('velori-select-refresh',update);
  if(screen)new MutationObserver(enhance).observe(screen,{attributes:true,attributeFilter:['class']});
  enhance();
 }
};
window.initializeVeloriSelect();
