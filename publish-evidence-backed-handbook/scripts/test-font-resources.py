#!/usr/bin/env python3
"""Ensure unused font cleanup preserves painting and emits valid indirect streams."""
import tempfile,json,subprocess
from pathlib import Path
from reportlab.pdfgen.canvas import Canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
from pypdf.generic import ContentStream
from pdf_font_resources import prune_unpainted_unembedded_fonts
kit=Path(__file__).resolve().parents[1];pdfmetrics.registerFont(TTFont('EmbeddedFixture',str(kit/'assets/design-system/fonts/NotoSans-Regular.ttf')))
with tempfile.TemporaryDirectory(prefix='font-resource-fixture-') as folder:
 root=Path(folder);raw=root/'raw.pdf';c=Canvas(str(raw));c.setFont('EmbeddedFixture',10);c.drawString(40,100,'Painted text must survive.');c.save();r=PdfReader(raw);text=r.pages[0].extract_text();w=PdfWriter(clone_from=r);assert prune_unpainted_unembedded_fonts(w)==['/Helvetica'];dest=root/'fixed.pdf';w.write(dest);r=PdfReader(dest);assert r.pages[0].extract_text()==text
 for page in r.pages:
  for args,op in ContentStream(page.get_contents(),r).operations:
   if op==b'Tf':assert args[0] in page['/Resources']['/Font']
 result=subprocess.run(['pdftoppm','-singlefile','-r','72','-png',str(dest),str(root/'render')],capture_output=True,text=True);assert result.returncode==0 and not result.stderr,result.stderr
 raw=root/'painted-base-font.pdf';c=Canvas(str(raw));c.drawString(40,100,'Unembedded but painted.');c.save();w=PdfWriter(clone_from=PdfReader(raw));assert prune_unpainted_unembedded_fonts(w)==[]
print(json.dumps({'status':'passed','checks':['text preserved','font references resolve','indirect stream serialization','clean Poppler diagnostics','painted base font retained']}))
