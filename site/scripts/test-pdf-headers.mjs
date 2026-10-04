import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
const links = new Map();
function discover(folder) {
  for (const entry of fs.readdirSync(folder, {withFileTypes:true})) {
    const file = path.join(folder,entry.name);
    if (entry.isDirectory()) discover(file);
    else if (entry.name.endsWith('.html')) {
      for (const [tag] of fs.readFileSync(file,'utf8').matchAll(/<a\b[^>]*\bdata-pdf-theme="[^"]+"[^>]*>/g)) {
        const href = tag.match(/\bhref="([^"]+)"/)?.[1];
        const filename = tag.match(/\bdownload="([^"]+)"/)?.[1];
        assert.ok(href && filename, `Missing PDF identity in ${file}`);
        if (links.has(href)) assert.equal(links.get(href),filename,`Conflicting filename for ${href}`);
        links.set(href,filename);
      }
    }
  }
}
discover(process.env.HANDBOOK_SITE_OUTPUT || path.join(root,'site/output/site'));
assert.ok(links.size >= 6, 'Build the site before validating its hosted download headers');
function check(headers) {
  for (const [href,filename] of links) {
    const rule = headers.find(rule => rule.source === href);
    assert.equal(rule?.headers.find(h => h.key.toLowerCase() === 'content-disposition')?.value,
      `attachment; filename="${filename}"`, `Hosted saved filename differs for ${href}`);
  }
}
check(config.headers);
const pdfRule = config.headers.findIndex(rule=>rule.source===links.keys().next().value);
const missing = structuredClone(config.headers);missing.splice(pdfRule,1);assert.throws(() => check(missing));
const stale = structuredClone(config.headers);stale[pdfRule].headers[0].value = 'inline; filename="old.pdf"';assert.throws(() => check(stale));
console.log(`Hosted PDF headers match all ${links.size} emitted download routes; missing and stale filenames are rejected.`);

const markdown = config.headers.find(rule=>rule.source==="/:book/editions/:edition/:file.md");
assert.equal(markdown?.headers.find(h=>h.key==="Content-Type")?.value,"text/markdown; charset=utf-8");
assert.equal(markdown?.headers.find(h=>h.key==="Content-Disposition")?.value,"attachment");
console.log("Future Markdown routes have UTF-8 content type and attachment headers.");
