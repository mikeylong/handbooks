import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest('hex');

// Bind legacy prompt tables to a frozen reader. Ordinary tables stay untouched.
export function renderBoundPrompts(html, manifest, readerSha256) {
  if (manifest.schemaVersion !== 1 || manifest.readerSha256 !== readerSha256 || !Array.isArray(manifest.prompts)) throw Error('Stale prompt bindings');
  const bindings = new Map();
  for (const prompt of manifest.prompts) {
    if (!/^[a-f0-9]{64}$/.test(prompt.sha256) || bindings.has(prompt.sha256) || !Number.isSafeInteger(prompt.placements) || prompt.placements < 1 || typeof prompt.title !== 'string') throw Error('Invalid prompt binding');
    bindings.set(prompt.sha256, {...prompt, seen: 0});
  }
  const rendered = html.replace(/<div class="table-scroll" tabindex="0"><table>[\s\S]*?<\/table><\/div>/g, block => {
    const binding = bindings.get(digest(block));
    if (!binding) return block;
    const rows = [...block.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(match => match[1]);
    const header = rows.shift()?.match(/^<th scope="col"><p>([^<]+)<\/p><\/th>$/);
    if (!header || header[1] !== binding.title || !rows.length || rows.some(row => !/^<td><p>[\s\S]*<\/p><\/td>$/.test(row) || (row.match(/<td>/g) || []).length !== 1)) throw Error('Invalid bound prompt table');
    binding.seen++;
    const body = rows.map(row => row.slice(4, -5)).join('');
    return '<figure class="reader-prompt"><figcaption class="reader-prompt-heading"><span class="reader-prompt-label">Prompt</span><span class="reader-prompt-title">' + header[1] + '</span></figcaption><div class="reader-prompt-body">' + body + '</div></figure>';
  });
  for (const binding of bindings.values()) if (binding.seen !== binding.placements) throw Error('Missing or stale prompt placement: ' + binding.title);
  return rendered;
}

export async function installPromptBlocks(source, html, approvedPackage) {
  let manifest;
  try { manifest = JSON.parse(await readFile(resolve(source, 'prompt-bindings.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return html; throw error; }
  return renderBoundPrompts(html, manifest, approvedPackage.files[approvedPackage.html]);
}
