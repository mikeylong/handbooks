import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = fs.realpathSync(process.argv[2]);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'references/specimen/manifest.json')));
if (!manifest.inputs || !Object.keys(manifest.inputs).length) throw Error('Toolkit manifest has no governed inputs');
for (const [name, expected] of Object.entries(manifest.inputs)) {
  const file = path.resolve(root, name);
  if (path.isAbsolute(name) || name.includes('\\') || !file.startsWith(root + path.sep)) throw Error(`Unsafe toolkit input: ${name}`);
  if (!fs.realpathSync(file).startsWith(root + path.sep)) throw Error(`Toolkit input escapes package: ${name}`);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (actual !== expected) throw Error(`Toolkit input differs from recorded manifest hash: ${name}`);
}
