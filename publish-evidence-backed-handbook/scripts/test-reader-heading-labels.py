#!/usr/bin/env python3
"""Exercise opt-in title labels through the complete shared HTML renderer."""
import json
import os
from pathlib import Path
import tempfile
from flowable_reader import build_reader

with tempfile.TemporaryDirectory(prefix='reader-heading-labels-') as folder:
    root=Path(folder)
    for path in ['source','assets/chapter-art/pdf','output/pdf']:
        (root/path).mkdir(parents=True,exist_ok=True)
    (root/'output/pdf/fixture.pdf').write_bytes(b'fixture download')
    identity={'id':'fixture','title':'Fixture','version':'1.0.0','date':'2026-10-23','pages':1,'pdf':'output/pdf/fixture.pdf'}
    (root/'pdf-config.json').write_text(json.dumps(identity))
    (root/'release-manifest.json').write_text(json.dumps(identity))
    (root/'publication.json').write_text(json.dumps({'author':'Fixture','authorSite':'https://example.org','editionUrl':'/fixture/editions/v1.0.0/'}))
    (root/'source/build_handbook.py').write_text("""from reportlab_layout import *
def build_story():
    return [P('Chapter',H1), P('1.1 Make the decision',H2), P('See section 1.1. Version 1.1.0; ratio 1.1; step 2.'), P('Decision: 1.1.',INDEX_REFERENCE)]
""")
    os.environ['HANDBOOK_BOOK_ROOT']=str(root)
    os.environ['HANDBOOK_PDF_CONFIG']=json.dumps(identity)
    config={'skipContentsText':True,'skipStyles':[],'chapterNumbers':False,'semanticLists':True,'tableHeaders':True,'storyFunction':'build_story','downloadTitle':'Fixture','subtitle':'Fixture','canonicalUrl':'https://example.org/fixture/','extraCss':''}
    for mode in ['numbers','titles']:
        build_reader(root,{**config,'subsectionLabels':mode},root/mode)
    numbered=(root/'numbers/index.html').read_text()
    titled=(root/'titles/index.html').read_text()
    assert '<h3>1.1 Make the decision</h3>' in numbered
    assert '<h3><span id="section-1-1"></span>Make the decision</h3>' in titled
    assert 'id="section-2"' in titled and 'id="section-2"' in numbered
    assert '<a href="#section-1-1">&quot;Make the decision&quot;</a>' in titled
    assert 'Decision: <a href="#section-1-1">' in titled
    assert 'Version 1.1.0; ratio 1.1; step 2.' in titled
    assert '<link href=' not in titled and '<a name=' not in titled
print('PASS full reader: opt-in title labels, linked references, stable anchors, numeric data and unchanged legacy mode')
