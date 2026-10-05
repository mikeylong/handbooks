/** Candidate edition copy derived from a verified changelog decision. */
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function installReviewGalleryCard(gallery,id,card,{replaceExisting=false}={}){
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid review book identity');
 const pattern=new RegExp(`<article class="handbook-card">\\s*<a class="handbook-card-link" href="/${id}/"[\\s\\S]*?</article>`,'g');
 const matches=[...gallery.matchAll(pattern)];
 if(replaceExisting){
  if(matches.length!==1)throw Error('One approved gallery card is required for an edition review');
  return gallery.replace(pattern,()=>card);
 }
 if(matches.length)throw Error('Review title already has a gallery card');
 return gallery.replace('<div class="handbook-grid" aria-label="Handbooks">',`<div class="handbook-grid" aria-label="Handbooks">${card}`);
}
export function reviewEditionSummary(edition,decision,previous=null){
 if(previous){
  if(decision.status!=='passed'||(decision.previousVersion&&decision.previousVersion!==previous.version))throw Error('Invalid next-edition decision');
  if(edition.previous_public_edition!==previous.version)throw Error('Previous edition identity mismatch');
  if(typeof decision.includeChangelog!=='boolean'||typeof decision.readerFacingContentChanged!=='boolean'||decision.includeChangelog!==decision.readerFacingContentChanged)throw Error('Inconsistent changelog decision');
  if(typeof decision.summary!=='string'||!decision.summary.trim())throw Error('Missing changelog summary');
  const entries=decision.expectedEntries??[];
  if(decision.includeChangelog&&!entries.length)throw Error('Missing accepted changelog entries');
  if(!decision.includeChangelog&&entries.length)throw Error('Unchanged content contains changelog entries');
  const items=entries.map(item=>{
   if(!item.category||!item.section||!item.text||!item.rationale)throw Error('Incomplete accepted changelog entry');
   const sources=(item.sources??[]).map(value=>{
    const url=new URL(typeof value==='string'?value:value.url);
    if(!['https:','http:'].includes(url.protocol))throw Error('Invalid changelog source URL');
    return `<a href="${escape(url.href)}">${escape(typeof value==='string'?value:(value.title??value.url))}</a>`;
   });
   return `<li><p>${escape(item.category)} · ${escape(item.section)}</p><p>${escape(item.text)}</p><p>${escape(item.rationale)}</p>${sources.length?`<p>Sources: ${sources.join(' · ')}</p>`:''}</li>`;
  });
  return `<p>Proposed version ${escape(edition.version)}. Compared with approved version ${escape(previous.version)} published ${escape(previous.date)}.</p><p>${escape(decision.summary)}</p>${items.length?`<ol class="edition-changes">${items.join('')}</ol>`:'<p>No reader-facing changelog is required.</p>'}`;
 }
 if(decision.status!=='not-applicable'||edition.previous_public_edition)throw Error('First-edition decision required');
 return `<p>Proposed first edition ${escape(edition.version)}.</p><p>No approved previous edition exists; no release changelog is required.</p>`;
}
