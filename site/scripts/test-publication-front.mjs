import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installPublicationReview, validatePublicationFront, validateGalleryPublications, validateReaderNavigation, validateReaderBodyStart} from './publication-front.mjs';
import {renderGalleryCover, validateGalleryCover} from './gallery-covers.mjs';
const manifest=JSON.parse(await readFile(new URL('../output/publications/ai-evaluation.json',import.meta.url),'utf8'));
const publication=manifest;
const edition=manifest;
const html = await readFile(new URL('../output/site/ai-evaluation/index.html', import.meta.url), 'utf8');
assert.equal(validatePublicationFront(html, edition).status, 'passed');
const unscheduled = installPublicationReview(html, null);
validatePublicationFront(unscheduled, {...edition, review: null});
const scheduled = installPublicationReview(unscheduled, edition.review);
validatePublicationFront(scheduled, edition);
assert.equal(installPublicationReview(scheduled, edition.review), scheduled);
const futureReview = {...edition.review, at: '2026-10-12T16:00:00.000Z', label: 'Monday, October 12, 2026 at 9:00 AM Pacific time'};
validatePublicationFront(installPublicationReview(scheduled, futureReview), {...edition, review: futureReview});
const staleLabel = {...futureReview, label: edition.review.label};
const refreshed = installPublicationReview(scheduled, staleLabel);
assert(refreshed.includes('Monday, October 12, 2026 at 9:00 AM Pacific time'));
validatePublicationFront(refreshed, {...edition, review: staleLabel});
assert.throws(() => validatePublicationFront(refreshed.replace('Monday, October 12, 2026', 'Monday, October 5, 2026'), {...edition, review: staleLabel}), /reviewState/);
const dstReview = {...futureReview, at: '2026-11-02T17:00:00.000Z'};
assert(installPublicationReview(scheduled, dstReview).includes('Monday, November 2, 2026 at 9:00 AM Pacific time'));
const easternReview = {...futureReview, timeZone: 'America/New_York'};
assert(installPublicationReview(scheduled, easternReview).includes('Monday, October 12, 2026 at 12:00 PM Eastern time'));
assert.throws(() => installPublicationReview(html, {...edition.review, at: 'invalid'}), /Incomplete publication review schedule/);
for (const hook of ['data-release-status', 'data-countdown-seconds', 'data-release-window ']) {
 assert.throws(() => validatePublicationFront(scheduled.replace(hook, 'removed-hook '), edition), /reviewState/);
}
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
for (const path of ['ai-evaluation', 'production-ai-engineering', 'ai-consulting', 'claude-design']) {
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
console.log('All hosted readers pass navigation parity; missing styles, local overrides, and broken return links are rejected.');
console.log('All hosted readers reject stray cover content between Contents and the first chapter.');
console.log('All gallery previews follow reader title, subtitle, credit, and edition; stale raster covers are rejected.');

// Every published HTML surface and sitemap uses the supported public host.
const {hostedHtmlPages}=await import('./site-theme.mjs');
for(const path of await hostedHtmlPages(new URL('../output/site/',import.meta.url).pathname)){
 const page=await readFile(path,'utf8');
 assert(!/handbooks\.mikelong\.(?:ai|design)/.test(page),'Legacy host remains in '+path);
 const canonical=page.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
 assert(canonical?.[1].startsWith('https://handbooks.surfaces.systems/'),'Canonical host mismatch: '+path);
}
assert(!/handbooks\.mikelong\.(?:ai|design)/.test(await readFile(new URL('../output/site/sitemap.xml',import.meta.url),'utf8')));
console.log('All canonical HTML links and sitemap entries use Surfaces.');

// Edition downloads resolve even when the host normalizes away the trailing slash.
const catalog=JSON.parse(await readFile(new URL('../../catalog.json',import.meta.url),'utf8'));
for(const book of catalog.books.filter(book=>book.status==='published')){
 const editionPath=new URL(book.editionUrl).pathname;
 const page=await readFile(new URL('../output/site'+editionPath+'index.html',import.meta.url),'utf8');
 const download=page.match(/href="([^"]+)" download/)[1];
 assert(download.startsWith(editionPath),'Edition download must use its explicit path');
 assert.equal(new URL(download,book.editionUrl).pathname,new URL(download,book.editionUrl.replace(/\/$/, '')).pathname);
}
