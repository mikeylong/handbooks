from pathlib import Path
import os,json,sys
ROOT=Path(__file__).resolve().parents[1]
TOOLKIT=Path(os.environ.get('HANDBOOK_PUBLISHING_TOOLKIT',''))
if not TOOLKIT.is_dir() or not (TOOLKIT/'SKILL.md').exists():
    TOOLKIT=next((p/'publish-evidence-backed-handbook' for p in ROOT.parents if (p/'publish-evidence-backed-handbook/SKILL.md').exists()),None)
if TOOLKIT is None:raise RuntimeError('Set HANDBOOK_PUBLISHING_TOOLKIT to the extracted shared toolkit')
sys.path.insert(0,str(TOOLKIT/'scripts'))
os.environ.update(HANDBOOK_BOOK_ROOT=str(ROOT),HANDBOOK_PDF_CONFIG=(ROOT/'pdf-config.json').read_text(),HANDBOOK_PDF_THEME='light')
from flowable_reader import main
if __name__=='__main__':main(ROOT)
