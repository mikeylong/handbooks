/** Fixed print geometry with book-owned semantic labels and relationships. */
import {readFileSync} from 'node:fs';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function renderFixedFlowDiagram(profile,source,{expected,bindings,steps=[],edges=[]}) {
 if(!['fallback','rag','system','validation'].includes(profile))throw Error('Unknown fixed diagram geometry');
 const sequence=['fallback','rag'].includes(profile);
 if(!sequence&&!new RegExp(`^flowchart\\s+${profile==='system'?'LR':'TD'}\\s*$`,'m').test(source))throw Error('Unexpected diagram direction');
 const lines=(sequence?source:source.split('\n')).map(x=>x.trim()).filter(x=>x&&!x.startsWith('flowchart'));
 if(expected.some(x=>!lines.includes(x))||lines.some(x=>!expected.includes(x))||(sequence&&lines.some((x,i)=>x!==expected[i])))throw Error('Diagram semantic source changed');
 let template=readFileSync(new URL(`../assets/design-system/diagrams/${profile}.svg.html`,import.meta.url),'utf8');
 const values=Object.fromEntries(Object.entries(bindings).map(([k,v])=>[k,escape(v)]));
 if(profile==='validation'){
  values.edges=edges.map(([from,to],i)=>`<path class="validation-spine-link" data-from="${escape(from)}" data-to="${escape(to)}" d="M48 ${i===0?25:58+(i-1)*54+1} V${58+i*54}" />`).join('\n      ');
  values.steps=steps.map(({id,number,label,action,detail},i)=>`\n    <g class="validation-node validation-step" data-step="${escape(id)}" data-label="${escape(label)}" transform="translate(0 ${58+i*54})">\n      <line class="validation-step-tick" x1="48" y1="0" x2="72" y2="0" />\n      <text class="validation-step-number" x="84" y="5">${escape(number)}</text>\n      <text class="validation-step-title" x="122" y="-6">${escape(action)}</text>\n      <text class="validation-step-detail" x="122" y="16">${escape(detail)}</text>\n      <line class="validation-row-rule" x1="122" y1="28" x2="730" y2="28" />\n    </g>`).join('\n');
 }
 return template.replace(/\{\{(\w+)\}\}/g,(_,k)=>{if(!(k in values))throw Error('Missing diagram label '+k);return values[k];});
}
