#!/usr/bin/env python3
"""Mandatory validation of actual reader, Markdown and both PDF appearances."""
import argparse, hashlib, json, re, subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
from pypdf import PdfReader

PREFIX=re.compile(r'^\s*\d+(?:\.\d+)+(?:[.)])?\s+')
def norm(s):return ' '.join(s.split())
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
class Reader(HTMLParser):
 def __init__(self):
  super().__init__();self.ids=set();self.links=[];self.headings=[];self.heading=None;self.level=None;self.figures=0;self.subsections=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=="figure":self.figures+=1
  if 'id' in a:self.ids.add(a['id'])
  if tag=='a' and a.get('href','').startswith('#') and len(a['href'])>1:self.links.append(unquote(a['href'][1:]))
  if re.fullmatch(r'h[1-6]',tag):self.heading=[];self.level=int(tag[1])
 def handle_data(self,data):
  if self.heading is not None:self.heading.append(data)
 def handle_endtag(self,tag):
  if re.fullmatch(r'h[1-6]',tag) and self.heading is not None:
   title=norm(''.join(self.heading));self.headings.append((self.level,title))
   if self.level in (3,4) and self.figures==0:self.subsections.append(title)
   self.heading=None
  if tag=='figure':self.figures=max(0,self.figures-1)

def markdown_headings(text):
 fence=None;headings=[]
 for line in text.splitlines():
  f=re.match(r'^\s*(`{3,}|~{3,})',line)
  if f:
   if fence is None:fence=f[1]
   elif f[1][0]==fence[0] and len(f[1])>=len(fence):fence=None
   continue
  if fence:continue
  m=re.match(r'^#{1,6}\s+(.+)',line)
  if m:headings.append(m[1])
 return headings

def validate(book,html,pdfs,markdown):
 assert len(pdfs)==2,'Both Daytime and Late night PDFs are mandatory'
 reader=Reader();reader.feed(Path(html).read_text());assert reader.headings,'Reader has no headings'
 bad=[s for _,s in reader.headings if PREFIX.match(s)];assert not bad,('Visible decimal HTML heading',bad)
 assert not (set(reader.links)-reader.ids),('Broken HTML targets',sorted(set(reader.links)-reader.ids))
 mh=markdown_headings(Path(markdown).read_text());assert mh,'Markdown has no headings'
 assert not [s for s in mh if PREFIX.match(s)],'Visible decimal Markdown heading'
 # H3/H4 are rendered subsection titles; preserve their text in every format.
 titles={s for s in reader.subsections if len(s)>1}
 # Responsive diagram group labels may differ from PDF diagram layout; all their headings still pass the prefix rule.
 md=norm(Path(markdown).read_text()).replace('\\','')
 for title in titles:assert title in md,('Missing Markdown subsection',title)
 reports=[]
 for pdf in pdfs:
  text=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
  doc=PdfReader(pdf,strict=True);outlines=[]
  def walk(items):
   for item in items:
    if isinstance(item,list):walk(item)
    else:outlines.append(str(item.title))
  walk(doc.outline)
  assert not [x for x in outlines if PREFIX.match(x)],(str(pdf),'Visible decimal PDF outline heading')
  normalized=norm(text).casefold()
  for title in titles:
   assert title.casefold() in normalized,(str(pdf),'Missing PDF subsection',title)
   # Check text at heading lines against the actual title inventory, not arbitrary decimal data.
   pattern = r'(?im)^\s*\d+(?:\.\d+)+(?:[.)])?\s+' + r'\s+'.join(re.escape(word) for word in title.split())
   assert not re.search(pattern,text),(str(pdf),'Visible decimal PDF heading',title)
  reports.append({'path':str(pdf),'sha256':digest(pdf),'pages':len(doc.pages),'outlines':len(outlines)})
 return {'status':'passed','subsections':len(titles),'pdfs':reports,'html':{'path':str(html),'sha256':digest(html)},'markdown':{'path':str(markdown),'sha256':digest(markdown)},'internalLinks':len(reader.links),'policy':'mandatory-title-only-v1'}

def collection(root,site):
 root=Path(root);site=Path(site);catalog=json.loads((root/'catalog.json').read_text());results=[]
 for book in catalog['books']:
  if book['status']!='published':continue
  folder=root/book['directory'];manifest=json.loads((folder/'pdf-variants.json').read_text());variants=manifest['variants']
  assert {v['theme'] for v in variants}=={'light','dark'} and len(variants)==2
  md=site/book['id']/f"editions/v{book['version']}/{book['id']}-v{book['version']}.md"
  result=validate(folder,site/book['id']/'index.html',[root/v['path'] for v in variants],md);result['id']=book['id'];result['version']=book['version'];results.append(result)
 assert results,'No current published books'
 return {'status':'passed','policy':'mandatory-title-only-v1','books':results}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--book',type=Path);p.add_argument('--html',type=Path);p.add_argument('--markdown',type=Path);p.add_argument('--pdf',action='append',type=Path);p.add_argument('--collection',type=Path);p.add_argument('--site',type=Path);p.add_argument('--output',type=Path)
 a=p.parse_args();result=collection(a.collection,a.site) if a.collection else validate(a.book,a.html,a.pdf,a.markdown)
 if a.output:a.output.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result))
