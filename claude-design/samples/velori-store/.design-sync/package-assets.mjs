// MIT-owned runtime-asset adapter; the native converter implementation remains staged separately.
import {copyFileSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const packageRoot=fileURLToPath(new URL('../',import.meta.url));

export function copyRuntimeAssets({sourceRoot=packageRoot,out='./ds-bundle'}={}) {
 const source=join(sourceRoot,'public/assets/velori');
 const destination=join(resolve(out),'assets/velori');
 if(!existsSync(source))throw new Error('Missing Velori runtime assets: '+source);
 const files=readdirSync(source).sort();
 const inventory=files.map(name=>{
  const path=join(source,name);
  if(!lstatSync(path).isFile()||lstatSync(path).isSymbolicLink())throw new Error('Runtime asset must be a regular file: '+name);
  const bytes=readFileSync(path);
  return {path:'assets/velori/'+name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 });
 rmSync(destination,{recursive:true,force:true});mkdirSync(destination,{recursive:true});
 for(const name of files)copyFileSync(join(source,name),join(destination,name));
 const inventoryPath=join(resolve(out),'guidelines/velori-runtime-assets.md');
 const body=['# Velori runtime assets','',
  'This deterministic inventory binds product photos and masks to the native auxiliary hash before validation and capture. Upload assets/** explicitly. Review obsolete remote asset paths before naming any deletes.',
  '', 'Any inventory change requires fresh ProductPreview and AccessoryPhoto captures and visual grades even when native component source keys remain stable. The first-sync DRIVER must validate and capture with these assets already present. The installed hash recipes remain unchanged.',
  '', '| Runtime path | Bytes | SHA-256 |','|---|---:|---|',
  ...inventory.map(record=>'| `'+record.path+'` | '+record.bytes+' | `'+record.sha256+'` |'),''
 ].join('\n');
 mkdirSync(dirname(inventoryPath),{recursive:true});writeFileSync(inventoryPath,body);
 const totalBytes=inventory.reduce((total,item)=>total+item.bytes,0);
 console.error('assets: '+inventory.length+' files, '+totalBytes+' bytes copied before native hashing/validation/capture; inventory guidelines/velori-runtime-assets.md');
 return {files:inventory,inventoryPath,totalBytes};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)copyRuntimeAssets({out:process.argv[2]??'./ds-bundle'});
