'use strict';
// Consumer configuration is independent of the CLEAR finding and fix records.
{
 const root=document.querySelector('#artifact');
 if(root&&!document.body.dataset.step){
  const key='claude-design.velori.reference.v1', defaults={shell:'chalk',face:'friendly',accessory:'dock',color:'white'};
  const labels={chalk:'Chalk',pebble:'Pebble',graphite:'Graphite',friendly:'Friendly',simple:'Simple',dock:'Dock',bag:'Carry bag',both:'Dock + Carry bag',none:'None',white:'White',mint:'Mint',blue:'Blue',amber:'Amber'};
  const allowed={shell:['chalk','pebble','graphite'],face:['friendly','simple'],accessory:['dock','bag','none'],color:['white','mint','blue','amber']};
  const descriptions={dock:'A charging dock gives your robot a place to rest.',bag:'A padded carry bag keeps Velori protected on the move.',both:'Charge at home. Take Velori with you.',none:'Just Velori, ready to make itself at home.'};
  const assets=window.VELORI_PRODUCT_ASSETS;
  const photo=root.querySelector('.product-photo'), display=root.querySelector('.face-light'), select=root.querySelector('#face-color'), status=root.querySelector('#configuration-status');
  // Keep the carry bag and studio from one photograph. Only the robot changes.
  const shell=document.createElement('img');shell.className='product-shell';shell.alt='';shell.setAttribute('aria-hidden','true');shell.hidden=true;
  display.before(shell);
  const dock=document.createElement('img');dock.className='product-dock';dock.alt='';dock.setAttribute('aria-hidden','true');dock.hidden=true;shell.before(dock);
  const group=root.querySelector('.accessory'),multiple=document.createElement('fieldset');multiple.className='accessory-checkboxes';multiple.hidden=true;multiple.innerHTML='<legend class="sr-only">Accessories</legend>'+['dock','bag'].map(value=>'<label class="accessory-checkbox-card"><input type="checkbox" value="'+value+'"><span class="accessory-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7"/></svg></span><span>'+labels[value]+'</span></label>').join('');group.append(multiple);
  let choices={...defaults,accessories:['dock']},request=0,lastMode=false;
  const multi=()=>root.querySelector('.screen').classList.contains('accessory-multi');
  const effective=()=>multi()?(choices.accessories.length===2?'both':choices.accessories[0]||'none'):choices.accessory;
  const valid=value=>value&&typeof value==='object'&&Object.keys(defaults).every(k=>allowed[k].includes(value[k]))&&(value.accessories===undefined||Array.isArray(value.accessories)&&value.accessories.length<=2&&new Set(value.accessories).size===value.accessories.length&&value.accessories.every(x=>['dock','bag'].includes(x)));
  try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved))choices={...saved,accessories:saved.accessories||(saved.accessory==='none'?[]:[saved.accessory])};}catch{}
  const source=path=>new URL(path,document.currentScript?.src||location.href).href;
  const imageCache=new Map();
  const load=path=>{
   const url=source(path);
   if(!imageCache.has(url))imageCache.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.decode().then(()=>resolve(url),reject);image.onerror=()=>{imageCache.delete(url);reject(new Error('Image unavailable'))};image.src=url;}));
   return imageCache.get(url);
  };
  function controls(){
   const active=effective();multiple.hidden=!multi();for(const input of multiple.querySelectorAll('input'))input.checked=choices.accessories.includes(input.value);
   for(const button of group.querySelectorAll('button'))button.hidden=multi();
   for(const button of root.querySelectorAll('[data-config-group]')){
    const chosen=choices[button.dataset.configGroup]===button.dataset.configValue;
    button.classList.toggle('chosen',chosen);button.setAttribute('aria-pressed',String(chosen));
    button.querySelector('.choice-check').hidden=!chosen;
   }
   root.querySelector('[data-config-label="shell"]').textContent=labels[choices.shell];
   root.querySelector('[data-config-label="face"]').textContent=labels[choices.face];
   root.querySelector('[data-config-label="accessory"]').textContent=labels[active];
   select.value=choices.color;select.dispatchEvent(new Event('velori-select-refresh'));
   root.querySelector('.description').textContent=descriptions[active];
   root.querySelector('.caption').textContent=labels[choices.shell]+' shell · '+labels[choices.face]+' face · '+labels[choices.color]+' · '+labels[active];
  }
  async function render(announce=false){
   controls();
   const next={...choices,accessory:effective()},token=++request;
   const combination=next.shell+'-'+(next.accessory==='both'?'bag':next.accessory);
   root.querySelector('.product-view').setAttribute('aria-busy','true');status.classList.remove('image-error');
   try{
    const bag=['bag','both'].includes(next.accessory)&&assets.bagComposite;
    const layered=bag&&(next.shell!=='chalk'||next.accessory==='both');
    const [photoURL,,shellURL]=await Promise.all([load(bag?bag.base:assets.products[combination]),load(assets.faces[next.face]),layered?load(assets.products[combination]):Promise.resolve(null),layered?load(bag.robotMask):Promise.resolve(null),next.accessory==='both'?load(assets.dockLayer):Promise.resolve(null)]);
    if(token!==request)return;
    photo.src=photoURL;display.style.setProperty('--face-mask','url("'+source(assets.faces[next.face])+'")');
    if(layered){shell.src=shellURL;shell.style.setProperty('--robot-mask','url("'+source(bag.robotMask)+'")');}
    shell.hidden=!layered;dock.hidden=next.accessory!=='both';if(next.accessory==='both')dock.src=source(assets.dockLayer);
    const alignment=assets.alignment[combination]||{x:0,y:0};display.style.transform='translate('+alignment.x+'%,'+alignment.y+'%)';
    display.dataset.color=next.color;display.dataset.face=next.face;display.hidden=false;
    photo.alt='Velori in '+labels[next.shell]+', with a '+labels[next.face]+' '+labels[next.color].toLowerCase()+' face display'+(next.accessory==='none'?' and no accessory':next.accessory==='both'?' on a charging dock with a carry bag':next.accessory==='bag'?' and a carry bag':' on a charging dock');
    status.textContent=announce?'Showing '+photo.alt+'.':'';
   }catch{
    if(token!==request)return;
    status.classList.add('image-error');status.textContent='Image unavailable. Your choices are retained. Choose another option to try again.';
   }finally{if(token===request){root.querySelector('.product-view').setAttribute('aria-busy','false');dispatchEvent(new Event('velori-image-rendered'));}}
  }
  function change(group,value){
   if(!allowed[group]?.includes(value)||choices[group]===value)return;
   choices={...choices,[group]:value,...(group==='accessory'?{accessories:value==='none'?[]:[value]}:{})};
   try{localStorage.setItem(key,JSON.stringify(choices));}catch{status.textContent='Your choices will stay in this tab.';}
   render(true);
  }
  root.addEventListener('click',event=>{const button=event.target.closest('[data-config-group]');if(button)change(button.dataset.configGroup,button.dataset.configValue);});
  multiple.addEventListener('change',()=>{choices={...choices,accessories:[...multiple.querySelectorAll('input:checked')].map(i=>i.value)};try{localStorage.setItem(key,JSON.stringify(choices));}catch{}render(true);});
  
  select.addEventListener('change',()=>change('color',select.value));
  window.addEventListener('storage',event=>{if(event.key!==key)return;try{const saved=JSON.parse(event.newValue);choices=valid(saved)?{...saved,accessories:saved.accessories||(saved.accessory==='none'?[]:[saved.accessory])}:{...defaults,accessories:['dock']};render();}catch{}});
  render();
  // Preload the small catalog after the initial selection is ready.
  if(assets?.products&&assets?.faces)Promise.allSettled(Object.values(assets.products).concat(Object.values(assets.faces)).map(load));
 }
}
