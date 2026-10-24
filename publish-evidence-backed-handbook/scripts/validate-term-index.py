#!/usr/bin/env python3
"""Check final HTML term entries against the actual PDF's printed page labels."""
import argparse,json,re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from pypdf import PdfReader

class Index(HTMLParser):
    def __init__(self):
        super().__init__();self.depth=0;self.active=False;self.count=0;self.letters=[];self.terms=[];self.refs=[];self.context=[];self.entry=None;self.link=None;self.paragraphs=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);classes=a.get('class','').split()
        if 'data-term-index' in a:self.active=True;self.depth=0;self.count+=1
        if not self.active:return
        if tag not in ['br','img','input','hr','meta','link']:self.depth+=1
        self.context.append((tag,classes))
        if tag=='p':self.paragraphs+=1
        if tag=='li':self.entry={'term':'','links':[]};self.terms.append(self.entry)
        if tag=='a':self.link={'href':a.get('href',''),'page':''};self.entry['links'].append(self.link)
        if tag=='h3':self.letters.append('')
    def handle_data(self,data):
        if not self.active:return
        if any('index-term' in c for _,c in self.context) and self.entry is not None:self.entry['term']+=data
        if self.link is not None:self.link['page']+=data
        if self.context and self.context[-1][0]=='h3':self.letters[-1]+=data
    def handle_endtag(self,tag):
        if not self.active:return
        if tag=='a':self.link=None
        if tag=='li':self.entry=None
        if self.context:self.context.pop()
        self.depth-=1
        if self.depth==0:self.active=False

def validate(book,html,pdfs):
    expected=json.loads((Path(book)/'source/index-terms.json').read_text())['entries'];expected=sorted(expected,key=lambda e:e['term'].casefold())
    raw=Path(html).read_text();index=Index();index.feed(raw)
    assert index.count==1 and not index.paragraphs,'Index must be structured entries, not paragraph prose'
    assert [e['term'] for e in index.terms]==[e['term'] for e in expected],'Missing, duplicate or unsorted index terms'
    assert index.letters==sorted({e['term'][0].upper() for e in expected}),'Incorrect alphabetical groups'
    for pdf in pdfs:
        reader=PdfReader(pdf);outlines={}
        def collect(items):
            for item in items:
                if isinstance(item,list):collect(item)
                elif hasattr(item,'title'):outlines.setdefault(item.title,[]).append(reader.get_destination_page_number(item))
        collect(reader.outline)
        for entry in index.terms:
            assert entry['links'],'Term without a destination'
            for link in entry['links']:
                assert re.fullmatch(r'\d+|[ivxlcdm]+',link['page']),'Index references must be compact page labels'
                anchor=link['href'].removeprefix('#');pattern=r'<section\b[^>]*\bid="'+re.escape(anchor)+r'"[^>]*>([\s\S]*?)<h[234][^>]*>([\s\S]*?)</h[234]>'
                m=re.search(pattern,raw);assert m,('Broken index link',link)
                title=unescape(re.sub('<[^>]*>','',m[2])).strip();matches=outlines.get(title,[]);assert len(matches)==1,('Ambiguous PDF target',title)
                assert reader.page_labels[matches[0]]==link['page'],('Stale printed-page reference',entry['term'],link)
        starts=[page for title,pages in outlines.items() if title.casefold()=='index of terms' for page in pages]
        assert len(starts)==1,'Missing or ambiguous PDF index heading'
        start=starts[0];end=min([page for pages in outlines.values() for page in pages if page>start],default=len(reader.pages))
        text='\n'.join(reader.pages[n].extract_text() for n in range(start,end))
        for entry in index.terms:
            pattern=re.escape(entry['term'])+r'\s*·\s*((?:[0-9]+|[ivxlcdm]+)(?:,\s*(?:[0-9]+|[ivxlcdm]+))*)'
            matches=re.findall(pattern,text)
            assert len(matches)==1,('Missing or duplicate structured PDF term',entry['term'])
            assert re.split(r',\s*',matches[0])==[link['page'] for link in entry['links']],('PDF index page labels disagree',entry['term'])
    return {'status':'passed','terms':len(expected),'letterGroups':len(index.letters),'pageLinks':sum(len(e['links']) for e in index.terms),'pdfs':[str(x) for x in pdfs]}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--book',required=True);p.add_argument('--html',required=True);p.add_argument('--pdf',action='append',required=True);p.add_argument('--output');a=p.parse_args();j=validate(a.book,a.html,a.pdf)
    if a.output:Path(a.output).write_text(json.dumps(j,indent=2)+'\n')
    print(json.dumps(j))
