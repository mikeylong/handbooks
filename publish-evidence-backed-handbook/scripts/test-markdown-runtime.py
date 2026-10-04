#!/usr/bin/env python3
"""Rendered future-title regression for the shared Markdown/directive runtime."""
import argparse,json,subprocess,sys,os,shutil,hashlib
from pathlib import Path
from pypdf import PdfReader
from PIL import Image,ImageDraw
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output).resolve()
if out.exists():raise SystemExit('Use a fresh fixture directory')
out.mkdir(parents=True);kit=Path(__file__).resolve().parents[1];book=out/'future-markdown-title';(book/'source/diagrams').mkdir(parents=True);pairs=[]
for n in range(1,26):
 for theme in ['pdf','dark']:
  dest=book/f'assets/chapter-art/{theme}/chapter-{n:02}.png';dest.parent.mkdir(parents=True,exist_ok=True);im=Image.new('RGBA',(1400,800),'white' if theme=='pdf' else (0,0,0,0));ImageDraw.Draw(im).ellipse((250,150,1150,650),outline='black' if theme=='pdf' else '#eeece6',width=8);im.convert('RGB').save(dest) if theme=='pdf' else im.save(dest)
 light=book/f'assets/chapter-art/pdf/chapter-{n:02}.png';dark=book/f'assets/chapter-art/dark/chapter-{n:02}.png';h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();pairs.append({'chapter':n,'light':str(light.relative_to(book)),'dark':str(dark.relative_to(book)),'lightSha256':h(light),'darkSha256':h(dark),'darkDimensions':[1400,800],'transparencyReview':{'alphaRange':[0,255]}})
(book/'artwork-pairs.json').write_text(json.dumps({'artwork':pairs}))
for name,count in [('CoverDiagram',5),('WorkflowLoop',8)]:
 nodes=[{'id':str(i),'label':f'Stage {i}'} for i in range(1,count+1)];edges=[{'from':str(i),'to':str(i+1)} for i in range(1,count)];
 if name=='WorkflowLoop':edges.append({'from':str(count),'to':'1','feedback':True})
 (book/f'source/diagrams/{name}.json').write_text(json.dumps({'title':name,'kind':'sequence','nodes':nodes,'edges':edges,'note':'Synthetic feedback','printAlt':'Synthetic sequence','printCaption':'Synthetic diagram'}))
source='# Orientation\n\nSynthetic future title.\n\n<!-- DIAGRAM workflow-loop -->\n'
for n in range(1,26):
 source+=f'\n<!-- CHAPTER {n:02} | Chapter {n} | A synthetic regression chapter. -->\n\n# Chapter {n}\n\n## A mixed-case table\n\n| Meaning | Value |\n|---|---|\n| Shared renderer | Chapter {n} |\n\n18. Reference one.\n19. Reference two.\n\n::: prompt Fixture | Prompt {n}\nPreserve the numbered reference and mixed-case header.\n:::\n'
(book/'manuscript.md').write_text(source);(book/'source/build_handbook.py').write_text('from markdown_layout import *\n')
cfg={'id':book.name,'title':'Synthetic future Markdown title','subtitle':'Portable runtime regression','version':'1.0.0','date':'2026-10-02','renderer':'reportlab','source':'source/build_handbook.py','markdown':'manuscript.md','story':'parse_markdown','docClass':'GuideDocTemplate','coverKicker':'FIXTURE','coverTitleHtml':'Future title','contentsDeck':'Synthetic reference map','editionLabel':'Synthetic fixture','chapterCount':25,'releasedPdf':None,'pageLabelStyle':'frontmatter-roman','chapterSourceNotes':{str(n):f'Source note for chapter {n}.' for n in range(1,26)}}
(book/'pdf-config.json').write_text(json.dumps(cfg));env={**os.environ,'HANDBOOK_PUBLISHING_TOOLKIT':str(kit)}
for theme in ['light','dark']:
 subprocess.run(['node',str(kit/'scripts/build-pdf-variants.mjs'),'--book',str(book),'--config',str(book/'pdf-config.json'),'--theme',theme,'--output',str(out/f'{theme}.pdf'),'--python',sys.executable],env=env,check=True)
r=PdfReader(out/'light.pdf');pages=len(r.pages);shutil.copytree(book/'assets/chapter-art/pdf',book/'reader/assets');(book/'output/pdf').mkdir(parents=True);shutil.copy2(out/'light.pdf',book/'output/pdf/light.pdf')
(book/'release-manifest.json').write_text(json.dumps({'title':cfg['title'],'version':'1.0.0','date':'2026-10-02','pdf':'output/pdf/light.pdf','pages':pages}));(book/'publication.json').write_text(json.dumps({'author':'Fixture author','authorSite':'https://example.org','review':None,'editionUrl':'/fixture/editions/v1.0.0/','releaseUrl':'/fixture/editions/v1.0.0/'}))
rc={'skipContentsText':True,'skipStyles':['TOC_TITLE'],'chapterNumbers':True,'semanticLists':True,'tableHeaders':True,'illustrationClass':'ChapterIllustration','artAlt':'Synthetic illustration {number}','diagramClasses':['CoverDiagram','WorkflowLoop'],'storyFunction':'parse_markdown','downloadTitle':cfg['title'],'subtitle':cfg['subtitle'],'canonicalUrl':'/fixture/','extraCss':''}
env.update(HANDBOOK_BOOK_ROOT=str(book),HANDBOOK_PDF_CONFIG=json.dumps(cfg),HANDBOOK_PDF_THEME='light',PYTHONPATH=str(kit/'scripts'))
subprocess.run([sys.executable,'-c','from flowable_reader import build_reader;import json,sys;build_reader(sys.argv[1],json.loads(sys.argv[2]),sys.argv[3])',str(book),json.dumps(rc),str(book/'reader')],env=env,check=True)
html=(book/'reader/index.html').read_text();assert html.count('class="reader-prompt"')==25;assert html.count('class="reader-prompt-label">Prompt')==25;assert html.count('<ol start="18" class="reader-prose-list">')==25;assert html.count('<th scope="col"><p>Meaning</p></th>')==25;assert html.count('class="chapter-art"')==25
for n in range(1,26):assert f'Source note for chapter {n}.' in html
assert list(r.pages[0].mediabox)==[0,0,420,594.96];assert r.page_labels[0]=='i';assert '1' in r.page_labels
subprocess.run([sys.executable,str(kit/'scripts/validate_pdf_pair.py'),'--retained',str(out/'light.pdf'),'--candidate',str(out/'dark.pdf'),'--output',str(out/'parity')],check=True)
result={'status':'passed','chapters':25,'pages':pages,'checks':['shared Markdown rendering','mixed-case semantic table headers','numbered references starting at 18','chapter source notes','governing trim','Roman and Arabic page labels','paired PDF parity','reader artwork count']};(out/'markdown-runtime-tests.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
