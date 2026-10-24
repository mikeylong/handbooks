#!/usr/bin/env python3
"""Exercise Markdown fences through the shared hosted reader without altering commands."""
import json, os, tempfile, subprocess, sys
from pathlib import Path
from html.parser import HTMLParser
from flowable_reader import build_reader

class CodeReader(HTMLParser):
    def __init__(self):
        super().__init__(); self.blocks=[]; self.current=None; self.in_code=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='figure' and 'reader-code' in attrs.get('class','').split():
            self.current={'class':attrs['class'],'text':''}
        if tag=='code' and self.current is not None:
            self.in_code=True;self.current['language']=attrs.get('class','')
    def handle_data(self, text):
        if self.in_code:self.current['text']+=text
    def handle_endtag(self, tag):
        if tag=='code':self.in_code=False
        if tag=='figure' and self.current is not None:
            self.blocks.append(self.current);self.current=None

with tempfile.TemporaryDirectory(prefix='handbook-code-') as directory:
    root=Path(directory)
    for name in ['source','assets/chapter-art/pdf','output/pdf']:(root/name).mkdir(parents=True,exist_ok=True)
    shell='printf "<ready> & done [S9]"\n\n  npm run handoff -- 4207'
    data='{\n  "status": "ready"\n}'
    (root/'source.md').write_text('# Command fixture\n\n```sh\n'+shell+'\n```\n\n```json\n'+data+'\n```\n\n::: prompt Claude Design | Example [S9]\nKeep the chosen values. [S9]\n:::\n\n::: callout Note | Ordinary note\nThis remains prose.\n:::\n')
    config={'markdown':'source.md','coverKicker':'Fixture','coverTitleHtml':'Fixture','subtitle':'Fixture','editionLabel':'Fixture','chapterSourceNotes':{}}
    os.environ['HANDBOOK_BOOK_ROOT']=str(root);os.environ['HANDBOOK_PDF_CONFIG']=json.dumps(config)
    (root/'source/build_handbook.py').write_text('''from markdown_layout import *
def contents_fixture():
    story = parse_markdown()
    # An introduction can precede the PDF contents page, as in a future title.
    first = next(i for i, x in enumerate(story) if isinstance(x, Paragraph) and x.style.name == 'H1')
    kicker = ParagraphStyle('TOCKicker', parent=BODY)
    title = ParagraphStyle('TOCTitle', parent=H1)
    story[first + 1:first + 1] = [P('CONTENTS', kicker), P('Contents', title)]
    story += [Paragraph('Supported [S9] and [CTX-02]. Unknown [S99]; numbers [4, 4].', BODY),
              Paragraph('An existing <link href="https://example.com/?q=[S9]">link [S9]</link>.', BODY),
              Paragraph('<b>[S9]</b> Source nine', BODY), Paragraph('<b>[CTX-02] Source two</b>', BODY)]
    compact = Table([[P("CHOICE"), P("ACTION")], [P("Observed delay"), P("Small intervention")]])
    compact.reader_compact = True
    story += [compact, Table([[P("ORDINARY"), P("TABLE")]])]
    return story
''')
    (root/'release-manifest.json').write_text(json.dumps({'pdf':'fixture.pdf','pages':1,'version':'0.0.0','title':'Fixture','date':'2026-10-04'}))
    (root/'publication.json').write_text(json.dumps({'author':'Fixture author','authorSite':'https://example.com','review':None,'editionUrl':'https://example.com','releaseUrl':'https://example.com'}))
    (root/'output/pdf/fixture.pdf').write_bytes(b'fixture')
    build_reader(root,{'skipContentsText':True,'skipStyles':[],'chapterNumbers':False,'semanticLists':True,'tableHeaders':True,'illustrationClass':'ChapterIllustration','diagramClasses':['CoverDiagram','WorkflowLoop','SurfaceContinuityDiagram'],'storyFunction':'contents_fixture','downloadTitle':'Fixture','subtitle':'Fixture','canonicalUrl':'https://example.com','extraCss':''},root/'reader')
    html=(root/'reader/index.html').read_text();parsed=CodeReader();parsed.feed(html)
    assert html.count('class="table-scroll reader-compact-table"') == 1
    assert html.count('class="table-scroll"') >= 1
    assert '<p>CONTENTS</p>' not in html and '<p>Contents</p>' not in html
    assert html.count('<section class="contents-page" id="contents"><h2>Contents</h2>') == 1
    assert '<a href="#section-1">Command fixture</a>' in html
    assert html.count('class="citation-marker"') == 2
    assert '<a href="#ref-s9" aria-label="Citation S9">[S9]</a>' in html
    assert '<a href="#ref-ctx-02" aria-label="Citation CTX-02">[CTX-02]</a>' in html
    assert html.count('id="ref-s9"') == 1 and html.count('id="ref-ctx-02"') == 1
    assert 'Unknown [S99]; numbers [4, 4].' in html
    assert '<a href="https://example.com/?q=[S9]">link [S9]</a>' in html
    assert 'Keep the chosen values. [S9]</p>' in html
    assert len(parsed.blocks)==2
    assert parsed.blocks[0]=={'class':'reader-code reader-terminal','text':shell,'language':'language-sh'},parsed.blocks
    assert parsed.blocks[1]=={'class':'reader-code','text':data,'language':'language-json'}
    assert '<span class="reader-code-label">Terminal</span>' in html
    assert '<span class="reader-code-label">Code</span>' in html
    assert html.count('class="reader-prompt"')==1
    assert 'This remains prose.' in html and html.count('reader-terminal')==1
print('PASS shell identity, exact whitespace and escaping, non-shell code, prompts and prose callouts')

# CI invokes this entry point; include shared PDF page-layout boundary checks.
subprocess.run([sys.executable, str(Path(__file__).with_name("test-markdown-page-layout.py"))], check=True)
