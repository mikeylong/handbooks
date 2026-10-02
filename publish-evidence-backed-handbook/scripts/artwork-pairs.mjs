import {readFile, mkdir, cp, realpath, lstat} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {digest, safePath} from './reader-paths.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const tags = /<figure\b(?:"[^"]*"|'[^']*'|[^'">])*>[\s\S]*?<\/figure\s*>/gi;
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1], m[2] ?? m[3]]));
const chapterFigure = tag => /\b(?:chapter-figure|chapter-art)\b/.test(attributes(tag).class ?? '') || attributes(tag)['data-artwork-role'] === 'chapter';

export function pairChapterArtwork(html, entries, readerUrl, readerDirectory) {
  const pairs = new Map(entries.map(entry => [new URL(entry.light.slice(readerDirectory.length + 1), readerUrl).pathname, entry]));
  const used = new Set();
  const paired = html.replace(tags, figure => {
    const opening = figure.match(/^<figure\b(?:"[^"]*"|'[^']*'|[^'">])*>/i)[0];
    if (!chapterFigure(opening)) return figure;
    const images = [...figure.matchAll(/<img\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)];
    if (images.length !== 1) throw Error('Chapter artwork must contain one image');
    const lightTag = images[0][0], source = attributes(lightTag).src;
    const key = new URL(source, readerUrl).pathname, pair = pairs.get(key);
    if (!pair) throw Error('Chapter artwork lacks an authored dark counterpart: ' + source);
    used.add(key);
    const darkSource = `<source data-dark-artwork srcset="${escape(new URL('assets/dark/' + pair.dark.split('/').at(-1), readerUrl).pathname)}" media="screen and (prefers-color-scheme: dark)" width="${pair.darkDimensions[0]}" height="${pair.darkDimensions[1]}">`;
    let result = figure.replace(opening, opening.replace(/>$/, (attributes(opening)['data-artwork-role'] ? '' : ' data-artwork-role="chapter"') + ' data-artwork-paired="true">'));
    if (/<picture\b/i.test(result)) result = result.replace(/(<picture\b[^>]*>)/i, '$1' + darkSource);
    else result = result.replace(lightTag, `<picture>${darkSource}${lightTag}</picture>`);
    return result;
  });
  if (used.size !== pairs.size) throw Error('Artwork manifest contains unused or duplicate chapter pairs');
  return paired;
}

export async function installArtworkPairs(source, book, output, html, approvedPackage) {
  let manifest;
  try { manifest = JSON.parse(await readFile(resolve(source, 'artwork-pairs.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') throw Error('Reader requires artwork-pairs.json: ' + book.id); throw error; }
  if (manifest.schemaVersion !== 1 || manifest.book !== book.id || !Array.isArray(manifest.artwork) || !manifest.artwork.length) throw Error('Invalid artwork pair manifest');
  const seenLight = new Set(), seenDark = new Set();
  for (const pair of manifest.artwork) {
    if (!pair.light?.startsWith(approvedPackage.readerDirectory + '/') || approvedPackage.files[pair.light] !== pair.lightSha256 || seenLight.has(pair.light) || seenDark.has(pair.dark)) throw Error('Artwork pair does not match the approved light package');
    seenLight.add(pair.light); seenDark.add(pair.dark);
    if (!/^assets\/chapter-art\/dark\/chapter-\d+\.png$/.test(pair.dark ?? '') || pair.dark === pair.light) throw Error('Invalid dark artwork path');
    const lightPath = safePath(source, pair.light), darkPath = safePath(source, pair.dark);
    if (!(await lstat(darkPath)).isFile() || await realpath(darkPath) !== darkPath) throw Error('Dark artwork must be a canonical local file');
    const light = await readFile(lightPath), dark = await readFile(darkPath);
    if (digest(light) !== pair.lightSha256 || digest(dark) !== pair.darkSha256) throw Error('Artwork pair checksum mismatch');
    if (dark.length < 33 || !dark.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || dark[25] !== 6 || pair.outerBackground !== 'transparent') throw Error('Dark artwork requires RGBA PNG with reviewed transparent outer background');
    const dimensions = [dark.readUInt32BE(16), dark.readUInt32BE(20)];
    if (JSON.stringify(dimensions) !== JSON.stringify(pair.darkDimensions) || dimensions.some(n => n < 512 || n > 8192)) throw Error('Dark artwork dimensions mismatch');
    if (typeof pair.prompt !== 'string' || !pair.prompt.trim() || pair.acquisitionMode !== 'generated' || !pair.generator || !/^[a-f0-9]{64}$/.test(pair.styleReferenceSha256 ?? '') || pair.reviewStatus !== 'accepted') throw Error('Dark artwork requires generation provenance and visual acceptance');
    const destination = resolve(output, book.id, 'assets/dark', pair.dark.split('/').at(-1));
    await mkdir(dirname(destination), {recursive:true});
    await cp(safePath(source, pair.dark), destination);
  }
  return pairChapterArtwork(html, manifest.artwork, 'https://handbooks.surfaces.systems/' + book.id + '/', approvedPackage.readerDirectory);
}
