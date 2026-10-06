#!/usr/bin/env python3
"""Regression checks for the directive-based authored manuscript export."""
import sys
import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('machine_markdown',Path(__file__).with_name('export-machine-markdown.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
assert not any(name == "reportlab" or name.startswith("reportlab.") or name == "PIL" or name.startswith("PIL.") for name in sys.modules), "Legacy Markdown export must not load optional PDF/image dependencies"
source='---\ntitle: Future handbook\n---\n# Orientation\n\n::: callout decision | The operating model\nUse the system.\n:::\n\n::: worksheet Extension brief\n| Field |\n|---|\n| Scope |\n:::\n\n::: prompt Claude Code | Implement\nPreserve choices.\n:::\n'
result,index=module.export(source,{},'unverified')
assert '#### Callout (decision): The operating model' in result
assert '#### Worksheet: Extension brief' in result
assert '| Field |\n|---|\n| Scope |' in result
assert '```text\nPreserve choices.\n```' in result
assert len(index['callouts'])==len(index['worksheets'])==len(index['prompts'])==1
assert ':::' not in result
for broken in [source.replace('::: callout','::: unknown'),source.replace('Use the system.\n:::','Use the system.')]:
 try:module.export(broken,{},'unverified')
 except ValueError:pass
 else:raise AssertionError('Unknown or unclosed directive accepted')
print('PASS manuscript callouts, worksheets, prompts, body preservation and invalid directive rejection')
