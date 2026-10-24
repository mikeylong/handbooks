#!/usr/bin/env python3
"""Exercise chapter-only eyebrows in both PDF runtimes and the shared reader."""
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

if len(sys.argv) == 1:
    for runtime in ('reportlab_layout', 'markdown_layout'):
        subprocess.run([sys.executable, __file__, runtime], check=True)
    print('PASS chapter-only eyebrow roles in both PDF runtimes and hosted reader')
    raise SystemExit

with tempfile.TemporaryDirectory(prefix='handbook-eyebrows-') as directory:
    root = Path(directory)
    for name in ('source', 'assets/chapter-art/pdf', 'output/pdf'):
        (root / name).mkdir(parents=True, exist_ok=True)
    os.environ['HANDBOOK_BOOK_ROOT'] = str(root)
    os.environ['HANDBOOK_PDF_CONFIG'] = json.dumps({'markdown': 'source.md'})
    runtime = importlib.import_module(sys.argv[1])
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph
    from pypdf import PdfReader
    from eyebrow_roles import OmittedEyebrow
    arbitrary = ParagraphStyle('NewEyebrow', parent=runtime.BODY, handbookEyebrow=True)
    for style in (runtime.COVER_KICKER, runtime.CHAPTER_KICKER, arbitrary):
        assert isinstance(runtime.P('An arbitrary nonchapter label', style), OmittedEyebrow)
    try:
        runtime.P('Not an eyebrow', runtime.BODY, role='chapter-marker')
    except ValueError:
        pass
    else:
        raise AssertionError('Body paragraph accepted the chapter-marker role')
    marker = runtime.P('CHAPTER 01', runtime.CHAPTER_KICKER, role='chapter-marker')
    title = runtime.P('Useful title', runtime.H1)
    title._toc_title = '1. Useful title'
    story = [runtime.P('Wrong cover label', runtime.COVER_KICKER),
             marker, title, runtime.P('Body retained.'),
             runtime.P('Wrong back-matter label', arbitrary)]
    pdf = root / 'output/pdf/fixture.pdf'
    SimpleDocTemplate(str(pdf)).build(story[:])
    text = ''.join(page.extract_text() for page in PdfReader(pdf).pages)
    assert 'CHAPTER 01' in text and 'Useful title' in text and 'Body retained.' in text
    assert 'Wrong' not in text
    (root / 'source/build_handbook.py').write_text(f'''from {sys.argv[1]} import *
from reportlab.lib.styles import ParagraphStyle
def build_story():
    title = P('Useful title', H1)
    title._toc_title = '1. Useful title'
    return [P('Wrong cover label', COVER_KICKER),
            P('CHAPTER 01', CHAPTER_KICKER, role='chapter-marker'), title,
            Paragraph('Wrong legacy label', CHAPTER_KICKER),
            P('Body retained.'), P('Wrong custom label', ParagraphStyle('Custom', parent=BODY, handbookEyebrow=True))]
''')
    (root / 'release-manifest.json').write_text(json.dumps({'pdf':'fixture.pdf','pages':1,'version':'0.0.0','title':'Fixture','date':'2026-10-23'}))
    (root / 'publication.json').write_text(json.dumps({'author':'Fixture','authorSite':'https://example.com','review':None,'editionUrl':'https://example.com','releaseUrl':'https://example.com'}))
    from flowable_reader import build_reader
    build_reader(root, {'skipContentsText':True,'skipStyles':[],'chapterNumbers':True,'semanticLists':True,'tableHeaders':True,'illustrationClass':'ChapterIllustration','diagramClasses':[],'storyFunction':'build_story','downloadTitle':'Fixture','subtitle':'Fixture','canonicalUrl':'https://example.com','extraCss':''}, root/'reader')
    rendered = (root/'reader/index.html').read_text()
    assert 'Wrong' not in rendered
    assert '<span>A handbook</span>' not in rendered
    assert '<header class="chapter-header"><p class="chapter-marker" data-role="chapter-marker">CHAPTER 01</p><h2>Useful title</h2>' in rendered
    assert 'Body retained.' in rendered
