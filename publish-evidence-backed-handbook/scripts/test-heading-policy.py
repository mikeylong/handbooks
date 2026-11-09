#!/usr/bin/env python3
"""Reject regressions independently in all four distributed formats."""
import importlib.util,tempfile
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
spec=importlib.util.spec_from_file_location('policy',Path(__file__).with_name('validate-heading-labels.py'));policy=importlib.util.module_from_spec(spec);spec.loader.exec_module(policy)
with tempfile.TemporaryDirectory() as temp:
 root=Path(temp);html=root/'index.html';md=root/'book.md';pdfs=[root/'daytime.pdf',root/'late-night.pdf']
 def reset():
  html.write_text('<h2 id="chapter">Chapter 01</h2><h3 id="section-1-1">The full system</h3><p><a href="#section-1-1">The full system</a>. Version 1.2.3, 1.5 seconds.</p>');md.write_text('# Chapter 01\n## The full system\n```md\n## 1.1 literal code\n```\n')
  for pdf in pdfs:make(pdf,'The full system')
 def make(pdf,title):
  c=Canvas(str(pdf));c.bookmarkPage('body');c.addOutlineEntry(title,'body');c.drawString(50,750,title);c.drawString(50,720,'1.5 seconds; version 1.2.3');c.save()
 def check():return policy.validate(root,html,pdfs,md)
 reset();assert check()['status']=='passed'
 # Responsive diagram labels are layout-specific, but their heading prefixes are still prohibited.
 html.write_text(html.read_text()+'<figure data-diagram-rendered="true"><h4>Responsive diagram label</h4></figure>')
 assert check()['status']=='passed'
 html.write_text(html.read_text().replace('>Responsive diagram label','>2.3 Responsive diagram label'))
 try:check()
 except AssertionError:pass
 else:raise AssertionError('Accepted numbered diagram heading')
 reset()
 for pdf in pdfs:make(pdf,'THE FULL SYSTEM')
 assert check()['status']=='passed'
 # A clean outline cannot hide visible uppercase or wrapped numbering in the PDF body.
 for pdf in pdfs:
  reset();c=Canvas(str(pdf));c.bookmarkPage('body');c.addOutlineEntry('The full system','body');c.drawString(50,750,'1.1 THE FULL');c.drawString(50,730,'SYSTEM');c.save()
  try:check()
  except AssertionError:pass
  else:raise AssertionError('Accepted numbered wrapped PDF body with clean outline')
 for surface in ['html','markdown','daytime','late-night','link','missing-pdf']:
  reset()
  if surface=='html':html.write_text(html.read_text().replace('>The full system</h3>','>1.1 The full system</h3>'))
  elif surface=='markdown':md.write_text('## 1.1 The full system')
  elif surface in ['daytime','late-night']:make(pdfs[0 if surface=='daytime' else 1],'1.1 The full system')
  elif surface=='link':html.write_text(html.read_text().replace('href="#section-1-1"','href="#missing"'))
  try:
   policy.validate(root,html,pdfs[:1] if surface=='missing-pdf' else pdfs,md)
  except AssertionError:pass
  else:raise AssertionError('Accepted broken '+surface)
print('PASS mandatory reader, Markdown, Daytime, Late night and target/link rejection tests')
