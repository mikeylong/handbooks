import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allConfigurations,normalize,DEFAULTS,productAssets,caption,readConfiguration,saveConfiguration,resetConfiguration,STORAGE_KEY,CART_STORAGE_KEY,createCartItem,addConfigurationToCart,readCart,saveCart,resetStore,parseRoute} from './model.mjs';
test('72 distinct configurations round-trip without changing unrelated storage',()=>{const map=new Map([['velori.configuration.v1','private-owner-values'],['clear.review.v1','owner-review']]);const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};const combinations=allConfigurations();assert.equal(combinations.length,72);assert.equal(new Set(combinations.map(caption)).size,72);for(const c of combinations){assert.deepEqual(normalize(c),c);assert.ok(saveConfiguration(storage,c));assert.deepEqual(readConfiguration(storage).configuration,c);assert.ok(productAssets(c).photo);}assert.ok(resetConfiguration(storage));assert.equal(map.has(STORAGE_KEY),false);assert.equal(map.get('velori.configuration.v1'),'private-owner-values');assert.equal(map.get('clear.review.v1'),'owner-review');});
test('malformed and inaccessible storage produce defaults',()=>{assert.deepEqual(normalize({shell:'violet',face:'simple',color:'amber',accessory:'both'}),{...DEFAULTS,face:'simple',color:'amber'});assert.deepEqual(readConfiguration({getItem:()=>'{'}),{configuration:DEFAULTS,error:true});const blocked={getItem:()=>{throw Error()},setItem:()=>{throw Error()},removeItem:()=>{throw Error()}};assert.equal(readConfiguration(blocked).error,true);assert.equal(saveConfiguration(blocked,DEFAULTS),false);assert.equal(resetConfiguration(blocked),false);});
test('bag composition uses the corrected robot shell over the canonical bag base',()=>{for(const shell of ['pebble','graphite']){const a=productAssets({...DEFAULTS,shell,accessory:'bag'});assert.equal(a.photo,'assets/velori/chalk-bag.png');assert.equal(a.shell,`assets/velori/${shell}-bag-shell-v2.png`);assert.ok(a.robotMask);}assert.equal(productAssets({...DEFAULTS,accessory:'bag'}).shell,null);});

const memoryStorage=(entries=[])=>{const values=new Map(entries);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
test('a cart snapshots every configuration with one real product and quantity one',()=>{
 for(const configuration of allConfigurations()){
  const cart=createCartItem(configuration);
  assert.deepEqual(cart.configuration,configuration);
  assert.notEqual(cart.configuration,configuration);
  assert.equal(cart.quantity,1);
  assert.ok(productAssets(cart.configuration).photo);
  configuration.color=configuration.color==='white'?'amber':'white';
  assert.notEqual(cart.configuration.color,configuration.color);
 }
});
test('editing the saved cart and adding again replaces one item; repeated activation cannot duplicate it',()=>{
 const first={shell:'graphite',face:'simple',color:'amber',accessory:'bag'};
 const saved=createCartItem(first),editing={...saved.configuration};
 editing.accessory='none';
 assert.deepEqual(saved.configuration,first);
 let cart=addConfigurationToCart(saved,editing);
 for(let i=0;i<20;i++)cart=addConfigurationToCart(cart,editing);
 assert.deepEqual(cart,{configuration:editing,quantity:1});
 assert.deepEqual(saved.configuration,first);
});
test('an unavailable accessory blocks adding until an explicit replacement or None is chosen',()=>{
 const saved=createCartItem(DEFAULTS),configuration={shell:'graphite',face:'simple',color:'amber',accessory:'bag'};
 assert.equal(addConfigurationToCart(saved,configuration,['bag']),saved);
 assert.equal(addConfigurationToCart(null,configuration,['bag']),null);
 for(const accessory of ['dock','none']){
  const cart=addConfigurationToCart(saved,{...configuration,accessory},['bag']);
  assert.deepEqual(cart.configuration,{...configuration,accessory});
  assert.equal(cart.quantity,1);
 }
});
test('configuration and cart reload independently and reset preserves unrelated namespaces',()=>{
 const local=memoryStorage([['velori.configuration.v1','owner-choices']]),session=memoryStorage([['other.cart','another-item']]);
 const saved={shell:'graphite',face:'simple',color:'amber',accessory:'bag'},draft={...saved,shell:'pebble',accessory:'none'};
 assert.ok(saveConfiguration(local,draft));assert.ok(saveCart(session,createCartItem(saved)));
 assert.deepEqual(readConfiguration(local).configuration,draft);
 assert.deepEqual(readCart(session).cart,{configuration:saved,quantity:1});
 assert.ok(resetStore(local,session));
 assert.deepEqual(readConfiguration(local).configuration,DEFAULTS);
 assert.deepEqual(readCart(session),{cart:null,error:false});
 assert.equal(local.values.has(STORAGE_KEY),false);assert.equal(session.values.has(CART_STORAGE_KEY),false);
 assert.equal(local.values.get('velori.configuration.v1'),'owner-choices');assert.equal(session.values.get('other.cart'),'another-item');
});
test('empty, malformed and inaccessible cart storage cannot invent a cart item',()=>{
 assert.deepEqual(readCart(memoryStorage()),{cart:null,error:false});
 for(const value of ['{',JSON.stringify({configuration:{...DEFAULTS,accessory:'both'}}),JSON.stringify({quantity:1})])assert.deepEqual(readCart(memoryStorage([[CART_STORAGE_KEY,value]])),{cart:null,error:true});
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')},removeItem(){throw Error('blocked')}};
 assert.deepEqual(readCart(blocked),{cart:null,error:true});assert.equal(saveCart(blocked,createCartItem(DEFAULTS)),false);
 const session=memoryStorage([[CART_STORAGE_KEY,JSON.stringify(createCartItem(DEFAULTS))]]);
 assert.equal(resetStore(blocked,session),false);assert.equal(session.values.has(CART_STORAGE_KEY),false);
});
test('current routes and retained configurator/detail aliases recover to a usable screen',()=>{
 for(const screen of ['configure','edit','review','cart','specimens'])for(const prefix of ['#','#/'])assert.equal(parseRoute(prefix+screen),screen);
 assert.equal(parseRoute('#/accessory/carry-bag'),'details-bag');assert.equal(parseRoute('#/accessory/dock'),'details-dock');
 assert.equal(parseRoute('#details-bag'),'details-bag');assert.equal(parseRoute('#details-dock'),'details-dock');
 for(const hash of ['','#/checkout','#/unknown','#/constructor','#/toString','#__proto__'])assert.equal(parseRoute(hash),'configure');
});
