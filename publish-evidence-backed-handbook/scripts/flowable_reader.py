#!/usr/bin/env python3
"""Render a handbook's ReportLab story through the shared reader implementation."""
from pathlib import Path
import argparse
import json


def build_reader(book_root, config, output, chrome=None):
 config=dict(config)
 if config.get('cssExtension'):
  config['extraCss']=(Path(__file__).resolve().parent.parent/'assets/reader'/config['cssExtension']).read_text().rstrip('\n')
 r=Path(book_root).resolve()
 out=Path(output).resolve()
 chrome=Path(chrome) if chrome else Path(__file__).resolve().parent.parent/'assets/reader/reader-chrome.html'
 import importlib.util, json, re, html, shutil, hashlib
 from reportlab.platypus import Paragraph,Table,KeepTogether
 from screenshot_figures import ScreenshotFigure, copy_figure_assets, figure_html
 spec=importlib.util.spec_from_file_location('release',r/'source/build_handbook.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 out.mkdir(parents=True,exist_ok=True);shutil.copytree(r/'assets/chapter-art/pdf',out/'assets',dirs_exist_ok=True)
 def txt(s):
  s=re.sub(r"<link href=['\"]([^'\"]+)['\"]>",r'<a href="\1">',s).replace('</link>','</a>').replace('<br/>','<br>');return s
 headings=[];blocks=[];section_open=False;subsection_open=False;index=0

 def prose_list_kind(table):
  if not table._cellvalues or any(len(row)!=2 for row in table._cellvalues):return None
  markers=[]
  for row in table._cellvalues:
   marker=row[0]
   while isinstance(marker,Table) and len(marker._cellvalues)==1 and len(marker._cellvalues[0])==1:
    marker=marker._cellvalues[0][0]
   if not isinstance(marker,Paragraph):return None
   markers.append(marker)
  styles={marker.style.name for marker in markers}
  if styles=={'BulletMark'}:return 'bullet'
  if styles=={'Checkbox'}:return 'checklist'
  if styles=={'StepNumber'}:
   start=int(markers[0].getPlainText())
   if [marker.getPlainText() for marker in markers]!=[str(i) for i in range(start,start+len(markers))]:
    raise ValueError('Numbered prose steps must preserve their sequence')
   return 'numbered'
  return None

 def item(x):
  nonlocal section_open,subsection_open,index
  if isinstance(x,Paragraph):
   s=x.style.name;t=txt(x.text)
   if s=='CoverTitle' or (config['skipContentsText'] and x.getPlainText()=='Contents') or any(x.style is getattr(m,name,None) for name in config['skipStyles']):return
   if s in ['H1','H2','H3']:
    index+=1;key='section-'+str(index)
    if s=='H1':
     if subsection_open:blocks.append('</section>');subsection_open=False
     if section_open:blocks.append('</section>')
     number=re.match(r'(\d+)\. ',getattr(x,'_toc_title','')) if config['chapterNumbers'] else None
     chapter_attr=f' data-chapter="{number[1]}"' if number else ''
     blocks.append(f'<section class="chapter" id="{key}" tabindex="-1"{chapter_attr}>');section_open=True
     headings.append((key,x.getPlainText()))
    if s=='H2':
     if subsection_open:blocks.append('</section>')
     blocks.append(f'<section class="source-section" id="{key}">');subsection_open=True
    if s=='H1':blocks.append('<header class="chapter-header">')
    blocks.append(f'<h{2 if s=="H1" else 3 if s=="H2" else 4}>{t}</h{2 if s=="H1" else 3 if s=="H2" else 4}>')
    if s=='H1':blocks.append('</header>')
   elif s not in ['CoverDeck','ChapterKicker']:blocks.append(f'<p>{t}</p>')
  elif isinstance(x,Table):
   if hasattr(x, '_code_body'):
    language=getattr(x, '_code_language', '').lower()
    terminal=language in {'sh','shell','bash','zsh','fish','console','powershell','ps1'}
    label='Terminal' if terminal else 'Code'
    css='reader-code'+(' reader-terminal' if terminal else '')
    language_class=' class="language-'+html.escape(language,quote=True)+'"' if language else ''
    blocks.append('<figure class="'+css+'"><figcaption class="reader-code-heading"><span class="reader-code-label">'+label+'</span></figcaption><pre><code'+language_class+'>'+html.escape(x._code_body)+'</code></pre></figure>')
    return
   # Markdown prompt directives retain their semantic paragraph styles in the
   # PDF story. Render them as examples, rather than ordinary data tables.
   if (len(x._cellvalues)>1 and all(len(row)==1 and isinstance(row[0],Paragraph) for row in x._cellvalues)
       and x._cellvalues[0][0].style.name=='PromptHead'
       and all(row[0].style.name=='PromptBody' for row in x._cellvalues[1:])):
    heading=txt(x._cellvalues[0][0].text)
    body=''.join(cell(row[0]) for row in x._cellvalues[1:])
    blocks.append('<figure class="reader-prompt"><figcaption class="reader-prompt-heading"><span class="reader-prompt-label">Prompt</span><span class="reader-prompt-title">'+heading+'</span></figcaption><div class="reader-prompt-body">'+body+'</div></figure>')
    return
   kind=prose_list_kind(x) if config['semanticLists'] else None
   if kind:
    tag='ol' if kind=='numbered' else 'ul'
    css='reader-prose-list'+(' reader-checklist' if kind=='checklist' else '')
    mark='<span aria-hidden="true">☐</span>' if kind=='checklist' else ''
    start_attr=''
    if kind=='numbered':
     marker=x._cellvalues[0][0]
     while isinstance(marker,Table):marker=marker._cellvalues[0][0]
     if marker.getPlainText()!='1':start_attr=f' start="{int(marker.getPlainText())}"'
    blocks.append(f'<{tag}{start_attr} class="{css}">'+''.join('<li>'+mark+cell(row[1])+'</li>' for row in x._cellvalues)+f'</{tag}>')
    return
   if config['semanticLists'] and len(x._cellvalues)==1 and len(x._cellvalues[0])==1:
    blocks.append('<aside class="reader-callout">'+cell(x._cellvalues[0][0])+'</aside>')
    return
   rows=[]
   for row in x._cellvalues:
    cells=[]
    for c in row:
     old=blocks; temp=[]
     # nested tables retained as HTML with their original content
     cells.append(cell(c))
    is_header=config['tableHeaders'] and not rows and (all(re.sub('<[^>]+>','',v).isupper() for v in cells) or all(isinstance(c,Paragraph) and c.style.name=='TableHead' for c in row))
    tag='th' if is_header else 'td'
    rows.append('<tr>'+''.join(f'<{tag}'+(' scope="col"' if is_header else '')+'>'+v+f'</{tag}>' for v in cells)+'</tr>')
   blocks.append('<div class="table-scroll" tabindex="0"><table>'+''.join(rows)+'</table></div>')
  elif isinstance(x,KeepTogether):
   for c in x._content:item(c)
  elif isinstance(x,ScreenshotFigure):
   identity=json.loads((r/'pdf-config.json').read_text())
   copy_figure_assets(x.figure,out,identity['id'],identity['version'])
   blocks.append(figure_html(x.figure,identity['id'],identity['version']))
  elif isinstance(x,getattr(m,config['illustrationClass'])):blocks.append(f'<figure class="chapter-art"><img src="assets/chapter-{x.number:02d}.png" alt="{html.escape(config["artAlt"].format(number=x.number))}" loading="lazy"></figure>')
  elif isinstance(x,tuple(getattr(m,name) for name in config['diagramClasses'])):
   # Preserve original authored diagrams by rendering their existing ReportLab flowable.
   from reportlab.pdfgen import canvas
   import subprocess
   name=type(x).__name__;p=out/'assets'/f'{name}.pdf';c=canvas.Canvas(str(p),pagesize=(x.width,x.height));x.drawOn(c,0,0);c.save()
   subprocess.run(['pdftoppm','-r','216','-singlefile','-png',str(p),str(out/'assets'/name)],check=True);p.unlink()
   from diagram_data import load_diagram
   definition=load_diagram(r,name)
   description=definition.get('printAlt')
   if description:
    blocks.append(f'<figure><img src="assets/{name}.png" alt="{html.escape(description)}" loading="lazy"><figcaption>{html.escape(definition["printCaption"])}</figcaption></figure>')
   else:
    blocks.append(f'<figure><img src="assets/{name}.png" alt="{html.escape(name)}" loading="lazy"></figure>')

 def cell(c):
  if isinstance(c,Paragraph):return '<p>'+txt(c.text)+'</p>'
  if isinstance(c,Table):return '<table>'+''.join('<tr>'+''.join('<td>'+cell(v)+'</td>' for v in row)+'</tr>' for row in c._cellvalues)+'</table>'
  if isinstance(c,(list,tuple)):return ''.join(cell(v) for v in c)
  return html.escape(str(c)) if c else '<br>'
 # The web cover is rendered from the publication manifest below. Convert only
 # the PDF body, starting at its first chapter, so cover metadata cannot leak.
 story=getattr(m,config['storyFunction'])()
 body_start=next(i for i,x in enumerate(story) if isinstance(x,Paragraph) and x.style.name=='H1')
 for x in story[body_start:]:item(x)
 if subsection_open:blocks.append('</section>')
 if section_open:blocks.append('</section>')
 nav='<ol>'+''.join(f'<li><a href="#{key}">{html.escape(title)}</a></li>' for key,title in headings)+'</ol>'
 prod=chrome.read_text()
 dialogs=prod[prod.index('<dialog'):prod.rindex('</body>')];dialogs=re.sub(r'(<nav[^>]*>)[\s\S]*?(</nav>)',lambda a:a[1]+nav+a[2],dialogs,count=1)
 manifest=json.loads((r/'release-manifest.json').read_text())
 publication=json.loads((r/'publication.json').read_text())
 pdf=Path(manifest['pdf']).name
 pages=manifest['pages']
 version=manifest['version']
 title=manifest['title']
 from datetime import date
 publication_date=date.fromisoformat(manifest['date'])
 date_label=publication_date.strftime('%B %d, %Y').replace(' 0',' ')
 # Reuse the production reader's dialog chrome with this edition's download metadata.
 dialogs=re.sub(r'../output/pdf/production-ai-engineering-[^\"]+\.pdf',pdf,dialogs).replace('Production AI Engineering',config["downloadTitle"])
 dialogs=re.sub(r'\b\d+ pages\b',f'{pages} pages',dialogs)
 credit=f"{html.escape(publication['author'])}, <a href=\"{html.escape(publication['authorSite'],quote=True)}\">surfaces.systems</a>"
 sidebar=f'<div class="sidebar-meta"><div class="sidebar-actions"><button class="text-button search-trigger js-only" type="button" data-open-search aria-haspopup="dialog" aria-controls="search-dialog" aria-keyshortcuts="/">Search</button><a class="text-link" href="{pdf}" download aria-label="Download {html.escape(config["downloadTitle"])} as a PDF, {pages} pages">PDF</a></div></div>'
 cover=f'<section class="cover" aria-labelledby="cover-title"><div class="cover-rule" aria-hidden="true"></div><h1 id="cover-title">{html.escape(title)}</h1><p class="cover-subtitle">{html.escape(config["subtitle"])}</p><p class="cover-credit">{credit}</p><p class="cover-date"><a href="{html.escape(publication["editionUrl"],quote=True)}">{date_label} · Version {version}</a></p><nav class="cover-actions site-only" aria-label="Handbook actions"><a class="action-link action-link-primary" href="#contents">Explore the handbook</a><a class="action-link" href="{pdf}" download aria-label="Download {html.escape(config["downloadTitle"])} as a PDF, {pages} pages">Download PDF <span>{pages} pages</span></a></nav></section>'
 body=''.join(blocks)
 body=re.sub(r'(<section class="chapter"[^>]*>)(.*?)(?=<section class="chapter"|$)',lambda a:a[1].replace('class="chapter"','class="chapter source-section"')+a[2] if 'class="source-section"' not in a[2] else a[0],body,flags=re.S)
 markup=f'''<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="author" content="Michael Long"><meta name="color-scheme" content="light"><link rel="icon" type="image/png" href="/assets/favicon.png"><title>{html.escape(title)} · Michael Long</title><link rel="canonical" href="{html.escape(config["canonicalUrl"])}"><link rel="stylesheet" href="/reader.css"><link rel="stylesheet" href="reader.css"><link rel="stylesheet" href="/gallery.css"><script src="/gallery-focus.js" defer></script><script src="/reader.js" defer></script></head><body id="book-top"><a class="skip-link" href="#main-content">Skip to handbook</a><div class="reading-progress" aria-hidden="true"><span></span></div><header class="mobile-bar"><a class="handbooks-return-mobile" href="/" aria-label="All handbooks">←</a><div class="mobile-actions"><button class="text-button search-trigger js-only" data-open-search type="button" aria-haspopup="dialog" aria-controls="search-dialog">Search</button><button class="text-button js-only" data-open-toc type="button" aria-haspopup="dialog" aria-controls="toc-dialog">Contents</button></div></header><div class="book-shell"><aside class="sidebar"><a class="handbooks-return" href="/" aria-label="All handbooks">← All handbooks</a><a class="sidebar-brand" href="#book-top"><span>A handbook</span><strong>{html.escape(title)}</strong></a><nav class="sidebar-nav" aria-label="Table of contents">{nav}</nav>{sidebar}</aside><main id="main-content" tabindex="-1">{cover}<section class="contents-page" id="contents"><h2>Contents</h2>{nav}</section>{body}</main></div>{dialogs}</body></html>'''
 markup=markup.replace('https://handbooks.mikelong.ai','https://handbooks.surfaces.systems')
 (out/'index.html').write_text(markup)
 (out/'reader.css').write_text((Path(__file__).resolve().parent.parent/'assets/reader/flowable-reader.css').read_text().rstrip('\n')+config['extraCss'])
 shutil.copy2(r/'output/pdf'/pdf,out/pdf)
 print(len(headings),'sections',len(markup),'HTML bytes')


def main(book_root):
 root=Path(book_root).resolve()
 parser=argparse.ArgumentParser()
 parser.add_argument('--reader-chrome','--production-reader',dest='reader_chrome',type=Path)
 parser.add_argument('--output',type=Path,default=root/'output/reader-candidate')
 args=parser.parse_args()
 config=json.loads((root/'source/reader-config.json').read_text())
 build_reader(root,config,args.output,args.reader_chrome)
