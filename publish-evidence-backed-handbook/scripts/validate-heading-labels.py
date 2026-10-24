#!/usr/bin/env python3
"""Validate actual title-only HTML, Markdown and PDF artifacts for an opted-in book."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess

class Reader(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=set();self.links=[];self.headings=[];self.heading=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.add(a['id'])
        if tag=='a' and a.get('href','').startswith('#'):self.links.append(a['href'][1:])
        if tag in ('h2','h3','h4'):self.heading=[]
    def handle_data(self,data):
        if self.heading is not None:self.heading.append(data)
    def handle_endtag(self,tag):
        if tag in ('h2','h3','h4') and self.heading is not None:self.headings.append(''.join(self.heading));self.heading=None

def validate(book,html,pdfs,markdown):
    book=Path(book);config=json.loads((book/'source/reader-config.json').read_text())
    if config.get('subsectionLabels')!='titles':raise ValueError('Book has not selected title-only subsection labels')
    source=(book/'source/build_handbook.py').read_text()
    titles=dict(re.findall(r"page\('(\d+\.\d+) ([^']+)'",source))
    assert titles,'No source subsection identities found'
    reader=Reader();reader.feed(Path(html).read_text())
    assert not [x for x in reader.headings if re.match(r'^\d+\.\d+\s',x)],'Visible decimal HTML heading'
    for key,title in titles.items():
        assert title in reader.headings,(key,title,'missing HTML heading')
        assert 'section-'+key.replace('.','-') in reader.ids,(key,'missing source anchor')
    assert not (set(reader.links)-reader.ids),('Broken HTML links',set(reader.links)-reader.ids)
    assert not re.search(r'^#{1,6}\s+\d+\.\d+\s',Path(markdown).read_text(),re.M),'Visible decimal Markdown heading'
    for pdf in pdfs:
        text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
        assert not re.search(r'^\s*\d+\.\d+\s+[A-Za-z]',text,re.M),(str(pdf),'Visible decimal PDF heading')
        normalized=' '.join(text.split())
        for title in titles.values():assert title in normalized,(str(pdf),'Missing PDF heading',title)
    return {'status':'passed','subsections':len(titles),'pdfs':[str(x) for x in pdfs],'html':str(html),'markdown':str(markdown),'internalLinks':len(reader.links)}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--book',type=Path,required=True);p.add_argument('--html',type=Path,required=True);p.add_argument('--markdown',type=Path,required=True);p.add_argument('--pdf',action='append',type=Path,required=True);p.add_argument('--output',type=Path)
    a=p.parse_args();result=validate(a.book,a.html,a.pdf,a.markdown)
    if a.output:a.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result))
