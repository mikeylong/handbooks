from pathlib import Path
import os
import sys

root=Path(__file__).resolve().parents[1]
toolkit=Path(os.environ['HANDBOOK_PUBLISHING_TOOLKIT']).expanduser().resolve() if os.environ.get('HANDBOOK_PUBLISHING_TOOLKIT') else root.parent/'publish-evidence-backed-handbook'
if not (toolkit/'scripts/flowable_reader.py').is_file():
 raise RuntimeError(f'Handbook publishing toolkit unavailable: {toolkit}')
sys.path.insert(0,str(toolkit/'scripts'))
from flowable_reader import main
if __name__=='__main__':
 main(root)
