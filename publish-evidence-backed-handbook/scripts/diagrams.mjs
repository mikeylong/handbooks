import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {digest, safePath} from './reader-paths.mjs';
const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
// Screenshot assets have their own frozen manifest and renderer. Accept only
// that renderer's complete semantic contract, never a generic image figure.
function isScreenshotFigure(figure) {
  const tag=figure.match(/^<figure\b[^>]*>/i)?.[0]??'';
  const attr=(html,name)=>html.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
  const screenshot=(attr(tag,'class')??'').split(/\s+/).includes('reader-screenshot');
  const id=attr(tag,'data-screenshot-figure');
  if(!screenshot && id===undefined)return false;
  const images=[...figure.matchAll(/<img\b[^>]*>/gi)].map(([image])=>image);
  if(!screenshot || !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(id??'') || attr(tag,'id')!=='figure-'+id || !images.length || !/<figcaption\b[^>]*>[\s\S]*\S[\s\S]*<\/figcaption>/i.test(figure))throw Error('Invalid screenshot figure contract');
  for(const image of images) {
    if(!attr(image,'alt')?.trim() || !/^\/[a-z0-9-]+\/editions\/v\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?\/assets\/screenshots\/[^/?#]+\.(?:png|jpe?g)$/.test(attr(image,'src')??''))throw Error('Invalid screenshot figure asset');
  }
  return true;
}
export function validateDiagram(definition) {
  if (!definition || !['sequence','branch'].includes(definition.kind) || !definition.title || !Array.isArray(definition.nodes) || !definition.nodes.length || !Array.isArray(definition.edges)) throw Error('Invalid semantic diagram');
  const ids = new Set();
  for (const node of definition.nodes) {
    if (!node.id || ids.has(node.id) || !node.label) throw Error('Invalid or duplicate diagram node');
    ids.add(node.id);
  }
  const edges = new Set();
  for (const edge of definition.edges) {
    const key = edge.from + ':' + edge.to;
    if (!ids.has(edge.from) || !ids.has(edge.to) || edges.has(key)) throw Error('Invalid or duplicate diagram edge');
    edges.add(key);
  }
  if (definition.kind === 'sequence') {
    for (let i=1;i<definition.nodes.length;i++) if (!edges.has(definition.nodes[i-1].id+':'+definition.nodes[i].id)) throw Error('Sequence lacks ordered edge');
  } else {
    for (const node of definition.nodes.slice(1)) if (!edges.has(definition.nodes[0].id+':'+node.id)) throw Error('Branch lacks source edge');
  }
}
export function renderDiagram(definition) {
  validateDiagram(definition);
  const card = node => `<li data-diagram-node="${escape(node.id)}"><strong>${escape(node.label)}</strong>${node.detail ? `<span>${escape(node.detail)}</span>` : ''}</li>`;
  const nodeList = definition.kind === 'sequence'
    ? `<ol class="diagram-sequence">${definition.nodes.map(card).join('')}</ol>`
    : `<div class="diagram-source" data-diagram-node="${escape(definition.nodes[0].id)}"><strong>${escape(definition.nodes[0].label)}</strong><span>${escape(definition.nodes[0].detail ?? '')}</span></div><p class="diagram-branch-label">Branches to:</p><ul class="diagram-branches">${definition.nodes.slice(1).map(card).join('')}</ul>`;
  const labels = new Map(definition.nodes.map(n=>[n.id,n.label]));
  const edges = definition.edges.map(edge=>`<li data-diagram-from="${escape(edge.from)}" data-diagram-to="${escape(edge.to)}">${escape(labels.get(edge.from))} → ${escape(labels.get(edge.to))}${edge.feedback ? ' (feedback)' : ''}</li>`).join('');
  return `<div class="semantic-diagram" role="group" aria-label="${escape(definition.title)}">${nodeList}${definition.note ? `<p class="diagram-note">${escape(definition.note)}</p>` : ''}<details class="diagram-relationships"><summary>Diagram relationships</summary><ul>${edges}</ul></details></div>`;
}
export async function installDiagrams(source, html, approvedPackage) {
  let manifest;
  try { manifest = JSON.parse(await readFile(resolve(source,'diagram-bindings.json'),'utf8')); }
  catch(error) {if(error.code==='ENOENT') {
    if ([...html.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].some(([figure]) => /<img\b/.test(figure) && !isScreenshotFigure(figure) && !/data-artwork-role="chapter"|class="[^"]*chapter-(?:art|figure)/.test(figure))) throw Error('Unmapped technical diagram: missing diagram-bindings.json');
    return html;
  } throw error;}
  if(manifest.schemaVersion!==1 || !Array.isArray(manifest.diagrams)) throw Error('Invalid diagram bindings');
  const mappings=new Map();
  for(const binding of manifest.diagrams) {
    if(mappings.has(binding.asset) || approvedPackage.files[binding.asset]!==binding.assetSha256) throw Error('Stale or duplicate diagram asset binding');
    if(digest(await readFile(safePath(source,binding.asset)))!==binding.assetSha256) throw Error('Diagram asset checksum mismatch');
    const bytes=await readFile(safePath(source,binding.definition));
    if(digest(bytes)!==binding.definitionSha256) throw Error('Stale semantic diagram binding');
    const definition=JSON.parse(bytes);validateDiagram(definition);
    mappings.set(binding.asset.slice(approvedPackage.readerDirectory.length+1), {binding,definition,count:0});
  }
  const result=html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi,figure=>{
    if(isScreenshotFigure(figure))return figure;
    const path=figure.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
    const mapping=mappings.get(path);
    if(!mapping) {
      if(path && !/data-artwork-role="chapter"|class="[^\"]*chapter-(?:art|figure)/.test(figure)) throw Error('Unmapped technical diagram: '+path);
      return figure;
    }
    mapping.count++;
    return `<figure data-diagram-rendered="true">${renderDiagram(mapping.definition)}<div class="diagram-print">${figure.replace(/^<figure\b[^>]*>|<\/figure>$/g,'')}</div></figure>`;
  });
  for(const {binding,count} of mappings.values()) if(count!==binding.placements) throw Error('Diagram placement count mismatch');
  return result;
}
