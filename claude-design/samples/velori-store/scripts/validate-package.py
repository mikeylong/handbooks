#!/usr/bin/env python3
"""Validate a portable public sample without the source checkout."""
import hashlib, json, sys, zipfile
from pathlib import PurePosixPath

with zipfile.ZipFile(sys.argv[1]) as archive:
    names = set(archive.namelist())
    prefix = 'velori-store/'
    for name in names:
        path = PurePosixPath(name)
        assert name.startswith(prefix) and '..' not in path.parts, name
        assert not any(part in ('handoff', 'node_modules', 'dist', 'validation') for part in path.parts), name
        assert path.name not in ('support.js', 'serve-native-handoff.mjs', 'validate-native-handoff.mjs'), name
    manifest = json.loads(archive.read(prefix + 'provenance.json'))
    expected = {prefix + path for path in manifest['files']} | {prefix + 'provenance.json'}
    assert names == expected, 'Archive and provenance file inventories differ'
    assert manifest['license']['ownedMaterials'] == 'MIT'
    for path, record in manifest['files'].items():
        data = archive.read(prefix + path)
        assert len(data) == record['bytes'] and hashlib.sha256(data).hexdigest() == record['sha256'], path
    package = json.loads(archive.read(prefix + 'package.json'))
    assert package['license'] == 'MIT'
    assert 'MIT License' in archive.read(prefix + 'LICENSE').decode()
    assert not {'handoff', 'validate:handoff'} & package['scripts'].keys()
    for required in ('README.md', 'package-lock.json', 'docs/LUCIDE-LICENSE', 'docs/REACT-LICENSE', 'src/library.jsx', 'public/assets/velori/manifest.json'):
        assert prefix + required in names, required
print(json.dumps({'status': 'passed', 'files': len(names), 'ownedMaterialsLicense': 'MIT', 'historicalRuntimeExcluded': True}))
