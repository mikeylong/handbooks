#!/usr/bin/env python3
from pathlib import Path
import os,sys
root=Path(__file__).resolve().parents[1]
toolkit=Path(os.environ.get("HANDBOOK_PUBLISHING_TOOLKIT",next((str(p/"publish-evidence-backed-handbook") for p in root.parents if (p/"publish-evidence-backed-handbook/scripts/flowable_reader.py").exists()),"")))
if not (toolkit/"scripts/flowable_reader.py").is_file():raise SystemExit("Set HANDBOOK_PUBLISHING_TOOLKIT to the publishing toolkit")
sys.path.insert(0,str(toolkit/"scripts"))
from flowable_reader import main
main(root)
