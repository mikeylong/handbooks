/** Shared presentation for direct handbook downloads. */
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export function downloadSize(bytes){
 if(!Number.isSafeInteger(bytes)||bytes<1)throw Error('Missing measured download size');
 return bytes>=1_000_000?`${(bytes/1_000_000).toFixed(1)} MB`:bytes>=1_000?`${Math.ceil(bytes/1_000)} KB`:`${bytes} bytes`;
}
export function downloadRow(name,format,purpose,metadata){
 return `<span class="download-copy"><strong class="download-name">${escape(name)}</strong><span class="download-purpose">${escape(purpose)}</span><span class="download-metadata">${escape(metadata)}</span></span><span class="download-format">${escape(format)}</span><span class="download-arrow" aria-hidden="true">↓</span>`;
}
