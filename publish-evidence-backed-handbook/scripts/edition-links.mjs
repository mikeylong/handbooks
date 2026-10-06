export function editionLinks(html,publication,{linkCoverDate=false}={}) {
 const legacy=publication.historicalRepository;
 if(legacy){
  html=html.replaceAll(publication.historicalReleaseUrl,publication.releaseUrl);
  // Engineering historically used the releases index as its edition link.
  html=html.replaceAll(legacy+'/releases',publication.releaseUrl);
  html=html.replaceAll(legacy,publication.editionUrl);
 }
 html=html.replaceAll('handbooks.mikelong.ai','handbooks.surfaces.systems').replaceAll('handbooks.mikelong.design','handbooks.surfaces.systems');
 // Keep edition navigation on the cover when legacy readers used the sidebar.
 const editionUrl=String(publication.editionUrl).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 if(linkCoverDate)html=html.replace(/(<p\b[^>]*class="cover-date"[^>]*>)([\s\S]*?)(<\/p>)/g,(_,open,date,close)=>
  /<a\b/.test(date) ? open+date+close : `${open}<a href="${editionUrl}">${date}</a>${close}`);
 return externalLinks(html);
}

export function externalLinks(html, origin = 'https://handbooks.surfaces.systems') {
 return html.replace(/<a\b[^>]*>/gi, anchor => {
  const href = anchor.match(/\shref\s*=\s*(["'])(.*?)\1/i)?.[2];
  if(!href) return anchor;
  let url;try { url = new URL(href, origin); } catch { return anchor; }
  if(!['http:', 'https:'].includes(url.protocol) || url.origin === new URL(origin).origin) return anchor;
  const rel = anchor.match(/\srel\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
  const tokens = [...new Set([...rel.split(/\s+/).filter(Boolean), 'noopener', 'noreferrer'])];
  return anchor.replace(/\s+target\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
   .replace(/\s+rel\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
   .replace(/>$/, ` target="_blank" rel="${tokens.join(' ')}">`);
 });
}
