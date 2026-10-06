#!/usr/bin/env python3
"""Verify shared toolkit imports and finalization in the weekly copied-book layout."""
from pathlib import Path
import hashlib, json, os, re, shutil, subprocess, sys, tempfile
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
    verifier = BOOK/'automation/verify-publishing-toolkit.mjs'
    run(['node',str(verifier),str(TOOLKIT)], os.environ)
    fixture = root/'toolkit'
    (fixture/'references/specimen').mkdir(parents=True)
    (fixture/'input.txt').write_text('governed')
    (fixture/'references/specimen/manifest.json').write_text(json.dumps({'inputs':{'input.txt':hashlib.sha256(b'governed').hexdigest()}}))
    run(['node',str(verifier),str(fixture)], os.environ)
    (fixture/'input.txt').write_text('drift before preparation')
    run(['node',str(verifier),str(fixture)], os.environ,False)
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
    validator = build/'handbook/validate-handbook.mjs'
    run(['node', str(validator)], env)
    publication_path = build/'publication.json'
    original_publication = publication_path.read_text()
    publication = json.loads(original_publication)
    # Distinct URLs catch hard-coded destinations and swapped metadata fields.
    publication['editionUrl'] = 'https://handbooks.surfaces.systems/production-ai-engineering/editions/v9.9.9/'
    publication['releaseUrl'] = 'https://handbooks.surfaces.systems/production-ai-engineering/editions/v9.9.9/notes/'
    publication_path.write_text(json.dumps(publication))
    run(['node', str(build/'handbook/build-handbook.mjs')], env)
    run(['node', str(validator)], env)
    html_path = build/'handbook/index.html'
    valid_html = html_path.read_text()
    sidebar = re.search(r'<p class="sidebar-edition">.*?</p>', valid_html).group()
    for field, historical_url in [
        ('editionUrl', 'https://github.com/mikeylong/production-ai-engineering-book'),
        ('releaseUrl', 'https://github.com/mikeylong/production-ai-engineering-book/releases'),
    ]:
        assert f'href="{publication[field]}"' in sidebar
        wrong_sidebar = sidebar.replace(f'href="{publication[field]}"', f'href="{historical_url}"')
        other_field = 'releaseUrl' if field == 'editionUrl' else 'editionUrl'
        assert f'href="{publication[other_field]}"' in wrong_sidebar
        html_path.write_text(valid_html.replace(sidebar, wrong_sidebar))
        result = run(['node', str(validator)], env, False)
        assert 'sidebarPublicationMetadataExact: expected true, received false' in result.stderr
    publication_path.write_text(original_publication)
    run(['node', str(build/'handbook/build-handbook.mjs')], env)
    run(['node', str(validator)], env)
    config = json.loads((BOOK/'pdf-config.json').read_text())
    config['runningFont'] = str(TOOLKIT/'assets/design-system/fonts/NotoSans-Regular.ttf')
    config['baselineMode'] = 'appearance-companion'
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
    def finalizer_args(output_path, mode=None):
        command=[sys.executable,str(finalizer),'--input',str(raw),'--output',str(output_path),'--config',str(config_path),'--book',str(build)]
        if mode is not None:command += ['--baseline-mode',mode]
        return command
    baseline=build/config['releasedPdf']
    baseline_sha=hashlib.sha256(baseline.read_bytes()).hexdigest()
    baseline_pages=len(PdfReader(baseline).pages)
    config_bytes=config_path.read_bytes()
    unchanged_mode=root/'configured-companion.pdf'
    result=run(finalizer_args(unchanged_mode),env,False)
    assert 'Pagination mismatch' in result.stderr and not unchanged_mode.exists()
    output = root/'final.pdf'
    run(finalizer_args(output,'content-edition'),env)
    output_reader=PdfReader(output)
    assert len(output_reader.pages)==6 and baseline_pages!=6
    assert output_reader.page_labels==['Cover','ii','iii','1','2','3']
    assert config_path.read_bytes()==config_bytes
    for name, change, expected_error in [
        ('missing-baseline',{'releasedPdf':'output/pdf/absent.pdf'},'releasedPdf must be a regular file'),
        ('missing-hash',{'releasedSha256':None},'Missing or invalid releasedSha256'),
        ('stale-hash',{'releasedSha256':'0'*64},'releasedSha256 mismatch'),
    ]:
        config_path.write_text(json.dumps({**config,**change}))
        rejected=root/(name+'.pdf')
        result=run(finalizer_args(rejected,'content-edition'),env,False)
        assert expected_error in result.stderr and not rejected.exists(),result.stderr
    assert hashlib.sha256(baseline.read_bytes()).hexdigest()==baseline_sha
    assert not (build/'pdf-config.json').exists()
    without_toolkit = dict(env)
    without_toolkit.pop('HANDBOOK_PUBLISHING_TOOLKIT')
    run(['node',str(build/'handbook/build-handbook.mjs')],without_toolkit,False)
print('Copied weekly HTML validates publication URLs and rejects stale sidebar links; explicit book/content-edition finalization passes changed pagination while baseline and dependency guards remain.')
