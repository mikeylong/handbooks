import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source = await readFile(new URL('../site/gallery-focus.js', import.meta.url), 'utf8');
const paths = ['/production-ai-engineering/', '/ai-evaluation/', '/ai-consulting/'];
function page({reader, referrer = '', type = 'navigate', state = null, storage = new Map(), blocked = false} = {}) {
  const events = {}, documentEvents = {};
  const makeLink = path => {
    const classes = new Set(), handlers = {};
    return {href:`https://handbooks.example${path}`, target:'', handlers, classes,
      classList:{add:value=>classes.add(value), remove:value=>classes.delete(value)},
      addEventListener:(name, fn)=>handlers[name]=fn,
      focus:()=>focused=path, getBoundingClientRect:()=>({top:10,bottom:100}), scrollIntoView:()=>{},
    };
  };
  let focused;
  const cards = reader ? [] : paths.map(makeLink);
  const home = makeLink('/');
  const history = {state, replaceState:next=>history.state=next};
  runInNewContext(source, {
    URL, location:{origin:'https://handbooks.example',pathname:reader ?? '/'}, history,
    performance:{getEntriesByType:()=>[{type}]}, innerHeight:900,
    requestAnimationFrame:fn=>fn(),
    sessionStorage:{getItem:key=>{if(blocked) throw Error(); return storage.get(key) ?? null;},
      setItem:(key,value)=>{if(blocked) throw Error(); storage.set(key,value);},
      removeItem:key=>{if(blocked) throw Error(); storage.delete(key);}},
    window:{addEventListener:(name,fn)=>events[name]=fn},
    document:{referrer, querySelector:()=>reader ? {} : null,
      querySelectorAll:selector=>selector==='.handbook-card-link' ? cards : [home],
      addEventListener:(name,fn)=>documentEvents[name]=fn},
  });
  return {events,documentEvents,cards,home,history,storage,focused:()=>focused};
}
const click = {button:0};
for (const path of paths) {
  const gallery = page({state:{other:'preserved'}});
  gallery.cards[paths.indexOf(path)].handlers.click(click);
  assert.equal(gallery.history.state.other, 'preserved');
  const reader = page({reader:path,storage:gallery.storage});
  reader.events.pageshow({persisted:false});
  gallery.events.pageshow({persisted:true});
  assert.equal(gallery.focused(),path,'Browser Back restores focus from cache');
  assert(gallery.cards[paths.indexOf(path)].classes.has('is-return-focus'));
  gallery.documentEvents.focusout({target:gallery.cards[paths.indexOf(path)]});
  assert(!gallery.cards[paths.indexOf(path)].classes.has('is-return-focus'),'Ring clears when focus leaves');

  reader.home.handlers.click(click);
  const returned = page({storage:reader.storage});
  returned.events.pageshow({persisted:false});
  assert.equal(returned.focused(),path,'All handbooks restores focus without a referrer');
  assert(!returned.storage.has('handbook-gallery-return'),'Return request is consumed');
  const reloadedBack = page({type:'back_forward',storage:reader.storage});
  reloadedBack.events.pageshow({persisted:false});
  assert.equal(reloadedBack.focused(),path,'Back also works without cached DOM');
  const noStorage = page({blocked:true,referrer:`https://handbooks.example${path}`});
  noStorage.events.pageshow({persisted:false});
  assert.equal(noStorage.focused(),path,'Return works when storage is blocked');
}
const fresh = page({storage:new Map([['handbook-last-viewed',paths[0]]])});
fresh.events.pageshow({persisted:false});
assert.equal(fresh.focused(),undefined,'Fresh visits do not focus a stale handbook');
fresh.cards[0].handlers.click({button:0,ctrlKey:true});
assert.equal(fresh.history.state,null,'Modified clicks keep the current gallery state');
const unknown = page({storage:new Map([['handbook-gallery-return','/missing/']])});
unknown.events.pageshow({persisted:false});
assert.equal(unknown.focused(),undefined,'Unknown titles are ignored');
console.log('Gallery return focus passed for both titles, Back/cache restores, return links, blocked storage, and fresh visits.');
