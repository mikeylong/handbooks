import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute} from 'node:path';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function safePath(root, path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || path.split(/[\\/]/).includes('..')) throw Error('Unsafe collection path');
  const result = resolve(root, path);
  if (relative(root, result).startsWith('..')) throw Error('Unsafe collection path');
  return result;
}
