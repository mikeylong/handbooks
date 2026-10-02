import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePublicationFront, validateGalleryPublications, validateReaderNavigation, validateReaderBodyStart} from './publication-front.mjs';
import {renderGalleryCover, validateGalleryCover} from './gallery-covers.mjs';
const book = new URL('../books/ai-evaluation/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('release-manifest.json', book)));
const publication = JSON.parse(await readFile(new URL('publication.json', book)));
const edition = {...publication, ...manifest, pdfUrl:manifest.pdf.split('/').pop()};
const html = await readFile(new URL('../output/site/ai-evaluation/index.html', import.meta.url), 'utf8');
assert.equal(validatePublicationFront(html, edition).status, 'passed');
const regressions = [
 ['missing author', html.replace('class="cover-credit"', 'class="removed-credit"'), /authorCredit/],
 ['stale edition', html.replaceAll('Version 1.0.0', 'Version 1.4.0'), /edition/],
 ['wrong PDF page count', html.replaceAll('100 pages', '105 pages'), /pdfAction/],
 ['broken Explore action', html.replace('href="#contents">Explore the handbook', 'href="#missing">Explore the handbook'), /exploreAction/],
 ['wrong release link', html.replaceAll(publication.releaseUrl, 'https://example.invalid/other-release'), /sidebarRelease/],
 ['wrong cover title', html.replace('<h1 id="cover-title">AI Evaluation Field Guide</h1>', '<h1 id="cover-title">Other handbook</h1>'), /title/],
 ['wrong visible page count', html.replace('<span>100 pages</span>', '<span>105 pages</span>'), /pdfAction/],
 ['missing review policy', html.replace('Site and PDF updates publish together after manual review.', ''), /reviewPolicy/],
];
for (const [name, broken, expected] of regressions) {
 assert.notEqual(broken, html, `Regression fixture did not change: ${name}`);
 assert.throws(()=>validatePublicationFront(broken, edition), expected, name);
}
console.log(`Publication front page passed; ${regressions.length} omissions or stale-copy regressions rejected.`);

assert.throws(()=>validateGalleryPublications('<script src="/gallery-focus.js" defer></script><a class="handbook-card-link" href="/new-book/">New book</a>', ['/ai-evaluation/']), /lacks publication-front validation/);
assert.throws(()=>validateGalleryPublications('<a class="handbook-card-link" href="/ai-evaluation/">Book</a>', ['/ai-evaluation/']), /lacks return-focus behavior/);
console.log('An unvalidated new gallery title is also rejected.');

// Exercise the actual hosted readers, including the original missing-class bug.
const gallery = await readFile(new URL('../output/site/index.html', import.meta.url), 'utf8');
for (const path of ['ai-evaluation', 'production-ai-engineering']) {
 const reader = await readFile(new URL(`../output/site/${path}/index.html`, import.meta.url), 'utf8');
 validateGalleryCover(gallery, `/${path}/`, reader);
 const preview = renderGalleryCover(reader);
 assert(!preview.includes('<a '), 'Cover credit must not create a nested link');
 for (const name of ['title', 'subtitle', 'credit', 'date']) {
  const changed = name === 'title'
   ? reader.replace(/(<h1 id="cover-title">)[^<]+/, '$1Future title')
   : reader.replace(new RegExp(`(<p class="cover-${name}">)[\\s\\S]*?</p>`), '$1Future edition detail</p>');
  assert.notEqual(changed, reader, `${path}: ${name} fixture changed`);
  assert.throws(() => validateGalleryCover(gallery, `/${path}/`, changed), /does not match/, `${path}: stale ${name}`);
  assert(renderGalleryCover(changed).includes(name === 'title' ? 'Future title' : 'Future edition detail'), `${path}: rebuild follows ${name}`);
 }
 assert.throws(() => validateGalleryCover(gallery.replace(preview, '<img src="/old-cover.png">'), `/${path}/`, reader), /does not match/, `${path}: old raster cover`);
 assert.equal(validateReaderNavigation(reader, path).status, 'passed');
 assert.equal(validateReaderBodyStart(reader, path).status, 'passed');
 for (const leaked of ['October 2026 | Version 1.0.0', 'Future PDF cover metadata']) {
  const broken = reader.replace('<section class="chapter', `<p>${leaked}</p><section class="chapter`);
  assert.notEqual(broken, reader, `Body-start fixture did not change: ${path}`);
  assert.throws(()=>validateReaderBodyStart(broken, path), /stray content between Contents/, `${path}: leaked cover text`);
 }
 for (const [name, broken, expected] of [
  ['unstyled return link', reader.replace('class="handbooks-return"', 'class="unstyled-return"'), /sidebarReturn/],
  ['missing shared stylesheet', reader.replace('href="/gallery.css"', 'href="/missing.css"'), /sharedNavigationStyles/],
  ['missing return focus behavior', reader.replace('src="/gallery-focus.js"', 'src="/missing.js"'), /galleryReturnFocus/],
  ['local font override', reader.replace('class="handbooks-return"', 'class="handbooks-return" style="font-size:1rem"'), /sidebarReturnInlineStyle/],
  ['broken gallery destination', reader.replace('class="handbooks-return" href="/"', 'class="handbooks-return" href="/wrong/"'), /sidebarReturn/],
 ]) {
  assert.notEqual(broken, reader, `Regression fixture did not change: ${path}: ${name}`);
  assert.throws(()=>validateReaderNavigation(broken, path), expected, `${path}: ${name}`);
 }
}
console.log('Both hosted readers pass navigation parity; missing styles, local overrides, and broken return links are rejected.');
console.log('Both hosted readers reject stray cover content between Contents and the first chapter.');
console.log('Both gallery previews follow reader title, subtitle, credit, and edition; stale raster covers are rejected.');
