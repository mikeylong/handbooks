import React from 'react';
import {ConfigurationSummary} from './library.jsx';

export function CartConfirmation({cart,onEdit}) {
 return <section className="options cart-options" aria-labelledby="page-heading">
  <p className="eyebrow">YOUR CART</p>
  <h1 id="page-heading" tabIndex="-1">{cart?'Added to your cart':'Your cart is empty'}</h1>
  <p className="sub">{cart?'Your configured Velori is saved below. No order has been placed.':'Configure a Velori, then review your choices and add it to your cart.'}</p>
  {cart&&<><h2>Velori personal robot</h2><ConfigurationSummary configuration={cart.configuration}/><p className="quantity">Quantity: {cart.quantity}</p></>}
  <button type="button" className="secondary" id="edit-cart-item" onClick={onEdit}>{cart?'Edit cart item':'Configure Velori'}</button>
  {cart&&<p className="cart-note">Changes update this cart item after you review and add it again.</p>}
 </section>;
}
