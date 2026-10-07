#!/usr/bin/env python3
"""Create a portable sample candidate without changing private native state."""
from pathlib import Path
import argparse,hashlib,json,zipfile
from package_policy import PUBLIC_FILES,reader_config,validate_reader_config,json_bytes

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',required=True,type=Path)
parser.add_argument('--audience',choices=['private','public'],default='public')
parser.add_argument('--manifest-output',type=Path,help='Optional explicit copy of the generated payload manifest.')
args=parser.parse_args()
out=args.output.resolve()
if out.exists():raise SystemExit('Output already exists; choose a new candidate path.')
if args.audience=='public':
 paths=[root/name for name in sorted(PUBLIC_FILES)]
else:
 names=['LICENSE','README.md','package.json','package-lock.json','index.html','vite.config.js','tokens.json','.gitignore','.gitattributes','src','public','reference','docs','provenance','scripts','handoff']
 names+=['.design-sync/'+p for p in ['host-entry.mjs','config.json','conventions.md','package-assets.mjs','previews','overrides','NOTES.md']]
 paths=[]
 for name in names:
  p=root/name
  if p.is_file():paths.append(p)
  elif p.is_dir():paths.extend(x for x in p.rglob('*') if x.is_file() and '__pycache__' not in x.parts)
 paths=sorted(set(paths))
payload={}
for p in paths:
 if not p.is_file() or p.is_symlink():raise SystemExit('Missing or symlinked payload input: '+str(p.relative_to(root)))
 payload[str(p.relative_to(root))]=p.read_bytes()
package=json.loads(payload['package.json'])
projections={}
if args.audience=='public':
 if package.get('license')!='MIT' or b'MIT License' not in payload['LICENSE']:raise SystemExit('Public payload requires MIT metadata and license.')
 if any(name in package['scripts'] for name in ['handoff','validate:handoff']):raise SystemExit('Public payload advertises private native runtime commands.')
 config=reader_config(json.loads(payload['.design-sync/config.json']))
 validate_reader_config(config)
 payload['.design-sync/config.json']=json_bytes(config)
 projections['.design-sync/config.json']='Portable approved fields only; no native project pin or private owner fields. Source config is unchanged.'
sha=lambda data:hashlib.sha256(data).hexdigest()
manifest={
 'schemaVersion':2,'package':'velori-store','version':package['version'],'audience':args.audience,
 'distribution':'MIT public-download payload' if args.audience=='public' else 'Private review copy; native evidence remains outside the Velori MIT scope',
 'license':{'ownedMaterials':'MIT','notice':'LICENSE','thirdPartyNotices':['docs/LUCIDE-LICENSE','docs/REACT-LICENSE'],'historicalRuntime':'excluded from public payload; preserved privately'},
 'figmaCompanion':{'filename':'velori-design-exploration-starter.fig','route':'/claude-design/editions/v2.1.1/velori-design-exploration-starter.fig','manifestRoute':'/claude-design/editions/v2.1.1/figma-companion.json','sha256':'cac28455bdc7979867cfad5b2002e1a711a177bb12a5cb3db5c4c0c2aef7a4ca','bytes':13891619,'includedInThisZip':False,'verification':'Consult the companion manifest; each reader must verify their own imported copy.'},
 'sourceFreeze':'provenance/source-freeze.json',
 'adaptations':['Standalone React/Vite app with local assets and sample-only storage','Expression dropdown and one accessory choice; 72 configurations','Ink/white Continue, 12px corners, 48px height and 24px accessory gaps','Narrow finish/face gaps remain 16px; details-photo recovery is outside the current scope','Bounded React Review column adapted from native Review source accepted 2026-10-05, SHA-256 03b16ac0f4fea25202384a1f355baddd71dcf70db20b0b976b68f0f46811150a; existing configuration/routing/persistence/focus/image recovery retained; captured source/runtime private','Native import uses the 13 library exports and the accepted baseline guidance; completed screen source is excluded','React companion reaches Cart with one saved configuration; editable Figma answer key contains static Review and Cart frames'],
 'nativeEvidence':'The bounded Review adaptation cites its accepted native source above. All captured native source/runtime remain private and outside this MIT payload. Readers must capture and validate their own new packet; this archive does not certify a new import, generation or handoff.',
 'exclusions':['node_modules','dist','runtime validation','converter output','native credentials and upload records','owner browser state','private review files'],
 'publicPayloadExclusions':['captured native packet and runtime','historical native handoff metadata','historical native server and validator','native project pin and private owner config fields'] if args.audience=='public' else [],
 'projections':projections,
 'files':{name:{'sha256':sha(data),'bytes':len(data)} for name,data in sorted(payload.items())}
}
payload['provenance.json']=json_bytes(manifest)
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as archive:
 for name,data in sorted(payload.items()):
  info=zipfile.ZipInfo('velori-store/'+name,(1980,1,1,0,0,0))
  info.compress_type=zipfile.ZIP_DEFLATED;info.create_system=3;info.external_attr=0o100644<<16
  archive.writestr(info,data)
manifest_path=out.with_suffix('.provenance.json')
manifest_path.write_bytes(payload['provenance.json'])
if args.manifest_output:
 args.manifest_output.parent.mkdir(parents=True,exist_ok=True)
 args.manifest_output.write_bytes(payload['provenance.json'])
receipt={'path':str(out),'sha256':sha(out.read_bytes()),'bytes':out.stat().st_size,'files':len(payload),'audience':args.audience,'ownedMaterialsLicense':'MIT','publicRelease':False,'manifest':str(manifest_path),'sourceConfigChanged':False}
out.with_suffix('.receipt.json').write_bytes(json_bytes(receipt))
print(json.dumps(receipt))
