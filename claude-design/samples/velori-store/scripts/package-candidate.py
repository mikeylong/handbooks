#!/usr/bin/env python3
"""Create a portable MIT sample candidate with hashes. Does not publish."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--audience', choices=['private', 'public'], default='public')
args = parser.parse_args()
names = ['LICENSE', 'README.md', 'package.json', 'package-lock.json', 'index.html', 'vite.config.js', 'tokens.json', '.gitignore', '.gitattributes', 'src', 'public', 'reference', 'docs', 'provenance', 'scripts', 'handoff']
sync = ['host-entry.mjs', 'config.json', 'conventions.md', 'package-assets.mjs', 'previews']
paths = []
for name in names + ['.design-sync/' + p for p in sync]:
    p = root / name
    if p.is_file():
        paths.append(p)
    elif p.is_dir():
        paths.extend(x for x in p.rglob('*') if x.is_file() and '__pycache__' not in x.parts)
paths = sorted(set(paths))
if args.audience == 'public':
    forbidden = [p for p in paths if 'handoff' in p.relative_to(root).parts or p.name in ('support.js', 'serve-native-handoff.mjs', 'validate-native-handoff.mjs')]
    paths = [p for p in paths if p not in forbidden]
    package = json.loads((root / 'package.json').read_text())
    if package.get('license') != 'MIT' or not (root / 'LICENSE').is_file():
        raise SystemExit('Public payload requires the MIT license and package metadata.')
    if any(name in package['scripts'] for name in ('handoff', 'validate:handoff')):
        raise SystemExit('Public payload still advertises historical runtime commands.')
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = {
    'schemaVersion': 1,
    'package': 'velori-store',
    'version': json.loads((root / 'package.json').read_text())['version'],
    'distribution': 'MIT public-download candidate; unpublished' if args.audience == 'public' else 'private review copy; includes captured runtime outside the Velori MIT scope',
    'license': {'ownedMaterials': 'MIT', 'notice': 'LICENSE', 'thirdPartyNotices': ['docs/LUCIDE-LICENSE', 'docs/REACT-LICENSE'], 'historicalRuntime': 'excluded from public payload; preserved in private review archive'},
    'sourceFreeze': 'provenance/source-freeze.json',
    'adaptations': [
        'Standalone React/Vite application with ordinary layout and state; no CLEAR reviewer coordination',
        'v1.4 dropdown and one accessory choice; color chips and multiple accessories remain extensions',
        'Ink/white Continue, 12px corners, 48px height, 24px accessory gaps; original violations retained as named fixtures',
        'New Review configuration and return paths, accessory details, image failure and retry',
        'Sample-only storage namespace, no inherited owner fixes, proposals, or review state',
        'Consumer Arial/Georgia fonts retained; native Figma system uses Arimo/Lora',
        'Reference extraction retains consumer photo composition and original violation styles',
        'ReviewConfiguration adapted from an earlier native Design source; historical runtime retained in private review archive' if args.audience == 'public' else 'Actual native Design source and dependencies retained in private review copy outside the Velori MIT scope'
    ],
    'exclusions': ['node_modules', 'dist', 'runtime validation', 'converter tooling and intermediate bundle outside the captured handoff', 'native authentication and upload records', 'owner browser state', 'private review files'],
    'publicPayloadExclusions': ['historical captured native packet and runtime', 'historical native server and validator'] if args.audience == 'public' else [],
    'files': {str(p.relative_to(root)): {'sha256': digest(p), 'bytes': p.stat().st_size} for p in paths}
}
(root / 'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')
paths.append(root / 'provenance.json')
out = args.output.resolve()
out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for p in paths:
        archive.write(p, 'velori-store/' + str(p.relative_to(root)))
receipt = {'path': str(out), 'sha256': digest(out), 'bytes': out.stat().st_size, 'files': len(paths), 'audience': args.audience, 'ownedMaterialsLicense': 'MIT', 'publicRelease': False}
out.with_suffix('.receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
