import assert from 'node:assert/strict';
import {readFile, mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {addSiteTheme, validateSiteTheme, finalizeSiteThemes, hostedHtmlPages} from './site-theme.mjs';

const source = await readFile(new URL('../assets/reader/theme.js', import.meta.url), 'utf8');
function page({saved = null, dark = false, blocked = false} = {}) {
  const root = {dataset:{}}, color = {}, events = {}, documentEvents = {}, systemEvents = {};
  const darkSources = [{media:'screen and (prefers-color-scheme: dark)'}];
  const triggers = [0,1].map(() => ({setAttribute:(key,value) => {}, focus:() => {}}));
  const labels = [0,1].map(() => ({textContent:''}));
  const choices = [0,1].flatMap(() => ['system','light','dark'].map(value => ({dataset:{themeChoice:value}, attributes:{}, setAttribute(key,value){this.attributes[key]=value;}})));
  const controls = triggers.map(trigger => ({querySelector:selector => selector === '.theme-menu' ? {hidden:true} : trigger}));
  const storage = new Map(saved === null ? [] : [['handbook-theme', saved]]);
  const system = {matches:dark, addEventListener:(name, fn) => systemEvents[name] = fn};
  runInNewContext(source, {
    matchMedia:() => system,
    localStorage:{getItem:key => {if(blocked) throw Error(); return storage.get(key) ?? null;}, setItem:(key, value) => {if(blocked) throw Error(); storage.set(key, value);}},
    document:{documentElement:root, querySelectorAll:selector => ({'[data-theme-trigger]':triggers,'[data-theme-label]':labels,'[data-theme-choice]':choices,'.theme-control':controls,'[data-dark-artwork]':darkSources}[selector]), querySelector:() => color, addEventListener:(name, fn) => documentEvents[name] = fn},
    window:{addEventListener:(name, fn) => events[name] = fn},
  });
  return {root, color, darkSources, events, documentEvents, systemEvents, system, labels, choices, storage,
    choose:value => {const choice=choices.find(button=>button.dataset.themeChoice===value); documentEvents.click({target:{closest:selector=>selector==='.theme-control'?controls[0]:selector==='[data-theme-choice]'?choice:null}});}};
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
assert.equal(manual.darkSources[0].media, 'screen', 'Authored dark source follows explicit Dark and excludes print');
manual.choose('light');
assert.equal(manual.darkSources[0].media, 'not all', 'Explicit Light restores original artwork');
manual.choose('dark');
assert.equal(manual.color.content, '#191918');
assert(manual.labels.every(label => label.textContent === 'Dark'), 'Desktop and mobile controls stay synchronized');
assert.equal(manual.choices.filter(choice => choice.attributes['aria-checked'] === 'true').length, 2, 'Each control exposes exactly one checked choice');
assert.equal(page({saved:manual.storage.get('handbook-theme')}).root.dataset.theme, 'dark', 'Preference survives navigation');
manual.storage.set('handbook-theme', 'light');
manual.events.pageshow();
assert.equal(manual.root.dataset.theme, 'light', 'Back cache picks up the current preference');
manual.storage.set('handbook-theme', 'dark');
manual.events.storage({key:'handbook-theme'});
assert.equal(manual.root.dataset.theme, 'dark', 'Other tabs update the current page');
manual.storage.clear();
manual.events.storage({key:null});
assert.equal(manual.labels[0].textContent, 'System', 'Cleared storage restores system mode');
assert.equal(page({saved:'invalid',dark:true}).root.dataset.theme, 'dark', 'Invalid saved values fall back to system');
const blocked = page({blocked:true});
blocked.choose('dark');
blocked.events.pageshow();
assert.equal(blocked.root.dataset.theme, 'dark', 'Controls work with blocked storage');

const output = process.argv[2];
if (output) {
for (const pagePath of await hostedHtmlPages(output)) {
  const path = relative(output, pagePath);
  const gallery = path === 'index.html';
  const html = await readFile(pagePath, 'utf8');
  validateSiteTheme(html, gallery);
  for (const broken of [html.replace('src="/theme.js"', 'src="/missing.js"'), html.replace('href="/theme.css"', 'href="/missing.css"'), html.replace('data-theme-trigger', 'missing-trigger')]) {
    assert.throws(() => validateSiteTheme(broken, gallery), /Site lacks/, `${path}: missing shared theme surface`);
  }
}
}
// A future handbook, with an arbitrary route and illustration class, must receive
// the same controls and image styling without being named in build code.
const futureReader = '<!doctype html><html><head><meta name="color-scheme" content="light"><link rel="stylesheet" href="/production-ai-engineering/styles.css"></head><body><header class="mobile-bar"><div class="mobile-actions"></div></header><aside><div class="sidebar-meta"></div></aside><main id="main-content"><h1>Future handbook</h1><figure class="future-illustration" data-artwork-role="chapter" data-artwork-paired="true"><picture><source data-dark-artwork srcset="dark.png" media="screen and (prefers-color-scheme: dark)" width="1024" height="1024"><img src="illustration.png" alt="Original engraving"></picture></figure></main></body></html>';
const temporary = await mkdtemp(join(tmpdir(), 'handbook-theme-contract-'));
try {
  const futureDirectory = join(temporary, 'future-handbook', 'reader');
  await mkdir(futureDirectory, {recursive:true});
  const futurePath = join(futureDirectory, 'index.html');
  await writeFile(join(temporary, 'index.html'), '<html><head><meta name="color-scheme" content="light"></head><body><div class="gallery-rule"></div></body></html>');
  await writeFile(futurePath, futureReader);
  assert.equal((await finalizeSiteThemes(temporary)).length, 2, 'New nested reader is automatically discovered');
  const themed = await readFile(futurePath, 'utf8');
  validateSiteTheme(themed);
  validateSiteTheme(themed.replace('alt="Original engraving"', 'alt="value > threshold and style=\'filter:invert(1)\'"'), false);
  validateSiteTheme(themed.replace('</head>', '<script>const sample = "<img style=\'filter:invert(1)\'>";</script></head>'));
  assert.equal(addSiteTheme(themed), themed, 'Repeated finalization cannot duplicate controls');
  assert(themed.includes('src="illustration.png"') && themed.includes('srcset="dark.png"'), 'Light and dark art remain separate frozen inputs');
  await finalizeSiteThemes(temporary);
  assert.equal(await readFile(futurePath, 'utf8'), themed);
  for (const [name, broken, expected] of [
    ['missing dark counterpart', futureReader.replace(/<source[^>]*>/, ''), /paired dark source/],
    ['dark source used for print', futureReader.replace('screen and (prefers-color-scheme: dark)', '(prefers-color-scheme: dark)'), /screen-only/],
    ['missing pair marker', futureReader.replace('data-artwork-paired="true"', ''), /paired dark source/],
    ['same asset in both appearances', futureReader.replace('srcset="dark.png"','srcset="illustration.png"'), /distinct artwork/],
    ['missing image styling scope', futureReader.replace('id="main-content"', 'id="other"'), /main-content/],
    ['image outside figure', futureReader.replace(/<figure[^>]*>/, '').replace('</figure>', '').replace(/<source[^>]*>/, ''), /inside a figure/],
    ['local inversion', futureReader.replace('<img ', '<img style="filter:invert(1)" '), /local theme override/],
    ['quoted delimiter before image effect', futureReader.replace('alt="Original engraving"', 'alt="value > threshold" style="filter:invert(1)"'), /local theme override on img/],
    ['quoted delimiter before wrapper effect', futureReader.replace('<img ', '<picture title=\'value > threshold\' style = \'filter:invert(1)\'><img ').replace('</figure>', '</picture></figure>'), /local theme override on picture/],
    ['quoted delimiter before main effect', futureReader.replace('<main id=', '<main title="value > threshold" style="filter:invert(1)" id='), /local theme override on main/],
    ['local edge mask', futureReader.replace('<figure ', '<figure style="mask-image:linear-gradient(black,transparent)" '), /local theme override/],
    ['local figure clipping', futureReader.replace('<figure ', '<figure style="clip-path:inset(20%)" '), /local theme override/],
    ['local image clipping', futureReader.replace('<img ', '<img style="clip-path:circle(30%)" '), /local theme override/],
    ['wrapper inversion', futureReader.replace('<img ', '<picture style="filter:invert(1)"><img ').replace('</figure>', '</picture></figure>'), /local theme override on picture/],
    ['wrapper clipping', futureReader.replace('<img ', '<div style="clip-path:inset(20%)"><img ').replace('</figure>', '</div></figure>'), /local theme override on div/],
    ['main inversion', futureReader.replace('<main id=', '<main style="filter:invert(1)" id='), /local theme override on main/],
    ['body inversion', futureReader.replace('<body>', '<body style="filter:invert(1)">'), /local theme override on body/],
    ['html clipping', futureReader.replace('<html>', '<html style="clip-path:inset(20%)">'), /local theme override on html/],
    ['missing mobile surface', futureReader.replace('class="mobile-actions"', 'class="other"'), /Site lacks/],
    ['partial theme assets', themed.replace('href="/theme.css"', 'href="/other.css"'), /Site lacks/],
  ]) {
    await writeFile(futurePath, broken);
    await assert.rejects(() => finalizeSiteThemes(temporary), expected, name);
  }
} finally { await rm(temporary, {recursive:true, force:true}); }
console.log('Future reader discovery passed; missing controls, image containers, and local inversion are rejected.');
console.log('Shared appearance passed: system/manual choices, navigation, cache return, cross-tab changes, blocked storage, and all published pages.');
