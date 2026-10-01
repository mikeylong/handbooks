import { validatePublicationFront } from "./publication-front.mjs";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "output/site");
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
const edition = JSON.parse(await readFile(resolve(root, "site/production-ai-engineering.json"), "utf8"));
if (edition.pdfPath !== pdfPath || edition.version !== version || edition.pdfSha256 !== expectedHash
  || !Number.isSafeInteger(edition.pdfPages) || edition.pdfPages < 1) {
  throw new Error("Site edition metadata does not match the published PDF");
}
const coverBytes = await readFile(resolve(root, "site/assets/production-ai-engineering-cover.png"));
if (createHash("sha256").update(coverBytes).digest("hex") !== edition.coverSha256) {
  throw new Error("Cover thumbnail does not match the reviewed edition");
}
const pages = edition.pdfPages;
const book = await readFile(resolve(root, "handbook/index.html"), "utf8");
if (!book.includes(`../${pdfPath}`) || !book.includes(`${pages} pages`)) {
  throw new Error("Handbook download metadata does not match the published edition");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "handbook/assets"), resolve(output, "production-ai-engineering/assets"), { recursive: true });
await cp(resolve(root, "site/assets"), resolve(output, "assets"), { recursive: true });
for (const name of ["styles.css", "app.js"]) {
  await cp(resolve(root, `handbook/${name}`), resolve(output, `production-ai-engineering/${name}`));
}
await cp(resolve(root, "site/gallery.css"), resolve(output, "gallery.css"));
await cp(resolve(root, "site/navigation.js"), resolve(output, "navigation.js"));
await mkdir(resolve(output, "output/pdf"), { recursive: true });
await cp(resolve(root, pdfPath), resolve(output, pdfPath));

const evaluationRoot = resolve(root, "books/ai-evaluation");
const evaluation = JSON.parse(await readFile(resolve(evaluationRoot, "release-manifest.json"), "utf8"));
const evaluationPdf = await readFile(resolve(evaluationRoot, evaluation.pdf));
if (createHash("sha256").update(evaluationPdf).digest("hex") !== evaluation.sha256) throw new Error("Evaluation PDF checksum mismatch");
await cp(resolve(evaluationRoot, "reader"), resolve(output, "ai-evaluation"), {recursive:true});
const hostedEvaluationPdf = await readFile(resolve(output, "ai-evaluation", evaluation.pdf.split("/").pop()));
if (createHash("sha256").update(hostedEvaluationPdf).digest("hex") !== evaluation.sha256) throw new Error("Evaluation reader download mismatch");

const readerBody = book.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1];
const readerScript = book.match(/<script src="([^"]+)" defer><\/script>/)?.[1];
if (!readerBody || !readerScript) throw new Error("Handbook reader markup is missing");
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
const gallery = (await readFile(resolve(root, "site/index.html"), "utf8"))
  .replaceAll("{{VERSION}}", version).replaceAll("{{PAGE_COUNT}}", String(pages))
  .replace("{{READER_SCRIPT}}", `<script src="/production-ai-engineering/${readerScript}" defer></script>`)
  .replace("{{READER}}", `<div class="handbook-reader" id="book-top">${reader}</div>`);
const hostedBook = gallery
  .replace('class="handbooks-gallery"', 'class="handbooks-reader"')
  .replace("<title>Handbooks · Michael Long</title>", "<title>Production AI Engineering · Michael Long</title>")
  .replace('href="https://handbooks.mikelong.ai/"', 'href="https://handbooks.mikelong.ai/production-ai-engineering/"');
const evaluationPublication = JSON.parse(await readFile(resolve(evaluationRoot, "publication.json"), "utf8"));
const evaluationHtml = await readFile(resolve(output, "ai-evaluation/index.html"), "utf8");
validatePublicationFront(evaluationHtml, {...evaluationPublication, ...evaluation, pdfUrl:evaluation.pdf.split("/").pop()});
const productionReview = {
  at:book.match(/data-release-at="([^"]+)"/)?.[1],
  timeZone:book.match(/data-release-time-zone="([^"]+)"/)?.[1],
  rrule:book.match(/data-release-rrule="([^"]+)"/)?.[1],
};
validatePublicationFront(hostedBook, {title:"Production AI Engineering", author:"Michael Long", authorSite:"https://surfaces.systems", repository:"https://github.com/mikeylong/production-ai-engineering-book", releaseUrl:"https://github.com/mikeylong/production-ai-engineering-book/releases", date:pdfPath.match(/(\d{4}-\d{2}-\d{2})\.pdf$/)?.[1], version, pages, pdfUrl:"/"+pdfPath, review:productionReview});
await writeFile(resolve(output, "index.html"), gallery);
await writeFile(resolve(output, "production-ai-engineering/index.html"), hostedBook);
await writeFile(resolve(output, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://handbooks.mikelong.ai/sitemap.xml\n");
await writeFile(resolve(output, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://handbooks.mikelong.ai/</loc></url><url><loc>https://handbooks.mikelong.ai/production-ai-engineering/</loc></url><url><loc>https://handbooks.mikelong.ai/ai-evaluation/</loc></url></urlset>\n');
console.log(`Built ${output}: gallery + Production AI Engineering ${version}, ${pages} pages`);
