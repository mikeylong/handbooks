import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {validateSiteTheme} from './site-theme.mjs';

const source = await readFile(new URL('../site/theme.js', import.meta.url), 'utf8');
function page({saved = null, dark = false, blocked = false} = {}) {
  const root = {dataset:{}}, color = {}, events = {}, documentEvents = {}, systemEvents = {};
  const selects = [0,1].map(() => ({value:'system', matches:selector => selector === '[data-theme-select]'}));
  const storage = new Map(saved === null ? [] : [['handbook-theme', saved]]);
  const system = {matches:dark, addEventListener:(name, fn) => systemEvents[name] = fn};
  runInNewContext(source, {
    matchMedia:() => system,
    localStorage:{getItem:key => {if(blocked) throw Error(); return storage.get(key) ?? null;}, setItem:(key, value) => {if(blocked) throw Error(); storage.set(key, value);}},
    document:{documentElement:root, querySelectorAll:() => selects, querySelector:() => color, addEventListener:(name, fn) => documentEvents[name] = fn},
    window:{addEventListener:(name, fn) => events[name] = fn},
  });
  return {root, color, events, documentEvents, systemEvents, system, selects, storage,
    choose:value => {selects[0].value = value; documentEvents.change({target:selects[0]});}};
}
for (const dark of [false,true]) {
  const system = page({dark});
  assert.equal(system.root.dataset.theme, dark ? 'dark' : 'light', 'System preference applies before DOM ready');
  system.system.matches = !dark;
  system.systemEvents.change();
  assert.equal(system.root.dataset.theme, dark ? 'light' : 'dark', 'System changes are followed');
  for (const saved of ['light','dark']) {
    const explicit = page({saved,dark});
    assert.equal(explicit.root.dataset.theme, saved, 'Saved preference overrides system');
    explicit.system.matches = !dark;
    explicit.systemEvents.change();
    assert.equal(explicit.root.dataset.theme, saved, 'System changes cannot override an explicit preference');
  }
}
const manual = page();
manual.choose('dark');
assert.equal(manual.root.dataset.theme, 'dark');
assert.equal(manual.color.content, '#191918');
assert(manual.selects.every(select => select.value === 'dark'), 'Desktop and mobile controls stay synchronized');
assert.equal(page({saved:manual.storage.get('handbook-theme')}).root.dataset.theme, 'dark', 'Preference survives navigation');
manual.storage.set('handbook-theme', 'light');
manual.events.pageshow();
assert.equal(manual.root.dataset.theme, 'light', 'Back cache picks up the current preference');
manual.storage.set('handbook-theme', 'dark');
manual.events.storage({key:'handbook-theme'});
assert.equal(manual.root.dataset.theme, 'dark', 'Other tabs update the current page');
manual.storage.clear();
manual.events.storage({key:null});
assert.equal(manual.selects[0].value, 'system', 'Cleared storage restores system mode');
assert.equal(page({saved:'invalid',dark:true}).root.dataset.theme, 'dark', 'Invalid saved values fall back to system');
const blocked = page({blocked:true});
blocked.choose('dark');
blocked.events.pageshow();
assert.equal(blocked.root.dataset.theme, 'dark', 'Controls work with blocked storage');

for (const path of ['', 'ai-evaluation/', 'production-ai-engineering/']) {
  const html = await readFile(new URL(`../output/site/${path}index.html`, import.meta.url), 'utf8');
  validateSiteTheme(html, !path);
  for (const broken of [html.replace('src="/theme.js"', 'src="/missing.js"'), html.replace('href="/theme.css"', 'href="/missing.css"'), html.replace('data-theme-select', 'missing-select')]) {
    assert.throws(() => validateSiteTheme(broken, !path), /Site lacks/, `${path}: missing shared theme surface`);
  }
}
console.log('Shared appearance passed: system/manual choices, navigation, cache return, cross-tab changes, blocked storage, and all published pages.');
