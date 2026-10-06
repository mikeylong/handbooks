import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const output=process.env.HANDBOOK_SITE_OUTPUT || new URL('../output/site/',import.meta.url).pathname;
const publications=resolve(output,'../publications');
import {removeSidebarPublication, removePublicationReview, validatePublicationFront, validateGalleryPublications, validateReaderNavigation, validateReaderBodyStart} from './publication-front.mjs';
import {renderGalleryCover, validateGalleryCover, sortGalleryCards} from './gallery-covers.mjs';
const manifest=JSON.parse(await readFile(resolve(publications,'ai-evaluation.json'),'utf8'));
const publication=manifest;
const edition=manifest;
const html = await readFile(resolve(output,'ai-evaluation/index.html'), 'utf8');
assert.equal(validatePublicationFront(html, edition).status, 'passed');
// Scheduled and unscheduled legacy covers lose only the review section.
const legacyPanels = [
 '<section class="release-window site-only" data-release-window data-release-at="2026-10-12T16:00:00.000Z"><div><p>Next version review</p></div><section><span data-countdown-days>07</span></section><p>Site and PDF updates publish together after manual review.</p></section>',
 '<section class="release-window site-only" data-review-state="unscheduled"><p>Next version review</p><p>The next review has not been scheduled.</p></section>',
];
assert.equal(removePublicationReview(html), html, 'Removal is idempotent for clean readers');
const internalReview = JSON.stringify(edition.review);
for (const panel of legacyPanels) {
 const legacy = html.replace('<nav class="cover-actions', panel+'<nav class="cover-actions');
 assert.notEqual(legacy, html, 'Legacy panel fixture must change the reader');
 assert.throws(()=>validatePublicationFront(legacy, edition), /noPublicReviewPanel/);
 const cleaned = removePublicationReview(legacy);
 assert.equal(cleaned, html, 'Only legacy review chrome is removed, including nested sections');
 validatePublicationFront(cleaned, edition);
 validatePublicationFront(cleaned, {...edition, review:null});
 assert.equal(removePublicationReview(cleaned), cleaned);
}
assert.equal(JSON.stringify(edition.review), internalReview, 'Internal review metadata is preserved');
const duplicatePublication='<div class="sidebar-publication"><p class="sidebar-author">Repeated credit</p><div><p class="sidebar-edition">Old edition</p></div></div>';
const duplicateSidebar=html.replace('<div class="sidebar-meta">','<div class="sidebar-meta">'+duplicatePublication);
assert.notEqual(duplicateSidebar,html);
assert.throws(()=>validatePublicationFront(duplicateSidebar,edition),/noSidebarPublication/);
assert.equal(removeSidebarPublication(duplicateSidebar),html,'Remove sidebar metadata only, preserving cover credit and edition links');
assert.equal(removeSidebarPublication(html),html,'Sidebar cleanup is idempotent');

const repeated = html.replace('<nav class="cover-actions', legacyPanels.join('')+'<nav class="cover-actions');
assert.equal(removePublicationReview(repeated), html, 'All legacy panels are removed');
for (const hook of ['data-release-window', 'data-countdown-seconds', 'data-review-state="unscheduled"']) {
 assert.throws(()=>validatePublicationFront(html.replace('<nav class="cover-actions', `<div ${hook}></div><nav class="cover-actions`), edition), /noPublicReviewPanel/);
}
const regressions = [
 ['standalone printing note', html.replace('</main>','<p class="pdf-print-guidance">Use the Daytime version for printing.</p></main>'), /Standalone PDF printing guidance/],
 ['missing author', html.replace('class="cover-credit"', 'class="removed-credit"'), /authorCredit/],
 ['stale edition', html.replaceAll('Version 1.0.0', 'Version 1.4.0'), /edition/],
 ['wrong PDF page count', html.replaceAll('100 pages', '105 pages'), /pdfAction/],
 ['broken Explore action', html.replace('href="#contents">Explore the handbook', 'href="#missing">Explore the handbook'), /exploreAction/],
 ['wrong release link', html.replaceAll(publication.releaseUrl, 'https://example.invalid/other-release'), /coverEditionLink/],
 ['wrong cover title', html.replace('<h1 id="cover-title">AI Evaluation Field Guide</h1>', '<h1 id="cover-title">Other handbook</h1>'), /title/],
 ['wrong visible page count', html.replace(/(<span(?: class="download-metadata")?>)100 pages/g, (_,open)=>open+'105 pages'), /pdfAction/],
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
const gallery = await readFile(resolve(output,'index.html'), 'utf8');
const galleryPaths=[...gallery.matchAll(/class="handbook-card-link" href="([^"]+)"/g)].map(match=>match[1]);
validateGalleryPublications(gallery,galleryPaths);
const galleryEditions=await Promise.all(galleryPaths.map(path=>readFile(resolve(publications,path.slice(1,-1)+'.json'),'utf8').then(JSON.parse)));
const template=await readFile(new URL('../site/index.html',import.meta.url),'utf8');
const templatePaths=[...template.matchAll(/class="handbook-card-link" href="([^"]+)"/g)].map(match=>match[1]);
const expectedOrder=[...galleryEditions].sort((a,b)=>b.date.localeCompare(a.date)||templatePaths.indexOf(`/${a.id}/`)-templatePaths.indexOf(`/${b.id}/`)).map(edition=>`/${edition.id}/`);
assert.deepEqual(galleryPaths,expectedOrder,'Built gallery follows published edition dates, newest first, preserving same-day template order');
assert.equal(sortGalleryCards(gallery,galleryEditions),gallery,'Sorting an ordered gallery preserves every byte');
const futureEditions=galleryEditions.map(edition=>({...edition,date:edition.id==='production-ai-engineering'?'2099-01-01':edition.date}));
const futureGallery=sortGalleryCards(gallery,futureEditions);
assert.equal([...futureGallery.matchAll(/class="handbook-card-link" href="([^"]+)"/g)][0][1],'/production-ai-engineering/','A future content edition moves its card first');
for(const path of galleryPaths)assert(futureGallery.includes([...gallery.matchAll(/<article\b[^>]*class="handbook-card"[^>]*>[\s\S]*?<\/article>/g)].find(([card])=>card.includes(`href="${path}"`))[0]),'Sorting preserves exact card markup');
assert.equal(sortGalleryCards(gallery,galleryEditions.map(edition=>({...edition,date:'2099-01-01'}))),gallery,'Same-day editions retain their existing order');
for(const date of [undefined,'October 5, 2026','2026-02-30'])assert.throws(()=>sortGalleryCards(gallery,galleryEditions.map((edition,index)=>index?edition:{...edition,date})),/Gallery edition date is invalid/);
console.log('Gallery follows published edition dates; future editions reorder and same-day cards stay stable.');

for(const leaked of ['<span data-pdf-downloads></span>','<a data-markdown-download href="/book.md">Markdown</a>','<a download href="/book.pdf">PDF</a>']){
 assert.throws(()=>validateGalleryPublications(gallery.replace('</main>',leaked+'</main>'),galleryPaths),/without download controls/);
}
assert.throws(()=>validateGalleryPublications(gallery.replace('</main>','<p>Use the Daytime version for printing.</p></main>'),galleryPaths),/Standalone PDF printing guidance/);
console.log('Gallery download controls and standalone printing notes are rejected; reader downloads remain available.');
for (const path of ['ai-evaluation', 'production-ai-engineering', 'ai-consulting', 'claude-design']) {
 const reader = await readFile(resolve(output,path,'index.html'), 'utf8');
 assert.doesNotMatch(reader, /release-window|data-countdown-|Next version review|The next review has not been scheduled\./, `${path}: public review chrome must be omitted`);
 validateGalleryCover(gallery, `/${path}/`, reader);
 assert.doesNotMatch(reader,/pdf-print-guidance|Use the Daytime version for printing[.]/,`${path}: standalone printing note must be omitted`);
 const metadata=JSON.parse(await readFile(resolve(publications,path+'.json'),'utf8'));
 for(const link of reader.matchAll(/<a\b[^>]*(?:data-pdf-theme|data-markdown-download)[^>]*>/g)){
  const href=link[0].match(/href="([^"]+)"/)?.[1];
  assert(href?.startsWith(`/${path}/editions/v${metadata.version}/`),`${path}: current download must use its edition route`);
 }
 for(const variant of metadata.pdfVariants){
  const emitted=await readFile(resolve(output,variant.publicUrl.slice(1)));
  assert.equal(emitted.length,variant.bytes,`${path}: unchanged edition PDF bytes`);
 }
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
const {validatePrintGuidanceAbsent}=await import('../../publish-evidence-backed-handbook/scripts/pdf-downloads.mjs');
const retained=JSON.parse(await readFile(new URL('../retained-releases.json',import.meta.url),'utf8'));
const retainedHtml=new Set(retained.routes.filter(route=>route.url.endsWith('.html')).map(route=>route.url));
for(const path of await hostedHtmlPages(output)){
 const page=await readFile(path,'utf8');
 if(!retainedHtml.has('/'+relative(output,path)))validatePrintGuidanceAbsent(page);
 assert(!/handbooks\.mikelong\.(?:ai|design)/.test(page),'Legacy host remains in '+path);
 const canonical=page.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
 assert(canonical?.[1].startsWith('https://handbooks.surfaces.systems/'),'Canonical host mismatch: '+path);
}
assert(!/handbooks\.mikelong\.(?:ai|design)/.test(await readFile(resolve(output,'sitemap.xml'),'utf8')));
console.log('All canonical HTML links and sitemap entries use Surfaces.');

// Edition downloads resolve even when the host normalizes away the trailing slash.
const catalog=JSON.parse(await readFile(new URL('../../catalog.json',import.meta.url),'utf8'));
for(const book of catalog.books.filter(book=>book.status==='published')){
 const editionPath=new URL(book.editionUrl).pathname;
 const page=await readFile(resolve(output,editionPath.slice(1),'index.html'),'utf8');
 const download=page.match(/href="([^"]+)" download/)[1];
 assert(download.startsWith(editionPath),'Edition download must use its explicit path');
 assert.equal(new URL(download,book.editionUrl).pathname,new URL(download,book.editionUrl.replace(/\/$/, '')).pathname);
}
