'use strict';
// The small, authored Velori set shares one grid, stroke and selection treatment.
{
 const spec=VELORI_DESIGN_SYSTEM.icons,ns='http://www.w3.org/2000/svg';
 function create(name,className=''){
  const paths=spec.paths[name];if(!paths)throw new Error('Unknown Velori icon: '+name);
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+spec.grid+' '+spec.grid);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.setAttribute('data-icon',name);svg.setAttribute('class','velori-icon '+className);
  for(const d of paths){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);svg.append(path);}return svg;
 }
 window.VELORI_ICONS=Object.freeze({create});
 for(const slot of document.querySelectorAll('[data-velori-icon]')){
  const svg=create(slot.dataset.veloriIcon);
  if(slot.namespaceURI===ns){slot.setAttribute('viewBox',svg.getAttribute('viewBox'));slot.setAttribute('aria-hidden','true');slot.setAttribute('focusable','false');slot.setAttribute('data-icon',slot.dataset.veloriIcon);slot.classList.add('velori-icon');slot.replaceChildren(...svg.childNodes);}
  else slot.replaceChildren(svg);
 }
}
