#!/usr/bin/env python3
"""Regress unnumbered PDF headings, measured wraps and linked references."""
import importlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

if len(sys.argv)==1:
    for runtime in ('reportlab_layout','markdown_layout'):
        subprocess.run([sys.executable,__file__,runtime],check=True)
    print('PASS both PDF heading runtimes: unnumbered titles, stable anchors, balanced tails and short control')
    raise SystemExit

with tempfile.TemporaryDirectory(prefix='handbook-heading-test-') as folder:
    os.environ['HANDBOOK_BOOK_ROOT']=folder
    os.environ['HANDBOOK_PDF_CONFIG']=json.dumps({'markdown':'source.md'})
    m=importlib.import_module(sys.argv[1])
    from heading_wrap import prepare_pdf_story,stranded_tail
    titles=['2.1 Maintain the context work depends on','2.3 Enforce authority through the system',
            '3.9 Value capacity that was actually reused','3.10 Distinguish missing evidence from failure']
    heads=[m.P(t,m.H2) for t in titles]
    short=m.P('Short heading',m.H2);short.wrap(m.CONTENT_W,1000);before=(short.width,short.height)
    body=m.P('See section 2.1 and the discussion in 3.9-3.10. Ratio 2.1; version 2.1.0; cost $1,050; step 2.')
    index=m.P('Context: 2.1. Recovery: 3.9-3.10.',m.INDEX_REFERENCE)
    marker=m.P('CHAPTER 01',m.CHAPTER_KICKER,role='chapter-marker')
    story=heads+[short,body,index,marker]
    prepare_pdf_story(story)
    for source,h in zip(titles,heads):
        h.wrap(m.CONTENT_W,1000)
        assert h.getPlainText()==source.split(' ',1)[1]
        assert not stranded_tail(h.heading_lines,m.CONTENT_W),h.heading_lines
        assert h.style.fontSize==m.H2.fontSize
        assert h._pdf_section_id==source.split(' ')[0]
        assert '<a name="section-' in h.text
    short.wrap(m.CONTENT_W,1000);assert (short.width,short.height)==before
    assert marker.getPlainText()=='CHAPTER 01'
    assert '#section-2-1' in body.text and '#section-3-10' in body.text
    assert 'Ratio 2.1; version 2.1.0; cost $1,050; step 2.' in body.getPlainText()
    assert '#section-2-1' in index.text and '#section-3-10' in index.text
    assert index.split(m.CONTENT_W, 1)==[]
    assert 'See section 2.1' not in body.getPlainText()
    print(sys.argv[1],json.dumps([h.heading_lines for h in heads]))
