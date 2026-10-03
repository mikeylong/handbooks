import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {editionChangelog} from './edition-changelog.mjs';
import {digest} from './book-sources.mjs';

const root=await mkdtemp(join(tmpdir(),'handbook-changelog-'));
try {
  const edition={id:'future-handbook',version:'2.0.0'};
  const log={summary:'One correction.',previousVersion:'Version 1.0.0',items:[{classification:'correction',section:'Chapter 2',title:'Correct <example>',whatChanged:'The example changed.',why:'It used an incorrect value.',sources:[{authority:'Primary source',title:'Reference',url:'https://example.org/'}]}]};
  const bytes=JSON.stringify(log);
  await writeFile(join(root,'changes.json'),bytes);
  const record={version:edition.version,path:'changes.json',sha256:digest(bytes),kind:'changes'};
  const html=await editionChangelog(root,edition,record);
  assert.match(html,/Correct &lt;example&gt;/);
  assert.match(html,/Version 1.0.0/);
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);
  await assert.rejects(()=>editionChangelog(root,edition,null),/Missing changelog/);
  await assert.rejects(()=>editionChangelog(root,edition,{...record,version:'3.0.0'}),/Missing changelog/);
  await writeFile(join(root,'changes.json'),bytes+' ');
  await assert.rejects(()=>editionChangelog(root,edition,record),/source changed/);
  const first=JSON.stringify({status:'not-applicable'});
  await writeFile(join(root,'changes.json'),first);
  assert.match(await editionChangelog(root,edition,{...record,kind:'first-edition',sha256:digest(first)}),/First published edition/);
  console.log('Future-edition changelogs, first-edition notes, escaping, source links, missing records, version mismatch and stale hashes passed.');
} finally { await rm(root,{recursive:true,force:true}); }
