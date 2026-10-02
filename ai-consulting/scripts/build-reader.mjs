import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT ? pathToFileURL(resolve(process.env.HANDBOOK_PUBLISHING_TOOLKIT)+'/') : new URL('../../publish-evidence-backed-handbook/',import.meta.url);
const toolkitModule=name=>import(new URL('scripts/'+name,toolkit));
const root=fileURLToPath(new URL('../',import.meta.url));
const {buildApprovedReader}=await toolkitModule('build-approved-reader.mjs');
await buildApprovedReader(root,'ai-consulting');
