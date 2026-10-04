#!/usr/bin/env python3
"""Exercise Markdown fences through the shared hosted reader without altering commands."""
import json, os, tempfile
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
    shell='printf "<ready> & done"\n\n  npm run handoff -- 4207'
    data='{\n  "status": "ready"\n}'
    (root/'source.md').write_text('# Command fixture\n\n```sh\n'+shell+'\n```\n\n```json\n'+data+'\n```\n\n::: prompt Claude Design | Example\nKeep the chosen values.\n:::\n\n::: callout Note | Ordinary note\nThis remains prose.\n:::\n')
    config={'markdown':'source.md','coverKicker':'Fixture','coverTitleHtml':'Fixture','subtitle':'Fixture','editionLabel':'Fixture','chapterSourceNotes':{}}
    os.environ['HANDBOOK_BOOK_ROOT']=str(root);os.environ['HANDBOOK_PDF_CONFIG']=json.dumps(config)
    (root/'source/build_handbook.py').write_text('from markdown_layout import *\n')
    (root/'release-manifest.json').write_text(json.dumps({'pdf':'fixture.pdf','pages':1,'version':'0.0.0','title':'Fixture','date':'2026-10-04'}))
    (root/'publication.json').write_text(json.dumps({'author':'Fixture author','authorSite':'https://example.com','review':None,'editionUrl':'https://example.com','releaseUrl':'https://example.com'}))
    (root/'output/pdf/fixture.pdf').write_bytes(b'fixture')
    build_reader(root,{'skipContentsText':True,'skipStyles':['TOC_TITLE'],'chapterNumbers':False,'semanticLists':True,'tableHeaders':True,'illustrationClass':'ChapterIllustration','diagramClasses':['CoverDiagram','WorkflowLoop','SurfaceContinuityDiagram'],'storyFunction':'parse_markdown','downloadTitle':'Fixture','subtitle':'Fixture','canonicalUrl':'https://example.com','extraCss':''},root/'reader')
    html=(root/'reader/index.html').read_text();parsed=CodeReader();parsed.feed(html)
    assert len(parsed.blocks)==2
    assert parsed.blocks[0]=={'class':'reader-code reader-terminal','text':shell,'language':'language-sh'},parsed.blocks
    assert parsed.blocks[1]=={'class':'reader-code','text':data,'language':'language-json'}
    assert '<span class="reader-code-label">Terminal</span>' in html
    assert '<span class="reader-code-label">Code</span>' in html
    assert html.count('class="reader-prompt"')==1
    assert 'This remains prose.' in html and html.count('reader-terminal')==1
print('PASS shell identity, exact whitespace and escaping, non-shell code, prompts and prose callouts')
