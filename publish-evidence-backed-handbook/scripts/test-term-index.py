#!/usr/bin/env python3
"""Exercise real multi-pass index pagination and compact HTML references."""
import json,os,tempfile
from pathlib import Path
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak
from reportlab.lib.styles import ParagraphStyle
from term_index import TermIndex,bind_index_targets,validate_entries

with tempfile.TemporaryDirectory(prefix='term-index-') as folder:
    root=Path(folder);(root/'source').mkdir();(root/'output').mkdir()
    entries=[{'term':'Beta','sections':['1.2']},{'term':'Alpha','sections':['1.1']}]
    (root/'source/index-terms.json').write_text(json.dumps({'entries':entries}))
    os.environ['HANDBOOK_BOOK_ROOT']=str(root);os.environ['HANDBOOK_PDF_CONFIG']=json.dumps({'title':'Index fixture'})
    import reportlab_layout as m
    from heading_wrap import prepare_pdf_story
    class Doc(SimpleDocTemplate):
        def afterFlowable(self,f):
            if getattr(f,'_index_section_key',None):
                self.canv.bookmarkPage(f._index_section_anchor);self.canv.addOutlineEntry(f._index_section_title,f._index_section_anchor,level=0)
                self.notify('TermIndexSection',(f._index_section_key,f._index_section_title,self.page,f._index_section_anchor))
    for shift in [False,True]:
        idx=TermIndex(root);story=[m.heading('1.1 First topic'),m.P('First body.'),PageBreak()]
        if shift:story += [m.P('Inserted material.'),PageBreak()]
        story += [m.heading('1.2 Second topic'),m.P('Second body.'),PageBreak(),m.P('Index of terms',m.H1),idx]
        bind_index_targets(story);prepare_pdf_story(story);out=root/'output/fixture.pdf';Doc(str(out)).multiBuild(story)
        assert idx._seen['1.1']['page']=='1';assert idx._seen['1.2']['page']==str(3 if shift else 2)
        (root/'release-manifest.json').write_text(json.dumps({'pdf':'output/fixture.pdf'}))
        html=idx.html(root,{'1.1':{'title':'First topic','anchor':'section-1'},'1.2':{'title':'Second topic','anchor':'section-2'}})
        assert 'class="index-columns"' in html and 'class="index-group"' in html and '<p>' not in html
        assert html.index('>Alpha<')<html.index('>Beta<');assert '>3</a>' in html if shift else '>2</a>' in html
    entries=[{'term':f'Term {n:03}','sections':['1.1','1.2']} for n in range(200)]
    (root/'source/index-terms.json').write_text(json.dumps({'entries':entries}))
    idx=TermIndex(root);story=[m.heading('1.1 First topic'),PageBreak(),m.heading('1.2 Second topic'),PageBreak(),m.P('Index of terms',m.H1),idx]
    bind_index_targets(story);prepare_pdf_story(story);Doc(str(root/'output/large.pdf')).multiBuild(story)
    from pypdf import PdfReader
    assert len(PdfReader(root/'output/large.pdf').pages)>4,'Large index did not paginate'
    try:validate_entries([{'term':'Alpha: First topic. Beta: Second topic','sections':['1.1']}]);raise AssertionError('Dense paragraph accepted')
    except ValueError:pass
    try:validate_entries([{'term':'Alpha','sections':['1.1']},{'term':'Alpha','sections':['1.2']}]);raise AssertionError('Duplicate accepted')
    except ValueError:pass
print('PASS alphabetical entries, automatic pagination shifts, compact linked page labels and rejected legacy data')
