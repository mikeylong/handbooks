#!/usr/bin/env python3
"""Audit retained/candidate PDFs and compare semantic navigation, text and geometry."""
import argparse, difflib, hashlib, json, re, subprocess
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def describe(path,screenshot_manifest=None,book_root=None):
    r=PdfReader(path,strict=True); errors=[]; pages=[]; image_pages=[]; unused_fonts=[];image_paints=[]
    def target(value):
        if isinstance(value,str):
            if value in r.named_destinations:return r.get_destination_page_number(r.named_destinations[value])
            return value
        if isinstance(value,list):
            try: n=r.get_page_number(value[0].get_object())
            except Exception:n=None
            return [n,*[str(x) for x in value[1:]]]
        return str(value)
    def outlines(items):
        result=[]
        for item in items:
            if isinstance(item,list): result.append(outlines(item))
            else:result.append({'title':item.title,'page':r.get_destination_page_number(item),'type':str(item.typ),'left':str(item.left),'top':str(item.top),'zoom':str(item.zoom)})
        return result
    for i,p in enumerate(r.pages):
        text=p.extract_text() or '';links=[]
        for a in p.get('/Annots',[]):
            a=a.get_object()
            if a.get('/Subtype')!='/Link':continue
            action=a.get('/A',{});action=action.get_object() if hasattr(action,'get_object') else action
            links.append({'rect':[float(x) for x in a.get('/Rect',[])],'uri':str(action.get('/URI','')),'dest':target(a.get('/Dest',action.get('/D','')))})
        imgs=[]
        xobj=p.get('/Resources',{}).get('/XObject',{})
        if hasattr(xobj,'get_object'):xobj=xobj.get_object()
        def scan(objects):
            for key,obj in objects.items():
                obj=obj.get_object()
                if obj.get('/Subtype')=='/Image':
                    record={'width':obj.get('/Width'),'height':obj.get('/Height'),'mask':'/Mask' in obj or '/SMask' in obj}
                    imgs.append(record)
                    if record['mask']:errors.append(f'Page {i+1}: masked image')
                elif obj.get('/Subtype')=='/Form':scan(obj.get('/Resources',{}).get('/XObject',{}).get_object() if hasattr(obj.get('/Resources',{}).get('/XObject',{}),'get_object') else obj.get('/Resources',{}).get('/XObject',{}))
        scan(xobj)
        if not text.strip():errors.append(f'Page {i+1}: no searchable text')
        if imgs:image_pages.append(i+1)
        pages.append({'page':i+1,'mediaBox':[float(x) for x in p.mediabox],'cropBox':[float(x) for x in p.cropbox],'text':text,'links':links,'images':imgs})
    painted_fonts=set()
    for page in r.pages:
        fonts=page['/Resources'].get('/Font',{});active=None
        for args,op in ContentStream(page.get_contents(),r).operations:
            if op==b'Tf':active=args[0]
            if op in [b'Tj',b'TJ',b"'",b'"'] and active and fonts.get(active): painted_fonts.add(str(fonts[active].get_object().get('/BaseFont','')).lstrip('/'))
    for program,args in [('pdfinfo',[]),('pdffonts',[]),('pdfimages',['-list'])]:
        result=subprocess.run([program,*args,str(path)],capture_output=True,text=True)
        if result.returncode:errors.append(program+': '+result.stderr)
        if program=='pdffonts':
            for line in result.stdout.splitlines()[2:]:
                # The embedded flag is the first yes/no column.
                flags=re.findall(r'\b(?:yes|no)\b',line)
                if flags and flags[0]!='yes':
                    if line.split()[0] in painted_fonts: errors.append('Unembedded painted font: '+line)
                    else:unused_fonts.append(line)
        if program=='pdfimages':
            for line in result.stdout.splitlines()[2:]:
                v=line.split()
                if len(v)>14 and v[2]=='image':
                    image_paints.append({'page':int(v[0]),'object':v[10]+' '+v[11],'xPpi':float(v[12]),'yPpi':float(v[13])})
                    if not screenshot_manifest and min(float(v[12]),float(v[13]))<240:errors.append('Insufficient image PPI: '+line)
    screenshot_resolution=None
    if screenshot_manifest:
        from screenshot_figures import screenshot_resolution_report
        screenshot_resolution,resolution_errors=screenshot_resolution_report(r,image_paints,screenshot_manifest,book_root=book_root)
        errors.extend(resolution_errors)
    root=r.trailer['/Root'];tagged='/StructTreeRoot' in root
    return {'path':str(Path(path).resolve()),'sha256':sha(path),'bytes':Path(path).stat().st_size,'pages':pages,'labels':r.page_labels,'outlines':outlines(r.outline),'namedDestinations':{k:r.get_destination_page_number(v) for k,v in r.named_destinations.items()},'language':str(root.get('/Lang','')),'tagged':tagged,'header':r.pdf_header,'unusedUnembeddedFontResources':unused_fonts,'imagePages':image_pages,'errors':errors,**({'screenshotResolution':screenshot_resolution} if screenshot_resolution else {}),'accessibilityLimitations':[] if tagged else ['Untagged baseline; PDF/UA compliance is not claimed. Accessible HTML remains available.']}

def compare(previous,candidate,output,screenshot_manifest=None,book_root=None):
    a,b=describe(previous,screenshot_manifest,book_root),describe(candidate,screenshot_manifest,book_root); failures=[*a['errors'],*b['errors']];delta=[]
    if len(a['pages'])!=len(b['pages']): failures.append('Page count differs')
    for key in ['labels','outlines','namedDestinations','language','header','tagged']:
        if a[key]!=b[key]: failures.append(key+' differs')
    for x,y in zip(a['pages'],b['pages']):
        for key in ['mediaBox','cropBox','links']:
            if x[key]!=y[key]: failures.append(f"Page {x['page']}: {key} differs")
        if re.sub(r'\s+',' ',x['text']).strip()!=re.sub(r'\s+',' ',y['text']).strip(): failures.append(f"Page {x['page']}: text differs")
        delta.extend(difflib.unified_diff(x['text'].splitlines(True),y['text'].splitlines(True),fromfile=f"retained-page-{x['page']}",tofile=f"candidate-page-{y['page']}"))
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    (output/'exact-text.diff').write_text(''.join(delta))
    for name,record in [('retained',a),('candidate',b)]:
        (output/(name+'-page-map.json')).write_text(json.dumps(record,indent=2)+'\n')
        for prog,args in [('pdfinfo',[]),('pdffonts',[]),('pdfimages',['-list'])]:
            result=subprocess.run([prog,*args,record['path']],capture_output=True,text=True);(output/(name+'-'+prog+'.txt')).write_text(result.stdout+result.stderr)
    report={'schemaVersion':1,'status':'failed' if failures else 'passed','retainedSha256':a['sha256'],'candidateSha256':b['sha256'],'pages':[len(a['pages']),len(b['pages'])],'failures':failures,'accessibilityLimitations':b['accessibilityLimitations']}
    (output/'parity.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--retained',required=True);p.add_argument('--candidate',required=True);p.add_argument('--screenshot-manifest');p.add_argument('--book-root');p.add_argument('--output',required=True);a=p.parse_args();r=compare(a.retained,a.candidate,a.output,a.screenshot_manifest,a.book_root);print(json.dumps(r,indent=2));raise SystemExit(bool(r['failures']))
