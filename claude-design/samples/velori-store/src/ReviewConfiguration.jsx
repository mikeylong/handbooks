import React,{useEffect,useRef} from 'react';
import {ConfigurationSummary,PrimaryButton} from './library.jsx';
import {CHOICES,LABELS} from './model.mjs';

// Review column adapted from the accepted Claude Design handoff captured 2026-10-05.
// The application owns configuration, navigation, persistence, imagery and focus restoration.
export function ReviewConfiguration({configuration,onBack,onAddToCart,onAccessoryChange,unavailableAccessories=[]}) {
 const blocked=unavailableAccessories.includes(configuration.accessory),wasBlocked=useRef(blocked);
 useEffect(()=>{if(wasBlocked.current&&!blocked)document.getElementById('add-to-cart')?.focus();wasBlocked.current=blocked;},[blocked]);
 return <section className="options review-options" aria-labelledby="page-heading">
  <p className="eyebrow">BEFORE YOU ADD TO CART</p>
  <h1 id="page-heading" tabIndex="-1">Check your configuration</h1>
  <p className="sub">Review each choice. Use Edit configuration to make changes.</p>
  <ConfigurationSummary configuration={configuration} unavailable={blocked}/>
  {configuration.accessory==='none'&&<p className="cart-note">No accessory added. You can add one in Edit configuration.</p>}
  {blocked&&<div className="availability-alert" role="alert"><h2>{LABELS[configuration.accessory]} is unavailable</h2><p>Choose a replacement or None to continue. Your other three choices stay as they are.</p><div className="replacement-actions">{CHOICES.accessory.filter(a=>!unavailableAccessories.includes(a)).map(a=><button type="button" className="secondary" key={a} onClick={()=>onAccessoryChange(a)}>Choose {LABELS[a]}</button>)}</div></div>}
  <button type="button" id="edit-configuration" className="secondary" onClick={onBack}>Edit configuration</button>
  {!blocked&&<PrimaryButton id="add-to-cart" aria-describedby="confirmation-note" onClick={onAddToCart}>Add to cart</PrimaryButton>}
  <p id="confirmation-note" className="cart-note">Add this configured robot to your cart. No payment is taken.</p>
  <button type="button" id="review-back" className="back-link review-back" onClick={onBack} aria-label="Back to configurator">← Back</button>
 </section>;
}
