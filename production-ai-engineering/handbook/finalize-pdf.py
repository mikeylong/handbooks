#!/usr/bin/env python3
"""Compatibility command delegating generic overlay/finalization to the toolkit."""
import os,sys
from pathlib import Path
p=Path(os.environ['HANDBOOK_PUBLISHING_TOOLKIT']) if os.environ.get('HANDBOOK_PUBLISHING_TOOLKIT') else Path(__file__).resolve().parents[2]/'publish-evidence-backed-handbook'
sys.path.insert(0,str(p/'scripts'))
from finalize_chromium_pdf import main,finalize
if __name__=='__main__':
    if '--config' not in sys.argv:sys.argv += ['--config',str(Path(__file__).resolve().parents[1]/'pdf-config.json')]
    if '--theme' not in sys.argv:sys.argv += ['--theme','light']
    main()
