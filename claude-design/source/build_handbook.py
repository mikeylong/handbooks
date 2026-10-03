from pathlib import Path
import os, sys, json
BOOK_ROOT = Path(__file__).resolve().parents[1]
_toolkit = Path(os.environ['HANDBOOK_PUBLISHING_TOOLKIT']) if os.environ.get('HANDBOOK_PUBLISHING_TOOLKIT') else next((p/'publish-evidence-backed-handbook' for p in BOOK_ROOT.parents if (p/'publish-evidence-backed-handbook/SKILL.md').is_file()), None)
if _toolkit is None: raise RuntimeError('Set HANDBOOK_PUBLISHING_TOOLKIT to the extracted toolkit path.')
sys.path.insert(0,str(_toolkit/'scripts'))
os.environ.setdefault('HANDBOOK_BOOK_ROOT',str(BOOK_ROOT))
os.environ.setdefault('HANDBOOK_PDF_CONFIG',(BOOK_ROOT/'pdf-config.json').read_text())
from markdown_layout import *
