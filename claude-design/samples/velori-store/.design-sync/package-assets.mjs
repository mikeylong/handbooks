// Copies the library's runtime photos into the bundle after every converter or driver run.
// ProductPreview and AccessoryPhoto build URLs as new URL(BASE_URL + 'assets/velori/<file>', document.baseURI),
// and the converter compiles BASE_URL to "/", so the files must sit at <bundle root>/assets/velori/.
// The originals in public/assets/velori are copied byte-for-byte; nothing is resized or replaced.
import { cpSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] ?? './ds-bundle';
const src = 'public/assets/velori';
const dest = join(out, 'assets', 'velori');
cpSync(src, dest, { recursive: true });
const files = readdirSync(dest);
const bytes = files.reduce((n, f) => n + statSync(join(dest, f)).size, 0);
console.log(`assets: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB -> ${dest}`);
