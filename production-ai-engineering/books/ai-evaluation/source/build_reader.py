from pathlib import Path
import importlib.util, json, re, html, shutil, hashlib
from reportlab.platypus import Paragraph,Table,KeepTogether
r=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('release',r/'source/build_handbook.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
out=r/'reader';out.mkdir(exist_ok=True);shutil.copytree(r/'assets/chapter-art/pdf',out/'assets',dirs_exist_ok=True)
def txt(s):
 s=re.sub(r"<link href=['\"]([^'\"]+)['\"]>",r'<a href="\1">',s).replace('</link>','</a>').replace('<br/>','<br>');return s
headings=[];blocks=[];section_open=False;subsection_open=False;index=0

def item(x):
 global section_open,subsection_open,index
 if isinstance(x,Paragraph):
  s=x.style.name;t=txt(x.text)
  if s=='CoverTitle' or x.style is m.TOC_KICKER or x.style is m.TOC_TITLE:return
  if s in ['H1','H2','H3']:
   index+=1;key='section-'+str(index)
   if s=='H1':
    if subsection_open:blocks.append('</section>');subsection_open=False
    if section_open:blocks.append('</section>')
    blocks.append(f'<section class="chapter" id="{key}" tabindex="-1">');section_open=True
    headings.append((key,x.getPlainText()))
   if s=='H2':
    if subsection_open:blocks.append('</section>')
    blocks.append(f'<section class="source-section" id="{key}">');subsection_open=True
   if s=='H1':blocks.append('<header class="chapter-header">')
   blocks.append(f'<h{2 if s=="H1" else 3 if s=="H2" else 4}>{t}</h{2 if s=="H1" else 3 if s=="H2" else 4}>')
   if s=='H1':blocks.append('</header>')
  elif s not in ['CoverDeck','ChapterKicker']:blocks.append(f'<p>{t}</p>')
 elif isinstance(x,Table):
  rows=[]
  for row in x._cellvalues:
   cells=[]
   for c in row:
    old=blocks; temp=[]
    # nested tables retained as HTML with their original content
    cells.append(cell(c))
   rows.append('<tr>'+''.join('<td>'+v+'</td>' for v in cells)+'</tr>')
  blocks.append('<div class="table-scroll" tabindex="0"><table>'+''.join(rows)+'</table></div>')
 elif isinstance(x,KeepTogether):
  for c in x._content:item(c)
 elif isinstance(x,m.ChapterIllustration):blocks.append(f'<figure class="chapter-art"><img src="assets/chapter-{x.number:02d}.png" alt="Engraved illustration for chapter {x.number}" loading="lazy"></figure>')
 elif isinstance(x,(m.EvidenceLoop,m.DataSplitDiagram)):
  # Preserve original authored diagrams by rendering their existing ReportLab flowable.
  from reportlab.pdfgen import canvas
  import subprocess
  name=type(x).__name__;p=out/'assets'/f'{name}.pdf';c=canvas.Canvas(str(p),pagesize=(x.width,x.height));x.drawOn(c,0,0);c.save()
  subprocess.run(['pdftoppm','-r','216','-singlefile','-png',str(p),str(out/'assets'/name)],check=True);p.unlink()
  blocks.append(f'<figure><img src="assets/{name}.png" alt="{html.escape(name)}" loading="lazy"></figure>')
def cell(c):
 if isinstance(c,Paragraph):return '<p>'+txt(c.text)+'</p>'
 if isinstance(c,Table):return '<table>'+''.join('<tr>'+''.join('<td>'+cell(v)+'</td>' for v in row)+'</tr>' for row in c._cellvalues)+'</table>'
 if isinstance(c,(list,tuple)):return ''.join(cell(v) for v in c)
 return html.escape(str(c)) if c else '<br>'
for x in m.build_release_story():item(x)
if subsection_open:blocks.append('</section>')
if section_open:blocks.append('</section>')
nav='<ol>'+''.join(f'<li><a href="#{key}">{html.escape(title)}</a></li>' for key,title in headings)+'</ol>'
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--production-reader',type=Path,default=r.parents[1]/'handbook/index.html');args=parser.parse_args()
prod=args.production_reader.read_text()
dialogs=prod[prod.index('<dialog'):prod.rindex('</body>')];dialogs=re.sub(r'(<nav[^>]*>)[\s\S]*?(</nav>)',lambda a:a[1]+nav+a[2],dialogs,count=1)
pdf='ai-evaluation-v1.0.0-2026-10-01.pdf'
dialogs=re.sub(r'../output/pdf/production-ai-engineering-[^\"]+\.pdf',pdf,dialogs).replace('Production AI Engineering','AI Evaluation Field Guide').replace('105 pages','100 pages')
body=''.join(blocks)
body=re.sub(r'(<section class="chapter"[^>]*>)(.*?)(?=<section class="chapter"|$)',lambda a:a[1].replace('class="chapter"','class="chapter source-section"')+a[2] if 'class="source-section"' not in a[2] else a[0],body,flags=re.S)
markup=f'''<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Evaluation Field Guide · Michael Long</title><link rel="canonical" href="https://handbooks.mikelong.ai/ai-evaluation/"><link rel="stylesheet" href="/production-ai-engineering/styles.css"><link rel="stylesheet" href="reader.css"><script src="/production-ai-engineering/app.js" defer></script></head><body id="book-top"><a class="skip-link" href="#main-content">Skip to handbook</a><div class="reading-progress" aria-hidden="true"><span></span></div><header class="mobile-bar"><a href="/">← All handbooks</a><div class="mobile-actions"><button data-open-search type="button">Search</button><button data-open-toc type="button">Contents</button></div></header><div class="book-shell"><aside class="sidebar"><a href="/">← All handbooks</a><a class="sidebar-brand" href="#book-top"><span>A handbook</span><strong>AI Evaluation Field Guide</strong></a><nav class="sidebar-nav" aria-label="Table of contents">{nav}</nav><div class="sidebar-meta"><p>Michael Long · Version 1.0.0</p><button data-open-search type="button">Search</button> <a href="{pdf}" download>PDF</a></div></aside><main id="main-content" tabindex="-1"><section class="cover"><div class="cover-rule"></div><h1>AI Evaluation Field Guide</h1><p class="cover-subtitle">From a first test case to a defensible launch decision</p><p class="cover-date">October 1, 2026 · Version 1.0.0</p><nav class="cover-actions"><a class="action-link" href="{pdf}" download>Download PDF</a></nav></section><section class="contents-page" id="contents"><h2>Contents</h2>{nav}</section>{body}</main></div>{dialogs}</body></html>'''
(out/'index.html').write_text(markup)
(out/'reader.css').write_text('.chapter{margin-block:4rem}figure{margin-inline:0}.chapter-art{max-width:100%}.chapter-art img{max-height:360px;object-fit:contain}figure img{width:100%;height:auto}table table{margin:0;min-width:0}table td{vertical-align:top}td p{margin:.3rem 0}.table-scroll{overflow-x:auto}h2,h3,h4{scroll-margin-top:5rem}.contents-page a{display:block}.sidebar-nav ol{padding-left:1rem}.sidebar-nav a{display:block}button{cursor:pointer}.sidebar-meta{padding-top:1rem}')
shutil.copy2(r/'output/pdf'/pdf,out/pdf)
print(len(headings),'sections',len(markup),'HTML bytes')
