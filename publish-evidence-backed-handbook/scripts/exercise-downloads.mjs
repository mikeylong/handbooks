import assert from 'node:assert/strict';
import {readFile,lstat,realpath} from 'node:fs/promises';
import {safePath,digest} from './reader-paths.mjs';
import {downloadRow,downloadSize} from './download-row.mjs';
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export async function exerciseDownloadLinks(source,edition,pkg) {
 const definitionPath='exercise-downloads.json',file=safePath(source,definitionPath);
 const hasDefinitionPin=Object.hasOwn(pkg?.files||{},definitionPath);
 let stat;
 try {stat=await lstat(file);}
 catch(error){
  if(error.code!=='ENOENT')throw error;
  assert.ok(!hasDefinitionPin,'Pinned exercise definition is missing');
  return '';
 }
 assert.ok(stat.isFile()&&await realpath(file)===file,'Exercise definition must be a regular local file');
 const definitionBytes=await readFile(file),definitionSha256=pkg?.files?.[definitionPath];
 assert.match(definitionSha256||'',/^[a-f0-9]{64}$/,'Unpinned exercise definition');
 assert.equal(digest(definitionBytes),definitionSha256,'Stale exercise definition hash');
 const definition=JSON.parse(definitionBytes.toString('utf8'));
 assert.equal(definition.schemaVersion,1);
 assert.equal(definition.book,edition.id,'Exercise book mismatch');
 assert.equal(definition.version,edition.version,'Exercise edition mismatch');
 assert.ok(Array.isArray(definition.downloads)&&definition.downloads.length>0,'Exercise downloads required');
 // The caller supplies already-approved definition and artifact pins. Its book
 // release validator additionally certifies approval of any retained edition.
 let exerciseEdition=edition.version;
 if(Object.hasOwn(definition,'exerciseEdition')) {
  const versionPattern=/^(0|[1-9][0-9]*)[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)$/;
  assert.ok(typeof definition.exerciseEdition==='string'&&versionPattern.test(definition.exerciseEdition),'Invalid exercise edition');
  assert.ok(typeof edition.version==='string'&&versionPattern.test(edition.version),'Invalid current exercise edition');
  const selected=definition.exerciseEdition.split('.').map(BigInt),current=edition.version.split('.').map(BigInt);
  let comparison=0;
  for(let i=0;i<3;i++)if(selected[i]!==current[i]){comparison=selected[i]<current[i]?-1:1;break;}
  assert.ok(comparison<=0,'Exercise edition cannot follow the current edition');
  exerciseEdition=definition.exerciseEdition;
 }
 const urls=new Set(),prefix='/'+edition.id+'/editions/v'+exerciseEdition+'/';
 const links=[];
 for(const row of definition.downloads) {
  assert.ok(typeof row.label==='string'&&row.label.trim(),'Exercise label required');
  assert.ok(row.url.startsWith(prefix)&&!row.url.slice(prefix.length).includes('/'),'Exercise route must belong to this edition');
  assert.match(row.filename,/^[A-Za-z0-9][A-Za-z0-9._-]+$/,'Safe exercise filename required');
  assert.equal(row.url,prefix+row.filename,'Exercise filename mismatch');
  assert.ok(!urls.has(row.url),'Duplicate exercise route');urls.add(row.url);
  const path=pkg.readerDirectory+'/'+row.url.slice(('/'+edition.id+'/').length);
  assert.equal(row.path,path,'Exercise path mismatch');
  assert.match(row.sha256,/^[a-f0-9]{64}$/,'Exercise hash required');
  assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0,'Exercise size required');
  assert.equal(pkg.files[path],row.sha256,'Unpinned exercise download');
  const file=safePath(source,path),stat=await lstat(file);
  assert.ok(stat.isFile()&&await realpath(file)===file,'Exercise must be a regular local file');
  const bytes=await readFile(file);
  assert.equal(bytes.length,row.bytes,'Stale exercise size');
  assert.equal(digest(bytes),row.sha256,'Stale exercise hash');
  links.push('<p><a href="'+escape(row.url)+'" download="'+escape(row.filename)+'">'+escape(row.label)+'</a></p>');
 }
 return '<section class="exercise-materials" aria-label="Exercise materials"><h2>Exercise materials</h2>'+links.join('')+'</section>';
}

/** Book-owned presentation selects existing approved materials for reader downloads. */
export async function readerCompanionLinks(source,edition,pkg) {
 const file=safePath(source,'reader-downloads.json');
 let stat;
 try {stat=await lstat(file);}catch(error){if(error.code==='ENOENT')return '';throw error;}
 assert.ok(stat.isFile()&&await realpath(file)===file,'Reader download configuration must be a regular local file');
 const config=JSON.parse(await readFile(file,'utf8'));
 assert.equal(config.schemaVersion,1);
 assert.equal(config.book,edition.id,'Reader companion book mismatch');
 assert.equal(config.version,edition.version,'Reader companion edition mismatch');
 assert.ok(Array.isArray(config.companions)&&config.companions.length>0,'Reader companions required');
 // Reuse the complete approval, path, byte-size and hash gates before selection.
 assert.ok(await exerciseDownloadLinks(source,edition,pkg),'Approved exercise downloads required');
 const definition=JSON.parse(await readFile(safePath(source,'exercise-downloads.json'),'utf8'));
 const selected=new Set();
 return config.companions.map(choice=>{
  const row=definition.downloads.find(row=>row.filename===choice.filename);
  assert.ok(row,'Reader companion must select an approved exercise download');
  assert.ok(!selected.has(row.filename),'Duplicate reader companion');selected.add(row.filename);
  for(const field of ['label','purpose'])assert.ok(typeof choice[field]==='string'&&choice[field].trim(),'Reader companion '+field+' required');
  const format=row.filename.split('.').pop().toUpperCase(),size=downloadSize(row.bytes);
  return `<a class="pdf-download-link companion-download-link" href="${escape(row.url)}" download="${escape(row.filename)}" data-companion-download aria-label="Download ${escape(edition.title)}, ${escape(choice.label)}, ${escape(format)}, ${size}">${downloadRow(choice.label,format,choice.purpose,size)}</a>`;
 }).join('');
}
