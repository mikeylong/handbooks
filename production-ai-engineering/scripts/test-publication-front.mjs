import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePublicationFront, validateGalleryPublications} from './publication-front.mjs';
const book = new URL('../books/ai-evaluation/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('release-manifest.json', book)));
const publication = JSON.parse(await readFile(new URL('publication.json', book)));
const edition = {...publication, ...manifest, pdfUrl:manifest.pdf.split('/').pop()};
const html = await readFile(new URL('reader/index.html', book), 'utf8');
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

assert.throws(()=>validateGalleryPublications('<a class="handbook-card-link" href="/new-book/">New book</a>', ['/ai-evaluation/']), /lacks publication-front validation/);
console.log('An unvalidated new gallery title is also rejected.');
