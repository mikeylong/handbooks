#!/usr/bin/env python3
"""Build one appearance in a fresh process with explicit book and candidate paths."""
import argparse, importlib.util, json, os
from pathlib import Path
from pdf_theme import isolated_output, theme_tokens
from pdf_font_resources import prune_unpainted_unembedded_fonts
from pdf_baseline import load_baseline, preserve_companion_labels
from pypdf import PdfReader, PdfWriter
from pypdf.constants import PageLabelStyle

def build(book, config_path, theme, output, art=None):
    book=Path(book).resolve(); config=json.loads(Path(config_path).read_text())
    mode, baseline = load_baseline(book, config)
    output=isolated_output(book,output)
    if config['renderer']!='reportlab': raise ValueError('Wrong renderer')
    if theme=='dark' and not art: raise ValueError('Missing frozen Dark derivatives')
    os.environ.update(HANDBOOK_BOOK_ROOT=str(book), HANDBOOK_PDF_CONFIG=json.dumps(config), HANDBOOK_PDF_THEME=theme,HANDBOOK_PDF_OUTPUT=str(output))
    if art: os.environ['HANDBOOK_PDF_ARTWORK']=str(Path(art).resolve())
    source=book/config['source']
    spec=importlib.util.spec_from_file_location('book_manuscript',source); module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    from reportlab.pdfgen.canvas import Canvas
    doc_class=getattr(module,config.get('docClass','GuideDocTemplate'))
    doc=doc_class(str(output)); doc.multiBuild(getattr(module,config['story'])(),canvasmaker=lambda *a,**kw:Canvas(*a,**dict(kw,invariant=1,pdfVersion=tuple(int(x) for x in (baseline.pdf_header.removeprefix('%PDF-') if baseline else '1.4').split('.')),initialFontName=module.SERIF)))
    reader=PdfReader(output,strict=True)
    writer=PdfWriter(clone_from=reader); writer.pdf_header=reader.pdf_header
    prune_unpainted_unembedded_fonts(writer)
    if not preserve_companion_labels(writer, reader, mode, baseline):
        offset=getattr(doc,'logical_page_offset',None) if config.get('pageLabelStyle')=='frontmatter-roman' else None
        if offset:
            writer.set_page_label(0,offset-1,style=PageLabelStyle.LOWERCASE_ROMAN,start=1)
            writer.set_page_label(offset,len(reader.pages)-1,style=PageLabelStyle.DECIMAL,start=1)
        else: writer.set_page_label(0,len(reader.pages)-1,style=PageLabelStyle.DECIMAL,start=1)
    writer.add_metadata({'/Title':config['title']+' · '+theme_tokens(theme)['displayName'],'/Subject':f"Content edition {config['version']} · {config['date']} · PDF appearance revision 1",'/Author':'Michael Long','/CreationDate':'D:20261002000000Z','/ModDate':'D:20261002000000Z'})
    writer.write(output)
    print(output)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--book',required=True);p.add_argument('--config',required=True);p.add_argument('--theme',choices=['light','dark'],required=True);p.add_argument('--output',required=True);p.add_argument('--artwork');a=p.parse_args();build(a.book,a.config,a.theme,a.output,a.artwork)
