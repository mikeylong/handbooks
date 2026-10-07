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
  if (!definition || !['sequence','branch','workflow'].includes(definition.kind) || !definition.title || !Array.isArray(definition.nodes) || !definition.nodes.length || !Array.isArray(definition.edges)) throw Error('Invalid semantic diagram');
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
  } else if (definition.kind === 'branch') {
    for (const node of definition.nodes.slice(1)) if (!edges.has(definition.nodes[0].id+':'+node.id)) throw Error('Branch lacks source edge');
  } else if (definition.kind === 'workflow') {
    const groups = ['inputs','loop','endpoint','destinations'];
    const parts = groups.map(group => definition.nodes.filter(n=>n.group===group));
    if(parts.some(p=>!p.length)||parts.flat().length!==definition.nodes.length||parts[2].length!==1)throw Error('Workflow requires starts, loop, one endpoint and destinations');
    if(definition.nodes.some(n=>!['figma','claudecode','claude'].includes(n.tool)))throw Error('Unsupported workflow tool');
    for(const n of parts[0])if(!edges.has(n.id+':'+parts[1][0].id))throw Error('Workflow start must feed the loop');
    for(let i=1;i<parts[1].length;i++)if(!edges.has(parts[1][i-1].id+':'+parts[1][i].id))throw Error('Workflow lacks ordered loop edge');
    if(!edges.has(parts[1].at(-1).id+':'+parts[2][0].id))throw Error('Workflow lacks main endpoint');
    for(const n of parts[3])if(!edges.has(parts[2][0].id+':'+n.id))throw Error('Workflow lacks destination edge');
    for(const e of definition.edges.filter(e=>e.feedback))if(!parts[1].some(n=>n.id===e.to))throw Error('Feedback must return to the design loop');
  }
}
export function renderDiagram(definition) {
  validateDiagram(definition);
  if(definition.kind === 'workflow') {
    const groups=['inputs','loop','endpoint','destinations'];
    const titles={inputs:'Start · choose your source',loop:'Claude Design · explore and review',endpoint:'Main endpoint',destinations:'Choose the destination your recipient needs'};
    const cards=groups.map(group=>{
      const nodes=definition.nodes.filter(n=>n.group===group);
      return `<section class="workflow-group workflow-${group}" aria-label="${escape(titles[group])}"><h4>${escape(titles[group])}</h4><ol>${nodes.map((n,i)=>`<li data-diagram-node="${escape(n.id)}"><img class="workflow-logo" src="assets/tool-logos/${escape(n.tool)}.svg" alt=""><strong>${group==='loop'?(i+1)+'. ':''}${escape(n.label)}</strong><span>${escape(n.detail??'')}</span></li>`).join('')}</ol></section>`;
    }).join('<div class="workflow-flow-arrow" aria-hidden="true">↓</div>');
    const labels=new Map(definition.nodes.map(n=>[n.id,n.label]));
    const edges=definition.edges.map(e=>`<li data-diagram-from="${escape(e.from)}" data-diagram-to="${escape(e.to)}">${escape(labels.get(e.from))} → ${escape(labels.get(e.to))}${e.feedback?' (feedback)':''}</li>`).join('');
    return `<div class="semantic-diagram design-workflow" role="group" aria-label="${escape(definition.title)}">${cards}<p class="diagram-note">${escape(definition.note)}</p><details class="diagram-relationships"><summary>Diagram relationships</summary><ul>${edges}</ul></details></div>`;
  }
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
