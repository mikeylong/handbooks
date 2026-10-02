import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT ? pathToFileURL(resolve(process.env.HANDBOOK_PUBLISHING_TOOLKIT)+'/') : new URL('../../publish-evidence-backed-handbook/',import.meta.url);
const toolkitModule=name=>import(new URL('scripts/'+name,toolkit));
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(await readFile(new URL('../source/reader-config.json',import.meta.url),'utf8'));
const {validateReaderRelease}=await toolkitModule('validate-reader-release.mjs');
await validateReaderRelease(root,'ai-evaluation',config.releaseChecks);
