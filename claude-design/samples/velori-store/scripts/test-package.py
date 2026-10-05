#!/usr/bin/env python3
"""Exercise public/private projection and reject forged sensitive ZIP payloads."""
from pathlib import Path
import hashlib,json,shutil,subprocess,sys,tempfile,uuid,zipfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='velori-package-policy-') as scratch:
 copy=Path(scratch)/'sample'
 shutil.copytree(root,copy,ignore=shutil.ignore_patterns('node_modules','dist','validation','.ds-sync','ds-bundle','__pycache__'))
 cfg_path=copy/'.design-sync/config.json'
 cfg=json.loads(cfg_path.read_text())
 secrets=['private-'+str(uuid.uuid4()) for _ in range(4)]
 cfg['projectId']=secrets[0]
 cfg['email']=secrets[1]+'@example.invalid'
 cfg['auth']={'token':secrets[2]}
 cfg['overrides']['PrimaryButton']['organizationId']=secrets[3]
 cfg_path.write_text(json.dumps(cfg,indent=2)+'\n')
 pin_bytes=cfg_path.read_bytes()
 hist=copy/'provenance/native-handoff.json'
 if not hist.exists():hist.write_text('{"source":"private-native-packet-sentinel"}\n')
 public=Path(scratch)/'public.zip';private=Path(scratch)/'private.zip'
 def run(cmd,passing=True):
  result=subprocess.run(cmd,capture_output=True,text=True)
  assert (result.returncode==0)==passing,result.stdout+result.stderr
  return result
 pack=[sys.executable,str(copy/'scripts/package-candidate.py')]
 run(pack+['--output',str(public)]);run(pack+['--audience','private','--output',str(private)])
 assert cfg_path.read_bytes()==pin_bytes,'Packaging changed private config'
 run([sys.executable,str(copy/'scripts/validate-package.py'),str(public)])
 with zipfile.ZipFile(public) as z:
  payload={name:z.read(name) for name in z.namelist()}
  assert payload['velori-store/.design-sync/overrides/source-kit.mjs']==(copy/'.design-sync/overrides/source-kit.mjs').read_bytes(),'Public package lost asset adapter'
  assert set(json.loads(payload['velori-store/.design-sync/config.json'])['libOverrides'])=={'source-kit.mjs'},'Public config lost adapter declaration'
  assert not any(secret.encode() in data for secret in secrets for data in payload.values()),'Sensitive config reached public bytes'
 with zipfile.ZipFile(private) as z:
  assert z.read('velori-store/.design-sync/config.json')==pin_bytes
  assert z.read('velori-store/provenance/native-handoff.json')==hist.read_bytes()
 for field,value in [('projectId','forged-native-pin'),('email','forged-owner'),('overrides',{'PrimaryButton':{'cardMode':'column','auth':{'token':'forged-secret'}}})]:
  forged=dict(payload)
  config=json.loads(forged['velori-store/.design-sync/config.json']);config[field]=value
  data=(json.dumps(config,indent=2)+'\n').encode();forged['velori-store/.design-sync/config.json']=data
  manifest=json.loads(forged['velori-store/provenance.json'])
  manifest['files']['.design-sync/config.json']={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
  forged['velori-store/provenance.json']=(json.dumps(manifest,indent=2)+'\n').encode()
  target=Path(scratch)/(field+'.zip')
  with zipfile.ZipFile(target,'w') as z:
   for name,body in forged.items():z.writestr(name,body)
  run([sys.executable,str(copy/'scripts/validate-package.py'),str(target)],passing=False)
 forged=dict(payload);forged['velori-store/provenance/native-handoff.json']=hist.read_bytes()
 target=Path(scratch)/'historical.zip'
 with zipfile.ZipFile(target,'w') as z:
  for name,body in forged.items():z.writestr(name,body)
 run([sys.executable,str(copy/'scripts/validate-package.py'),str(target)],passing=False)
print(json.dumps({'passed':True,'checks':['public config projection','portable native asset adapter retained','private pin preserved','private historical metadata preserved','public excludes metadata','projectId forged ZIP rejected','owner forged ZIP rejected','nested private forged ZIP rejected','historical forged ZIP rejected']}))
