#!/usr/bin/env python3
"""Verify shared toolkit imports and finalization in the weekly copied-book layout."""
from pathlib import Path
import json, os, shutil, subprocess, sys, tempfile
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader

BOOK = Path(__file__).resolve().parents[1]
TOOLKIT = BOOK.parent / 'publish-evidence-backed-handbook'

def run(args, env, succeeds=True):
    result = subprocess.run(args, env=env, capture_output=True, text=True)
    assert (result.returncode == 0) == succeeds, result.stdout + result.stderr
    return result

with tempfile.TemporaryDirectory(prefix='weekly-toolkit-test-') as directory:
    root = Path(directory)
    build = root / 'build-source'
    shutil.copytree(BOOK/'handbook', build/'handbook', ignore=shutil.ignore_patterns('__pycache__'))
    shutil.copyfile(BOOK/'AI_ENGINEERING_FIELD_GUIDE.md', build/'AI_ENGINEERING_FIELD_GUIDE.md')
    shutil.copyfile(BOOK/'publication.json', build/'publication.json')
    (build/'output/pdf').mkdir(parents=True)
    shutil.copyfile(BOOK/'output/pdf/production-ai-engineering-v1.4.0-2026-09-30.pdf', build/'output/pdf/production-ai-engineering-v1.4.0-2026-09-30.pdf')
    env = {**os.environ, 'HANDBOOK_PUBLISHING_TOOLKIT': str(TOOLKIT),
           'HANDBOOK_AUTOMATION_PATH': str(BOOK/'automation/automation.toml'),
           'HANDBOOK_RELEASE_POLICY_PATH': str(BOOK/'automation/release-policy.json')}
    run(['node', str(build/'handbook/build-handbook.mjs')], env)
    assert '<svg' in (build/'handbook/index.html').read_text()
    config = json.loads((BOOK/'pdf-config.json').read_text())
    config['runningFont'] = str(TOOLKIT/'assets/design-system/fonts/NotoSans-Regular.ttf')
    config_path = root/'explicit-config.json'
    config_path.write_text(json.dumps(config))
    raw = root/'raw.pdf'
    canvas = Canvas(str(raw), pagesize=(420,594.96))
    for i in range(6):
        canvas.drawString(40,400,f'Weekly sandbox page {i+1}')
        canvas.showPage()
    canvas.save()
    finalizer = build/'handbook/finalize-pdf.py'
    run([sys.executable,str(finalizer),'--input',str(raw),'--output',str(root/'missing-config.pdf')],env,False)
    output = root/'final.pdf'
    run([sys.executable,str(finalizer),'--input',str(raw),'--output',str(output),'--config',str(config_path)],env)
    assert len(PdfReader(output).pages)==6
    assert not (build/'pdf-config.json').exists()
    without_toolkit = dict(env)
    without_toolkit.pop('HANDBOOK_PUBLISHING_TOOLKIT')
    run(['node',str(build/'handbook/build-handbook.mjs')],without_toolkit,False)
print('Copied weekly HTML and finalizer resolve the toolkit and explicit config; missing dependencies fail.')
