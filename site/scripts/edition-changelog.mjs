import {readFile} from 'node:fs/promises';
import {safePath, digest} from './book-sources.mjs';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export async function editionChangelog(source, edition, record) {
  if (!record || record.version !== edition.version) throw Error('Missing changelog for '+edition.id);
  const bytes = await readFile(safePath(source, record.path));
  if (digest(bytes) !== record.sha256) throw Error('Changelog source changed: '+edition.id);
  const log = JSON.parse(bytes);
  if (record.kind === 'first-edition') {
    if (log.status !== 'not-applicable') throw Error('First edition has an incompatible changelog record');
    return '<p class="edition-summary">First published edition.</p>';
  }
  if (record.kind !== 'changes' || !Array.isArray(log.items) || !log.summary) throw Error('Invalid edition changelog');
  return `<p class="edition-summary">${escape(log.summary)}</p>${log.previousVersion ? `<p>Compared with ${escape(log.previousVersion)}.</p>` : ''}<ol class="edition-changes">${log.items.map(item => {
    if (!item.title || !item.whatChanged || !item.why) throw Error('Incomplete changelog entry');
    return `<li><p class="edition-change-label">${escape(item.classificationLabel || item.classification)} · ${escape(item.section)}</p><h2>${escape(item.title)}</h2><p>${escape(item.whatChanged)}</p><p>${escape(item.why)}</p>${item.sources?.length ? `<p class="edition-change-sources">Sources: ${item.sources.map(s => {
      const url = new URL(s.url);
      if (!['https:','http:'].includes(url.protocol)) throw Error('Invalid changelog source URL');
      return `<a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.authority)}: ${escape(s.title)}</a>`;
    }).join(' · ')}</p>` : ''}</li>`;
  }).join('')}</ol>`;
}
