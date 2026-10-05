"""Portable public payload policy; private native evidence is never a reader input."""
import json
from pathlib import PurePosixPath

BASELINE_COMPONENTS = ('AccessoryChoice','AccessoryPhoto','Brand','ChoiceGroup','ConfigurationSummary','ExpressionSelect','FaceChoice','FinishChoice','PrimaryButton','ProductPreview','SelectionMark','StoreHeader','VeloriIcon')
READER_CONFIG_KEYS = frozenset(('pkg','globalName','shape','entry','guidelinesGlob','componentSrcMap','dtsPropsFor','overrides','readmeHeader','libOverrides'))
PRIVATE_KEYS = frozenset(('projectid','project','owner','ownerid','account','accountid','email','organization','organizationid','orgid','auth','authentication','credentials','token','accesstoken','refreshtoken','session','sessionid'))
NATIVE_GUIDELINES = ('docs/native-baseline.md','docs/product-brief.md')
ROOT_FILES = ('LICENSE','README.md','package.json','package-lock.json','index.html','vite.config.js','tokens.json','.gitignore','.gitattributes')
SOURCE_FILES = ('model.test.mjs','ReviewConfiguration.jsx','tokens.css','index.js','main.jsx','library.jsx','velori.css','model.mjs')
DOC_FILES = ('LUCIDE-LICENSE','REACT-LICENSE','asset-terms.md','product-brief.md','inventory.md','generated-image-prompts.json','handoff-template.md','source-conflicts.md','system-definition.md','native-baseline.md','expected-results.md','image-provenance.md','walkthrough.md','prompts.md')
SCRIPT_FILES = ('validate-browser.mjs','package-candidate.py','validate-package.py','validate-assets.mjs','package_policy.py','test-package.py','test-native-assets.mjs')
REFERENCE_FILES = ('index.html','velori-select.css','velori-config.js','design-system.js','velori-site.css','velori-config.css','velori-select.js','velori-product-assets.js','velori-icons.js','storyboard.css','extraction-manifest.json','velori-icons.css')
ASSET_FILES = ('pebble-bag-shell-v2.png','dock-layer.png','face-simple.png','chalk-none.png','graphite-none.png','pebble-none.png','pebble-bag.png','graphite-bag.png','manifest.json','chalk-bag.png','bag-robot-mask.svg','graphite-bag-shell-v2.png','face-friendly.png','pebble-dock.png','graphite-dock.png','chalk-dock.png')
SYNC_FILES = ('host-entry.mjs','config.json','conventions.md','package-assets.mjs','NOTES.md')
PUBLIC_FILES = frozenset(ROOT_FILES + tuple('src/'+p for p in SOURCE_FILES) + tuple('docs/'+p for p in DOC_FILES) + tuple('scripts/'+p for p in SCRIPT_FILES) + tuple('reference/'+p for p in REFERENCE_FILES) + tuple('public/assets/velori/'+p for p in ASSET_FILES) + tuple('reference/assets/velori/'+p for p in ASSET_FILES) + tuple('.design-sync/'+p for p in SYNC_FILES) + tuple('.design-sync/previews/'+p+'.tsx' for p in BASELINE_COMPONENTS) + ('provenance/source-freeze.json','.design-sync/overrides/source-kit.mjs',))

def private_key(key):
 return ''.join(c for c in key.lower() if c.isalnum()) in PRIVATE_KEYS

def remove_private_fields(value):
 if isinstance(value,dict):return {k:remove_private_fields(v) for k,v in value.items() if not private_key(k)}
 if isinstance(value,list):return [remove_private_fields(v) for v in value]
 return value

def reader_config(config):
 return remove_private_fields({key:value for key,value in config.items() if key in READER_CONFIG_KEYS})

def validate_reader_config(config):
 assert set(config)<=READER_CONFIG_KEYS,'Public config contains nonportable or owner fields'
 def inspect(value):
  if isinstance(value,dict):
   for key,item in value.items():
    assert not private_key(key),'Public config contains private native fields'
    inspect(item)
  elif isinstance(value,list):
   for item in value:inspect(item)
 inspect(config)
 assert set(config.get('libOverrides',{}))=={'source-kit.mjs'},'Native asset adapter declaration changed'
 assert config['entry']=='./.design-sync/host-entry.mjs','Native baseline entry changed'
 assert tuple(config['guidelinesGlob'])==NATIVE_GUIDELINES,'Native guidance exceeds the accepted baseline'
 assert config['componentSrcMap'].get('ReviewConfiguration','missing') is None,'Review answer key is not explicitly excluded'
 assert {name for name,p in config['componentSrcMap'].items() if p is not None}==set(BASELINE_COMPONENTS),'Native baseline component inventory changed'

def json_bytes(value):
 return (json.dumps(value,indent=2)+'\n').encode()

def public_path(path):
 parsed=PurePosixPath(path)
 return path in PUBLIC_FILES and not parsed.is_absolute() and '..' not in parsed.parts
