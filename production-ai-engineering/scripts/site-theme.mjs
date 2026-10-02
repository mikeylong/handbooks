import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';

const control = '<label class="theme-control"><span>Appearance</span><select data-theme-select aria-label="Appearance"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>';

export function addSiteTheme(html, gallery = false) {
  if (html.includes('src="/theme.js"')) return html;
  return html
    .replace('<header class="mobile-bar"><a href="/">← All handbooks</a>', '<header class="mobile-bar"><a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
    .replace('<meta name="color-scheme" content="light">', '<meta name="color-scheme" content="light dark">')
    .replace('<head>', '<head><script src="/theme.js"></script>')
    .replace('</head>', '<link rel="stylesheet" href="/theme.css"></head>')
    .replace(gallery ? '<div class="gallery-rule"' : '<div class="sidebar-meta">', gallery ? `${control}<div class="gallery-rule"` : `<div class="sidebar-meta">${control}`)
    .replace('<div class="mobile-actions">', `<div class="mobile-actions">${control}`);
}

export function validateSiteTheme(html, gallery = false) {
  if (!html.includes('<script src="/theme.js"></script>') || html.indexOf('/theme.js') > html.indexOf('rel="stylesheet"')
    || !html.includes('href="/theme.css"') || !html.includes('content="light dark"')
    || [...html.matchAll(/data-theme-select/g)].length !== (gallery ? 1 : 2)) {
    throw new Error('Site lacks shared appearance controls or theme initialization before paint');
  }
  if (!gallery) {
    for (const container of ['sidebar-meta', 'mobile-actions']) {
      const contents = html.match(new RegExp(`<div\\b[^>]*class="${container}"[^>]*>([\\s\\S]*?)</div>`))?.[1];
      if (!contents?.includes('data-theme-select')) throw new Error(`Site lacks ${container} appearance control`);
    }
    const main = html.match(/(<main\b[^>]*id=["']main-content["'][^>]*>)([\s\S]*?)<\/main>/);
    if (!main) throw new Error('Reader lacks main-content for shared image styling');
    const ancestors = [{name:'main', tag:main[1]}];
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const tags = main[2].replace(/<!--[\s\S]*?-->/g, '').match(/<\/?[a-z][^>]*>/gi) ?? [];
    for (const tag of tags) {
      const name = tag.match(/^<\/?([a-z][\w:-]*)/i)[1].toLowerCase();
      if (tag.startsWith('</')) {
        const index = ancestors.findLastIndex(element => element.name === name);
        if (index >= 0) ancestors.length = index;
        continue;
      }
      if (name === 'img') {
        if (!ancestors.some(element => element.name === 'figure')) {
          throw new Error('Reader raster image must be inside a figure for shared dark styling');
        }
        for (const element of [...ancestors, {name, tag}]) {
          if (/\bstyle=["'][^"']*(?:filter|(?:-webkit-)?mask[\w-]*|clip-path|mix-blend-mode|background[\w-]*)\s*:/i.test(element.tag)) {
            throw new Error(`Reader image has a local theme override on ${element.name}`);
          }
        }
      }
      if (!voidTags.has(name)) ancestors.push({name, tag});
    }
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
