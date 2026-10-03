import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json')));
function check(headers) {
  for (const slug of ['production-ai-engineering','ai-evaluation','ai-consulting']) {
    const book = JSON.parse(fs.readFileSync(path.join(root, slug, 'pdf-variants.json')));
    for (const variant of book.variants) {
      const rule = headers.find(rule => rule.source === variant.publicUrl);
      assert.equal(rule?.headers.find(h => h.key.toLowerCase() === 'content-disposition')?.value,
        `attachment; filename="${variant.downloadFilename}"`, `Hosted saved filename differs for ${variant.publicUrl}`);
    }
  }
}
check(config.headers);
const missing = structuredClone(config.headers);missing.splice(1,1);assert.throws(() => check(missing));
const stale = structuredClone(config.headers);stale[1].headers[0].value = 'inline; filename="old.pdf"';assert.throws(() => check(stale));
console.log('Hosted PDF headers match all six approved download identities; missing and stale filenames are rejected.');
