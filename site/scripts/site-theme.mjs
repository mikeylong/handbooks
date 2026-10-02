import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';

function control(id) {
  return `<div class="theme-control"><button class="theme-trigger" type="button" data-theme-trigger aria-label="Appearance: System" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}"><svg class="theme-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg><span data-theme-label>System</span><svg class="theme-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" stroke-width="1.2"/></svg></button><div class="theme-menu" id="${id}" role="menu" aria-label="Appearance" hidden>${['system','light','dark'].map(value => `<button type="button" role="menuitemradio" data-theme-choice="${value}" aria-checked="${value === 'system'}" tabindex="-1"><span>${value[0].toUpperCase()+value.slice(1)}</span><span class="theme-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>`;
}
// Quoted attribute values may contain >, including ordinary image descriptions.
const tagSource = String.raw`<\/?[a-z](?:"[^"]*"|'[^']*'|[^'">])*>`;
function attributes(tag) {
  const values = new Map();
  const contents = tag.replace(/^<\/?[\w:-]+/, '').replace(/\/?\s*>$/, '');
  for (const match of contents.matchAll(/([^\s=<>/'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (!values.has(name)) values.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return values;
}

export function addSiteTheme(html, gallery = false) {
  if (html.includes('src="/theme.js"')) return html;
  return html
    .replace('<header class="mobile-bar"><a href="/">← All handbooks</a>', '<header class="mobile-bar"><a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
    .replace('<meta name="color-scheme" content="light">', '<meta name="color-scheme" content="light dark">')
    .replace('<head>', '<head><script src="/theme.js"></script>')
    .replace('</head>', '<link rel="stylesheet" href="/theme.css"></head>')
    .replace(gallery ? '<div class="gallery-rule"' : '<div class="sidebar-meta">', gallery ? `${control('appearance-gallery')}<div class="gallery-rule"` : `<div class="sidebar-meta">${control('appearance-desktop')}`)
    .replace('<div class="mobile-actions">', `<div class="mobile-actions">${control('appearance-mobile')}`);
}

export function validateSiteTheme(html, gallery = false) {
  if (!html.includes('<script src="/theme.js"></script>') || html.indexOf('/theme.js') > html.indexOf('rel="stylesheet"')
    || !html.includes('href="/theme.css"') || !html.includes('content="light dark"')
    || [...html.matchAll(/data-theme-trigger/g)].length !== (gallery ? 1 : 2)) {
    throw new Error('Site lacks shared appearance controls or theme initialization before paint');
  }
  if (!gallery) {
    for (const container of ['sidebar-meta', 'mobile-actions']) {
      const contents = html.match(new RegExp(`<div\\b[^>]*class="${container}"[^>]*>([\\s\\S]*?)</div>`))?.[1];
      if (!contents?.includes('data-theme-trigger')) throw new Error(`Site lacks ${container} appearance control`);
    }
    const ancestors = [];
    let mainFound = false;
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    // Raw-text elements can contain apparent tags that are not document nodes.
    const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(new RegExp(`(${tagSource.replace('[a-z]', '(script|style|textarea|title)\\b')})[\\s\\S]*?</\\2\\s*>`, 'gi'), '$1</$2>');
    const tags = markup.match(new RegExp(tagSource, 'gi')) ?? [];
    for (const tag of tags) {
      const name = tag.match(/^<\/?([a-z][\w:-]*)/i)[1].toLowerCase();
      if (tag.startsWith('</')) {
        const index = ancestors.findLastIndex(element => element.name === name);
        if (index >= 0) ancestors.length = index;
        continue;
      }
      const isMain = name === 'main' && attributes(tag).get('id') === 'main-content';
      if (isMain) mainFound = true;
      if (name === 'img' && ancestors.some(element => element.isMain)) {
        if (!ancestors.some(element => element.name === 'figure')) {
          throw new Error('Reader raster image must be inside a figure for shared dark styling');
        }
        for (const element of [...ancestors, {name, tag}]) {
          if (/(?:filter|(?:-webkit-)?mask[\w-]*|clip-path|mix-blend-mode|background[\w-]*)\s*:/i.test(attributes(element.tag).get('style') ?? '')) {
            throw new Error(`Reader image has a local theme override on ${element.name}`);
          }
        }
      }
      if (!voidTags.has(name)) ancestors.push({name, tag, isMain});
    }
    if (!mainFound) throw new Error('Reader lacks main-content for shared image styling');
  }
}

// Discover output pages rather than maintaining a second list of handbook titles.
export async function hostedHtmlPages(directory) {
  const pages = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await hostedHtmlPages(path));
    else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path);
  }
  return pages.sort();
}

export async function finalizeSiteThemes(output) {
  const pages = await hostedHtmlPages(output);
  for (const path of pages) {
    const gallery = relative(output, path) === 'index.html';
    const html = addSiteTheme(await readFile(path, 'utf8'), gallery);
    try { validateSiteTheme(html, gallery); }
    catch (error) { throw new Error(`${relative(output, path)}: ${error.message}`); }
    await writeFile(path, html);
  }
  return pages;
}
