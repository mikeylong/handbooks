#!/usr/bin/env python3
"""Validate the public archive's integrity and negative native-data boundaries."""
import hashlib,json,sys,zipfile
from pathlib import PurePosixPath
from package_policy import PUBLIC_FILES,validate_reader_config

with zipfile.ZipFile(sys.argv[1]) as archive:
 names=archive.namelist()
 assert len(names)==len(set(names)),'Duplicate archive entries'
 prefix='velori-store/'
 for name in names:
  path=PurePosixPath(name)
  assert name.startswith(prefix) and '..' not in path.parts,name
  assert not any(part in ('handoff','node_modules','dist','validation') for part in path.parts),name
  assert path.name not in ('support.js','native-handoff.json','serve-native-handoff.mjs','validate-native-handoff.mjs'),name
 expected={prefix+path for path in PUBLIC_FILES}|{prefix+'provenance.json'}
 assert set(names)==expected,'Public archive differs from the explicit portable file allowlist'
 manifest=json.loads(archive.read(prefix+'provenance.json'))
 assert manifest['schemaVersion']==2 and manifest['audience']=='public','Not a current public payload'
 assert set(manifest['files'])==PUBLIC_FILES,'Provenance and public allowlist differ'
 assert manifest['license']['ownedMaterials']=='MIT'
 for path,record in manifest['files'].items():
  data=archive.read(prefix+path)
  assert len(data)==record['bytes'] and hashlib.sha256(data).hexdigest()==record['sha256'],path
 validate_reader_config(json.loads(archive.read(prefix+'.design-sync/config.json')))
 package=json.loads(archive.read(prefix+'package.json'))
 assert package['license']=='MIT'
 assert b'MIT License' in archive.read(prefix+'LICENSE')
 assert not {'handoff','validate:handoff'}&package['scripts'].keys()
 for guide in ('docs/native-baseline.md','docs/product-brief.md'):
  body=archive.read(prefix+guide).decode()
  assert 'claude.ai/design/p/' not in body and 'figma.com/' not in body,'Native baseline contains owner/historical destinations'
  assert 'src/ReviewConfiguration.jsx' not in body,'Native guidance references completed screen source'
print(json.dumps({'status':'passed','files':len(names),'ownedMaterialsLicense':'MIT','historicalRuntimeExcluded':True,'historicalMetadataExcluded':True,'readerProjectPinExcluded':True,'baselineGuidanceChecked':True}))
