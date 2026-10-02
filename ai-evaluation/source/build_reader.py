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
# The web cover is rendered from the publication manifest below. Convert only
# the PDF body, starting at its first chapter, so cover metadata cannot leak.
story=m.build_release_story()
body_start=next(i for i,x in enumerate(story) if isinstance(x,Paragraph) and x.style.name=='H1')
for x in story[body_start:]:item(x)
if subsection_open:blocks.append('</section>')
if section_open:blocks.append('</section>')
nav='<ol>'+''.join(f'<li><a href="#{key}">{html.escape(title)}</a></li>' for key,title in headings)+'</ol>'
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--reader-chrome','--production-reader',dest='reader_chrome',type=Path,default=r/'source/reader-chrome.html');args=parser.parse_args()
prod=args.reader_chrome.read_text()
dialogs=prod[prod.index('<dialog'):prod.rindex('</body>')];dialogs=re.sub(r'(<nav[^>]*>)[\s\S]*?(</nav>)',lambda a:a[1]+nav+a[2],dialogs,count=1)
manifest=json.loads((r/'release-manifest.json').read_text())
publication=json.loads((r/'publication.json').read_text())
pdf=Path(manifest['pdf']).name
pages=manifest['pages']
version=manifest['version']
from datetime import date
publication_date=date.fromisoformat(manifest['date'])
date_label=publication_date.strftime('%B %d, %Y').replace(' 0',' ')
# Reuse the production reader's dialog chrome with this edition's download metadata.
dialogs=re.sub(r'../output/pdf/production-ai-engineering-[^\"]+\.pdf',pdf,dialogs).replace('Production AI Engineering','AI Evaluation Field Guide')
dialogs=re.sub(r'\b\d+ pages\b',f'{pages} pages',dialogs)
credit=f"{html.escape(publication['author'])}, <a href=\"{html.escape(publication['authorSite'],quote=True)}\">surfaces.systems</a>"
review=publication['review']
if review:
 release_window=prod[prod.index('<section class="release-window'):prod.index('<nav class="cover-actions')]
 release_window=re.sub(r'data-release-at="[^"]+"',f'data-release-at="{review["at"]}"',release_window)
 release_window=re.sub(r'data-release-time-zone="[^"]+"',f'data-release-time-zone="{review["timeZone"]}"',release_window)
 release_window=re.sub(r'data-release-rrule="[^"]+"',f'data-release-rrule="{review["rrule"]}"',release_window)
 release_window=re.sub(r'<time[^>]*>.*?</time>',f'<time datetime="{review["at"]}" data-release-time>{html.escape(review["label"])}</time>',release_window)
else:
 release_window='<section class="release-window site-only" aria-labelledby="release-window-title" aria-describedby="release-window-policy" data-review-state="unscheduled"><div class="release-window-heading"><p class="release-window-label" id="release-window-title">Next version review</p><p class="release-window-products">Site + PDF</p></div><p class="release-window-schedule">The next review has not been scheduled.</p><p class="release-window-policy" id="release-window-policy">Site and PDF updates publish together after manual review.</p></section>'
sidebar=f'<div class="sidebar-meta"><div class="sidebar-publication"><p class="sidebar-author">{credit}</p><p class="sidebar-edition"><a href="{publication["editionUrl"]}">{date_label}</a> · <a href="{publication["releaseUrl"]}">Version {version}</a></p></div><div class="sidebar-actions"><button class="text-button search-trigger js-only" type="button" data-open-search aria-haspopup="dialog" aria-controls="search-dialog" aria-keyshortcuts="/">Search</button><a class="text-link" href="{pdf}" download aria-label="Download AI Evaluation Field Guide as a PDF, {pages} pages">PDF</a></div></div>'
cover=f'<section class="cover" aria-labelledby="cover-title"><div class="cover-rule" aria-hidden="true"></div><h1 id="cover-title">AI Evaluation Field Guide</h1><p class="cover-subtitle">From a first test case to a defensible launch decision</p><p class="cover-credit">{credit}</p><p class="cover-date">{date_label} · Version {version}</p>{release_window}<nav class="cover-actions site-only" aria-label="Handbook actions"><a class="action-link action-link-primary" href="#contents">Explore the handbook</a><a class="action-link" href="{pdf}" download aria-label="Download AI Evaluation Field Guide as a PDF, {pages} pages">Download PDF <span>{pages} pages</span></a></nav></section>'
body=''.join(blocks)
body=re.sub(r'(<section class="chapter"[^>]*>)(.*?)(?=<section class="chapter"|$)',lambda a:a[1].replace('class="chapter"','class="chapter source-section"')+a[2] if 'class="source-section"' not in a[2] else a[0],body,flags=re.S)
markup=f'''<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="Michael Long"><meta name="color-scheme" content="light"><link rel="icon" type="image/png" href="/assets/favicon.png"><title>AI Evaluation Field Guide · Michael Long</title><link rel="canonical" href="https://handbooks.surfaces.systems/ai-evaluation/"><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="reader.css"><script src="/reader.js" defer></script></head><body id="book-top"><a class="skip-link" href="#main-content">Skip to handbook</a><div class="reading-progress" aria-hidden="true"><span></span></div><header class="mobile-bar"><a href="/">← All handbooks</a><div class="mobile-actions"><button class="text-button search-trigger js-only" data-open-search type="button" aria-haspopup="dialog" aria-controls="search-dialog">Search</button><button class="text-button js-only" data-open-toc type="button" aria-haspopup="dialog" aria-controls="toc-dialog">Contents</button></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a><a class="sidebar-brand" href="#book-top"><span>A handbook</span><strong>AI Evaluation Field Guide</strong></a><nav class="sidebar-nav" aria-label="Table of contents">{nav}</nav>{sidebar}</aside><main id="main-content" tabindex="-1">{cover}<section class="contents-page" id="contents"><h2>Contents</h2>{nav}</section>{body}</main></div>{dialogs}</body></html>'''
(out/'index.html').write_text(markup)
(out/'reader.css').write_text('.chapter{margin-block:4rem}figure{margin-inline:0}.chapter-art{max-width:100%}.chapter-art img{max-height:360px;object-fit:contain}figure img{width:100%;height:auto}table table{margin:0;min-width:0}table td{vertical-align:top}td p{margin:.3rem 0}.table-scroll{overflow-x:auto}h2,h3,h4{scroll-margin-top:5rem}.contents-page a{display:block}.sidebar-nav ol{padding-left:1rem}.sidebar-nav a{display:block}button{cursor:pointer}.sidebar-meta{padding-top:1rem}')
shutil.copy2(r/'output/pdf'/pdf,out/pdf)
print(len(headings),'sections',len(markup),'HTML bytes')
