import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderBoundPrompts} from './prompt-blocks.mjs';

const block = '<div class="table-scroll" tabindex="0"><table><tr><th scope="col"><p>TOOL / RECREATE THE SCREEN</p></th></tr><tr><td><p>Keep the <b>selected</b> values.<br>Use the supplied assets.</p></td></tr></table></div>';
const dataTable = '<div class="table-scroll" tabindex="0"><table><tr><th scope="col"><p>TOOL / ORDINARY DATA</p></th></tr><tr><td><p>Unbound content.</p></td></tr></table></div>';
const sha256 = createHash('sha256').update(block).digest('hex');
const manifest = {schemaVersion: 1, readerSha256: 'reader', prompts: [{title: 'TOOL / RECREATE THE SCREEN', sha256, placements: 2}]};
const rendered = renderBoundPrompts(block + dataTable + block, manifest, 'reader');
assert.equal((rendered.match(/class="reader-prompt"/g) || []).length, 2);
assert.equal((rendered.match(/Keep the <b>selected<\/b> values.<br>Use the supplied assets./g) || []).length, 2);
assert.ok(rendered.includes(dataTable));
assert.throws(() => renderBoundPrompts(block, manifest, 'reader'), /placement/);
assert.throws(() => renderBoundPrompts(block + block, manifest, 'changed reader'), /Stale/);
assert.throws(() => renderBoundPrompts(block.replace('supplied', 'changed') + block, manifest, 'reader'), /placement/);
assert.throws(() => renderBoundPrompts(block + block, {...manifest, prompts: [...manifest.prompts, ...manifest.prompts]}, 'reader'), /Invalid/);
console.log('Prompt rendering preserves content and ordinary tables; stale bindings fail closed');
