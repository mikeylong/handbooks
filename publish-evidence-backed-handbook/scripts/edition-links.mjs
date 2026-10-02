export function editionLinks(html,publication) {
 const legacy=publication.historicalRepository;
 if(legacy){
  html=html.replaceAll(publication.historicalReleaseUrl,publication.releaseUrl);
  // Engineering historically used the releases index as its edition link.
  html=html.replaceAll(legacy+'/releases',publication.releaseUrl);
  html=html.replaceAll(legacy,publication.editionUrl);
 }
 html=html.replaceAll('handbooks.mikelong.ai','handbooks.surfaces.systems').replaceAll('handbooks.mikelong.design','handbooks.surfaces.systems');
 return html;
}
