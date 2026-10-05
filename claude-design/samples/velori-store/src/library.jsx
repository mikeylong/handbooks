import React, {useEffect,useId,useRef,useState} from 'react';
import {CHOICES,LABELS,COLORS,caption,productAssets} from './model.mjs';
import './tokens.css';
import './velori.css';
const assetUrl=path=>new URL(import.meta.env.BASE_URL+path,document.baseURI).href;
export function VeloriIcon({name,...props}){return <svg viewBox="0 0 24 24" className="velori-icon" aria-hidden="true" focusable="false" {...props}>{name==='check'?<path d="M5 12.5 9.5 17 19 7"/>:name==='chevron'?<path d="m5 9 7 7 7-7"/>:name==='friendly'?<path d="M5 8q2-3 4 0m6 0q2-3 4 0M9 14q3 3 6 0"/>:<><circle cx="7" cy="9" r="1"/><circle cx="17" cy="9" r="1"/><path d="M9 15h6"/></>}</svg>;}
export function SelectionMark(){return <span className="selection-mark"><VeloriIcon name="check"/></span>;}
export function PrimaryButton({fixture,...props}){return <button type="button" className={`primary ${fixture==='purple-continue'?'fixture-purple':''}`} {...props}/>;}
export function ChoiceGroup({group,value,onChange}){const face=group==='face';return <div role="group" aria-label={{shell:'Shell finish',face:'Face display',accessory:'Accessories'}[group]} className={`choices ${group}`}>
{CHOICES[group].map(option=><button type="button" key={option} data-choice={`${group}:${option}`} aria-pressed={value===option} className={value===option?'chosen':''} onClick={()=>onChange(option)}>{group==='shell'&&<span className="swatch" style={{background:COLORS[option]}}/>}{face&&<VeloriIcon name={option}/>}<span className="choice-name">{LABELS[option]}{value===option&&<SelectionMark/>}</span></button>)}
</div>;}
export const FinishChoice=props=><ChoiceGroup group="shell" {...props}/>;
export const FaceChoice=props=><ChoiceGroup group="face" {...props}/>;
export const AccessoryChoice=props=><ChoiceGroup group="accessory" {...props}/>;
export function ExpressionSelect({value,onChange}){
 const id=useId(),wrap=useRef(null),trigger=useRef(null),type=useRef({text:'',at:0});const [open,setOpen]=useState(false),[active,setActive]=useState(0);const selected=CHOICES.color.indexOf(value);
 useEffect(()=>{const outside=e=>{if(!wrap.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
 const show=()=>{setActive(selected);setOpen(true);};
 const commit=i=>{onChange(CHOICES.color[i]);setOpen(false);trigger.current.focus();};
 const key=e=>{const k=e.key;if(k==='Tab'){setOpen(false);return;}if(k==='Escape'){e.preventDefault();setOpen(false);return;}
 if(e.altKey&&k==='ArrowUp'){e.preventDefault();setOpen(false);return;}
 if(['Enter',' ','ArrowDown','ArrowUp','Home','End'].includes(k)){e.preventDefault();if(k==='Enter'||k===' '){open?commit(active):show();return;}if(!open){show();if(k==='Home')setActive(0);if(k==='End')setActive(3);return;}setActive(k==='Home'?0:k==='End'?3:k==='ArrowDown'?Math.min(3,active+1):Math.max(0,active-1));return;}
 if(k.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();const now=Date.now();type.current={text:(now-type.current.at<700?type.current.text:'')+k.toLowerCase(),at:now};const i=CHOICES.color.findIndex(c=>LABELS[c].toLowerCase().startsWith(type.current.text));if(i>=0){setActive(i);setOpen(true);}}
 };
 return <div className="expression-select" ref={wrap} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}><label id={`${id}-label`}>Face expression color</label><button type="button" id="expression-select" ref={trigger} className="select-trigger" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-expanded={open} aria-activedescendant={open?`${id}-${active}`:undefined} onClick={()=>open?setOpen(false):show()} onKeyDown={key}><span className="color-dot" style={{background:COLORS[value]}}/><span id={`${id}-value`}>{LABELS[value]}</span><VeloriIcon name="chevron" className="select-arrow"/></button>
 {open&&<div className="select-menu" id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>{CHOICES.color.map((c,i)=><div key={c} id={`${id}-${i}`} role="option" aria-selected={c===value} data-active={i===active} onPointerMove={()=>setActive(i)} onMouseDown={e=>e.preventDefault()} onClick={()=>commit(i)}><span className="color-dot" style={{background:COLORS[c]}}/><span>{LABELS[c]}</span>{c===value&&<VeloriIcon name="check"/>}</div>)}</div>}
 </div>;
}
export function ProductPreview({configuration,unavailable=false,onDetails}){
 const [status,setStatus]=useState('loading'),[ready,setReady]=useState(null),[attempt,setAttempt]=useState(0);
 const c=configuration,a=productAssets(c),signature=JSON.stringify(a);
 useEffect(()=>{let current=true;setStatus('loading');setReady(null);
 const load=path=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>i.decode().then(resolve,reject);i.onerror=reject;i.src=assetUrl(path);});
 Promise.all(Object.values(a).filter(Boolean).map(load)).then(()=>{if(current){setReady(a);setStatus('ready');}},()=>{if(current)setStatus('error');});return()=>{current=false;};
 },[signature,attempt]);
 const failed=unavailable||status==='error';
 return <div className="product-view" aria-busy={!failed&&status==='loading'} data-image-state={failed?'error':status}>
 {ready&&!failed&&<div className="product-render" data-configuration={caption(c)}><img className="product-photo" src={assetUrl(ready.photo)} width="1254" height="1254" alt={`Velori with ${caption(c)}`}/>{ready.shell&&<img className="product-shell" src={assetUrl(ready.shell)} style={{'--robot-mask':`url("${assetUrl(ready.robotMask)}")`}} alt=""/>}<div className="face-light" data-face={c.face} aria-hidden="true"><span className="expression-layer" style={{'--face-mask':`url("${assetUrl(ready.faceMask)}")`,background:COLORS[c.color]}}/></div></div>}
 {failed?<div className="image-placeholder" role="status"><strong>Product image unavailable.</strong><p>Your choices are still here. You can keep editing.</p>{!unavailable&&<button type="button" onClick={()=>setAttempt(n=>n+1)}>Retry image</button>}</div>:status==='loading'&&<p className="image-placeholder" role="status">Loading your Velori…</p>}
 {onDetails&&<button id="accessory-details" type="button" className="details-link" onClick={onDetails}>View accessory details</button>}
 </div>;
}
export function Brand(){return <div className="brand"><b>VELORI</b><span>Personal robotics</span></div>;}
export function StoreHeader({review=false,onBack}){return <header className="store-header"><Brand/>{onBack?<button className="back-link" type="button" onClick={onBack}>← Back to configurator</button>:<ol className="steps" aria-label="Configuration steps"><li aria-current={!review?'step':undefined}><span>1</span>Configure</li><li aria-current={review?'step':undefined}><span>2</span>Review</li></ol>}</header>;}
export function ConfigurationSummary({configuration}){return <dl className="summary">{Object.entries({shell:'Shell finish',face:'Face display',color:'Face expression color',accessory:'Accessories'}).map(([key,label])=><div key={key}><dt>{label}</dt><dd data-summary={key}>{LABELS[configuration[key]]}</dd></div>)}</dl>;}
export function AccessoryPhoto({accessory}){return <div className={`accessory-photo ${accessory}`}><img src={assetUrl(`assets/velori/chalk-${accessory}.png`)} alt={accessory==='bag'?'Velori in its padded carry bag':'Velori on its charging dock'}/></div>;}
