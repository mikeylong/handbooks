import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
export const toolkitRoot = process.env.HANDBOOK_PUBLISHING_TOOLKIT
  ? resolve(process.env.HANDBOOK_PUBLISHING_TOOLKIT)
  : fileURLToPath(new URL('../../publish-evidence-backed-handbook/', import.meta.url));
export const toolkitModule = name => import(pathToFileURL(resolve(toolkitRoot, 'scripts', name)));
export const readerAssets = resolve(toolkitRoot, 'assets/reader');
