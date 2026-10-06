import {readFile, mkdir, writeFile, realpath, lstat} from 'node:fs/promises';
import {dirname, resolve, relative, isAbsolute} from 'node:path';
import {safePath, digest} from './reader-paths.mjs';

// Curated immutable routes for approved historical editions. Never discover sources.
export async function installRetainedReleases(collectionRoot, output, inventory) {
  if (inventory?.schemaVersion !== 1 || !Array.isArray(inventory.routes)) throw Error('Invalid retained inventory');
  const root = await realpath(collectionRoot), seen = new Set(), plans = [];
  for (const route of inventory.routes) {
    if (typeof route.url !== 'string' || !/^\/[A-Za-z0-9/_.-]+\.(?:pdf|md|html|json|zip|fig)$/.test(route.url) || route.url.includes('..')) throw Error('Unsafe retained route');
    if (seen.has(route.url)) throw Error('Duplicate retained route: ' + route.url);
    seen.add(route.url);
    if (!/^[a-f0-9]{64}$/.test(route.sha256 ?? '')) throw Error('Invalid retained hash');
    const source = await realpath(safePath(root, route.source));
    const rel = relative(root, source);
    if (rel.startsWith('..') || isAbsolute(rel) || !(await lstat(source)).isFile()) throw Error('Unsafe retained source');
    const bytes = await readFile(source);
    if (digest(bytes) !== route.sha256) throw Error('Retained artifact changed: ' + route.url);
    const destination = safePath(output, route.url.slice(1));
    try {
      const existing = await readFile(destination);
      if (digest(existing) !== route.sha256) throw Error('Retained route conflicts with generated content: ' + route.url);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    plans.push({route, destination, bytes});
  }
  // Validate the full inventory and collisions before writing any route.
  for (const {destination, bytes} of plans) { await mkdir(dirname(destination), {recursive: true}); await writeFile(destination, bytes); }
  return plans.map(({route}) => ({url: route.url, sha256: route.sha256}));
}
