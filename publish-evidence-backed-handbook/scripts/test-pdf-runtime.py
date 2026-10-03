#!/usr/bin/env python3
"""Portable negative gates and generated-fixture parity checks."""
import argparse,sys,json,tempfile,hashlib
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.pdfgen.canvas import Canvas
from pypdf import PdfReader
from pypdf.generic import ContentStream
from pdf_theme import isolated_output,theme_tokens
from pdf_artwork import normalize
from validate_pdf_pair import compare,describe

def dark_paint_errors(pdf):
    reader=PdfReader(pdf,strict=True);fail=[]
    paper=tuple(int(theme_tokens('dark')['paper'][i:i+2],16)/255 for i in (1,3,5))
    for n,page in enumerate(reader.pages,1):
        fill=(0,0,0);stack=[];rects=[];full=False
        for args,op in ContentStream(page.get_contents(),reader).operations:
            if op==b'q':stack.append(fill)
            elif op==b'Q':fill=stack.pop() if stack else fill
            elif op==b'rg':fill=tuple(float(x) for x in args)
            elif op==b'g':fill=(float(args[0]),)*3
            elif op==b're':rects.append(tuple(float(x) for x in args))
            elif op in [b'f',b'f*',b'B',b'B*']:
                for x,y,w,h in rects:
                    if abs(x)<.1 and abs(y)<.1 and abs(w-float(page.mediabox.width))<.1 and abs(h-float(page.mediabox.height))<.1 and max(abs(a-b) for a,b in zip(fill,paper))<.001:full=True
                    if min(fill)>.9 and min(abs(w),abs(h))>3 and abs(w*h)>100:fail.append(f'Page {n}: light panel on Dark')
                rects=[]
            elif op in [b'n',b'S',b's']:rects=[]
        if not full:fail.append(f'Page {n}: missing opaque full-page Dark background')
    return fail

def negative():
    with tempfile.TemporaryDirectory(prefix='handbook-pdf-gates-') as folder:
        root=Path(folder);book=root/'book';book.mkdir();released=book/'output/pdf';released.mkdir(parents=True);(released/'released.pdf').write_bytes(b'protected')
        for output in [released/'new.pdf',released/'released.pdf',book/'reader'/'x.pdf']:
            try:isolated_output(book,output)
            except ValueError:pass
            else:raise AssertionError('Protected output accepted')
        existing=root/'existing.pdf';existing.write_bytes(b'old')
        try:isolated_output(book,existing)
        except ValueError:pass
        else:raise AssertionError('Existing output accepted')
        source=book/'dark.png';Image.new('RGBA',(1000,1000),(238,236,230,255)).save(source)
        sha=hashlib.sha256(source.read_bytes()).hexdigest()
        entry={'chapter':1,'light':'dark.png','dark':'missing.png','lightSha256':sha,'darkSha256':sha,'darkDimensions':[1000,1000],'transparencyReview':{'alphaRange':[0,255]}}
        manifest=book/'artwork-pairs.json';manifest.write_text(json.dumps({'artwork':[entry]}))
        try:normalize(book,root/'missing-art',{'id':'fixture'})
        except FileNotFoundError:pass
        else:raise AssertionError('Missing Dark artwork accepted')
        entry.update(dark='dark.png',darkSha256='a'*64);manifest.write_text(json.dumps({'artwork':[entry]}))
        try:normalize(book,root/'stale-art',{'id':'fixture'})
        except ValueError:pass
        else:raise AssertionError('Stale Dark hash accepted')
        panel=root/'panel.pdf';c=Canvas(str(panel),pagesize=(420,594.96));c.setFillColorRGB(25/255,25/255,24/255);c.rect(0,0,420,594.96,fill=1,stroke=0);c.setFillColorRGB(1,1,1);c.rect(20,20,100,100,fill=1,stroke=0);c.drawString(20,160,'Fixture');c.save();assert any('light panel' in x for x in dark_paint_errors(panel))
        alpha=root/'alpha.png';Image.new('RGBA',(1000,1000),(10,10,10,100)).save(alpha);pdf=root/'alpha.pdf';c=Canvas(str(pdf));c.drawImage(str(alpha),20,20,width=100,height=100,mask='auto');c.drawString(20,140,'Fixture');c.save();assert any('masked image' in x for x in describe(pdf)['errors'])
    return ['protected release directory','existing artifact','missing Dark art','stale art hash','alpha reaching PDF','light panel on Dark']
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--fixtures');p.add_argument('--output',required=True);a=p.parse_args();out=Path(a.output);out.mkdir(parents=True,exist_ok=True);records=[]
    if a.fixtures:
        for directory in sorted((Path(a.fixtures)/'pdfs').iterdir()):
            report=compare(directory/'light.pdf',directory/'dark.pdf',out/directory.name);report['darkPaintFailures']=dark_paint_errors(directory/'dark.pdf');records.append(report)
    result={'negativeCases':negative(),'fixtures':records,'status':'failed' if any(r['failures'] or r['darkPaintFailures'] for r in records) else 'passed'};(out/'runtime-tests.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));raise SystemExit(result['status']=='failed')
