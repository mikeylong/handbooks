import {validatePublicationFront} from './publication-front.mjs';
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "output/reader");
const readme = await readFile(resolve(root, "README.md"), "utf8");
const pdfPath = readme.match(/\[Read the book \(PDF\)\]\(\.\/(output\/pdf\/[^)]+)\)/)?.[1];
const version = readme.match(/\*\*Current release:\*\* Version ([\d.]+)/)?.[1];
const expectedHash = readme.match(/production-pdf-sha256: ([a-f0-9]{64})/)?.[1];
if (!pdfPath || !version || !expectedHash) throw new Error("Published release metadata is missing");
const pdfBytes = await readFile(resolve(root, pdfPath));
if (createHash("sha256").update(pdfBytes).digest("hex") !== expectedHash) {
  throw new Error("Published PDF checksum does not match README");
}
// The page count was measured from this exact published PDF with Poppler.
// Bind it to the artifact digest so a future edition cannot inherit a stale label.
const edition = JSON.parse(await readFile(resolve(root, "reader-edition.json"), "utf8"));
if (edition.pdfPath !== pdfPath || edition.version !== version || edition.pdfSha256 !== expectedHash
  || !Number.isSafeInteger(edition.pdfPages) || edition.pdfPages < 1) {
  throw new Error("Site edition metadata does not match the published PDF");
}
const pages = edition.pdfPages;
const book = await readFile(resolve(root, "handbook/index.html"), "utf8");
if (!book.includes(`../${pdfPath}`) || !book.includes(`${pages} pages`)) {
  throw new Error("Handbook download metadata does not match the published edition");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "handbook/assets"), resolve(output, "production-ai-engineering/assets"), { recursive: true });
for (const name of ["styles.css", "app.js"]) {
  await cp(resolve(root, `handbook/${name}`), resolve(output, `production-ai-engineering/${name}`));
}
await mkdir(resolve(output, "output/pdf"), { recursive: true });
await cp(resolve(root, pdfPath), resolve(output, pdfPath));

const readerBody = book.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1];
if (!readerBody) throw new Error("Handbook reader markup is missing");
const reader = readerBody
  .replace('<aside class="sidebar" aria-label="Handbook navigation">', '<aside class="sidebar" aria-label="Handbook navigation">\n<a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a>')
  .replace('<header class="mobile-bar">', '<header class="mobile-bar">\n<a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a>')
  .replace(/(href|src)="(?!#|\/|https?:|mailto:)([^"]+)"/g, (_, attribute, value) => {
    const url = new URL(value, "https://handbooks.mikelong.ai/production-ai-engineering/");
    return `${attribute}="${url.pathname}${url.search}${url.hash}"`;
  })
  .replace(/srcset="([^"]+)"/g, (_, value) => {
    const candidates = value.split(",").map((candidate) => {
      const [source, ...descriptor] = candidate.trim().split(/\s+/);
      const url = new URL(source, "https://handbooks.mikelong.ai/production-ai-engineering/");
      return [url.pathname + url.search + url.hash, ...descriptor].join(" ");
    });
    return `srcset="${candidates.join(", ")}"`;
  });
const hostedBook = book.replace(readerBody, reader)
  .replace(/(href|src)="(?!#|\/|https?:|mailto:)([^"]+)"/g, (_, attribute, value) => {
    const url = new URL(value, "https://handbooks.mikelong.ai/production-ai-engineering/");
    return `${attribute}="${url.pathname}${url.search}${url.hash}"`;
  })
  .replace("</head>", '<link rel="stylesheet" href="/gallery.css">\n<script src="/gallery-focus.js" defer></script>\n<link rel="canonical" href="https://handbooks.mikelong.ai/production-ai-engineering/">\n</head>');
const manifest=JSON.parse(await readFile(resolve(root,'release-manifest.json'),'utf8'));
const publication=JSON.parse(await readFile(resolve(root,'publication.json'),'utf8'));
if(manifest.pdf!==pdfPath || manifest.sha256!==expectedHash || manifest.version!==version || manifest.pages!==pages)throw Error('Reader release manifest does not match approved edition');
validatePublicationFront(hostedBook,{...publication,...manifest,pdfUrl:'/'+pdfPath});
await writeFile(resolve(output,'production-ai-engineering/index.html'),hostedBook);
console.log(`Built Production AI Engineering reader ${version}; PDF ${expectedHash}`);
