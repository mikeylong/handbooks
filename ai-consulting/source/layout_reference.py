"""Compatibility import; reusable layout lives in the publishing toolkit."""
import os, sys
from pathlib import Path
p = Path(os.environ["HANDBOOK_PUBLISHING_TOOLKIT"]) if os.environ.get("HANDBOOK_PUBLISHING_TOOLKIT") else Path(__file__).resolve().parents[2] / "publish-evidence-backed-handbook"
sys.path.insert(0, str(p / "scripts"))
from reportlab_layout import *
