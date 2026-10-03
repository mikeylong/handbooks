import {readFileSync} from 'node:fs';
export function pdfThemeCss(theme){
 const t=JSON.parse(readFileSync(new URL('../assets/design-system/pdf-appearance.json',import.meta.url),'utf8'))[theme];
 if(!t)throw Error('Unknown PDF theme');
 const scope=`html[data-pdf-theme="${theme}"]`;
 return `@media print { ${scope} {--paper:${t.paper};--paper-raised:${t.raised};--table-header:${t.raised};--ink:${t.ink};--muted:${t.muted};--line:${t.rule};--line-strong:${t.strongRule};} ${scope}, ${scope} body {background:${t.paper};color:${t.ink}; -webkit-print-color-adjust:exact;print-color-adjust:exact;} ${theme==='dark'?`${scope} .specimen-page,${scope} .chapter-illustration {background:${t.paper};} ${scope} .specimen-running,${scope} .specimen-folio {color:${t.muted};}`:''} }`;
}
