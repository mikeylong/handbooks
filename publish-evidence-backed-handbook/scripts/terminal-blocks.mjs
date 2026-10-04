import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Preserve frozen readers while giving explicitly bound shell blocks terminal semantics.
export function renderBoundTerminals(html, manifest, readerSha256) {
  if (manifest.schemaVersion !== 1 || manifest.readerSha256 !== readerSha256 || !Array.isArray(manifest.terminals)) throw Error('Stale terminal bindings');
  const bindings = new Map();
  for (const terminal of manifest.terminals) {
    if (!/^[a-f0-9]{64}$/.test(terminal.sha256) || bindings.has(terminal.sha256) || typeof terminal.body !== 'string' || !Number.isSafeInteger(terminal.placements) || terminal.placements < 1) throw Error('Invalid terminal binding');
    bindings.set(terminal.sha256, {...terminal, seen: 0});
  }
  const rendered = html.replace(/<aside class="reader-callout">[\s\S]*?<\/aside>/g, block => {
    const binding = bindings.get(digest(block));
    if (!binding) return block;
    if (block !== '<aside class="reader-callout"><p>' + escape(binding.body).replaceAll('\n', '<br>') + '</p></aside>') throw Error('Terminal source does not match frozen block');
    binding.seen++;
    return '<figure class="reader-code reader-terminal"><figcaption class="reader-code-heading"><span class="reader-code-label">Terminal</span></figcaption><pre><code class="language-sh">' + escape(binding.body) + '</code></pre></figure>';
  });
  for (const binding of bindings.values()) if (binding.seen !== binding.placements) throw Error('Missing or stale terminal placement');
  return rendered;
}

export async function installTerminalBlocks(source, html, approvedPackage) {
  let manifest;
  try { manifest = JSON.parse(await readFile(resolve(source, 'terminal-bindings.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return html; throw error; }
  return renderBoundTerminals(html, manifest, approvedPackage.files[approvedPackage.html]);
}
