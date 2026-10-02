#!/usr/bin/env python3
"""Validate canonical collection ownership and approved, local edition packages."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
failures=[];catalog=json.loads((ROOT/'catalog.json').read_text())
if Path(git('rev-parse','--show-toplevel')).resolve()!=ROOT:failures.append('Collection must own its root')
if git('remote','get-url','origin').removesuffix('.git')!='https://github.com/mikeylong/handbooks':failures.append('Incorrect collection remote')
if git('ls-files','--stage').find('160000 ')>=0:failures.append('Git submodule or nested gitlink present')
paths=[b['directory'] for b in catalog['books']]+['site','publish-evidence-backed-handbook']
tracked=set(git('ls-files').splitlines())
for path in paths:
 d=ROOT/path
 if (d/'.git').exists():failures.append(path+': active child Git metadata')
 if Path(subprocess.check_output(['git','-C',str(d),'rev-parse','--show-toplevel'],text=True).strip()).resolve()!=ROOT:failures.append(path+': wrong owner')
 if not any(f.startswith(path+'/') for f in tracked):failures.append(path+': untracked source folder')
for b in catalog['books']:
 d=ROOT/b['directory']
 for entry in [b,*b.get('variants',[])]:
  if entry.get('source') and not (d/entry['source']).is_file():failures.append(b['id']+': missing source')
  if entry.get('pdf') and hashlib.sha256((d/entry['pdf']).read_bytes()).hexdigest()!=entry['pdfSha256']:failures.append(b['id']+': PDF changed')
 if b['status']=='published':
  p=json.loads((d/'publication.json').read_text())
  if p['sourceRepository']!=catalog['repository'] or p['editionUrl']!=b['editionUrl'] or p['releaseUrl']!=b['editionUrl']:failures.append(b['id']+': edition metadata mismatch')
# Child repositories in retained historical worktrees and recovery storage are excluded.
print(json.dumps({'status':'FAIL' if failures else 'PASS','repository':catalog['repository'],'sourceRoots':paths,'failures':failures},indent=2))
raise SystemExit(bool(failures))
