#!/usr/bin/env python3
"""Validate collection artifacts and root ownership after the historical move."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('validate-repositories.py')),run_name='__main__')
