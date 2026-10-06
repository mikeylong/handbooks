#!/usr/bin/env python3
"""Exact-hash placement, tagged-order, background and color proof for a PDF pair."""
import argparse,json,hashlib,math
from collections import Counter
from pathlib import Path
from PIL import Image
from pypdf import PdfReader
from pypdf.generic import ContentStream
from pdf_theme import theme_tokens


def mul(a,b):
 return [a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]]
def inspect(file):
 r=PdfReader(file,strict=True);placements=[];marked=[];errors=[]
 fingerprints={}
 for page in r.pages:
  for image in page.images:
   reference=image.indirect_reference
   if reference is None:continue
   pixels=image.image.convert('RGB')
   fingerprints[(reference.idnum,reference.generation)]=hashlib.sha256(f'{pixels.width}x{pixels.height}:'.encode()+pixels.tobytes()).hexdigest()
 def walk(stream,resources,matrix,page,depth=0):
  if depth>20:raise ValueError('Recursive PDF form')
  stack=[]
  for args,op in ContentStream(stream,r).operations:
   if op==b'q':stack.append(matrix[:])
   elif op==b'Q':matrix=stack.pop() if stack else matrix
   elif op==b'cm':matrix=mul([float(v) for v in args],matrix)
   elif op==b'BDC':
    props=args[1]
    if isinstance(props,dict) and '/MCID' in props:marked.append([page,int(props['/MCID'])])
   elif op==b'Do':
    reference=resources.get('/XObject',{}).get(args[0]);obj=reference.get_object() if reference else None
    if obj and obj.get('/Subtype')=='/Image':
     w,h=math.hypot(matrix[0],matrix[1]),math.hypot(matrix[2],matrix[3]);record={'page':page,'matrix':[round(v,3) for v in matrix],'sizePoints':[round(w,3),round(h,3)],'ppi':[round(float(obj['/Width'])/w*72,1),round(float(obj['/Height'])/h*72,1)],'pixelSha256':fingerprints.get((reference.idnum,reference.generation))};placements.append(record)
    elif obj and obj.get('/Subtype')=='/Form':walk(obj,obj.get('/Resources',resources),mul(list(obj.get('/Matrix',[1,0,0,1,0,0])),matrix),page,depth+1)
 for n,p in enumerate(r.pages,1):walk(p.get_contents(),p['/Resources'],[1,0,0,1,0,0],n)
 roles=[]
 def structure(value,pg=None):
  value=value.get_object() if hasattr(value,'get_object') else value
  if isinstance(value,list):
   for child in value:structure(child,pg)
  elif isinstance(value,dict):
   if '/Pg' in value:pg=r.get_page_number(value['/Pg'])+1
   if '/S' in value:roles.append({'role':str(value['/S']),'page':pg,'alt':str(value.get('/Alt','')),'actualText':str(value.get('/ActualText',''))})
   if '/MCID' in value:roles.append({'mcid':int(value['/MCID']),'page':pg})
   if '/K' in value:structure(value['/K'],pg)
  elif isinstance(value,int):roles.append({'mcid':int(value),'page':pg})
 root=r.trailer['/Root'];tree=root.get('/StructTreeRoot')
 if tree:structure(tree)
 return {'sha256':hashlib.sha256(Path(file).read_bytes()).hexdigest(),'placements':placements,'markedOrder':marked,'structureOrder':roles,'errors':errors}
def contrast(a,b):
 def lum(s):
  values=[int(s[i:i+2],16)/255 for i in (1,3,5)];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in values];return sum(x*y for x,y in zip(v,[.2126,.7152,.0722]))
 x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
def audit(light,dark,chapters,screenshot_manifest=None,book_root=None):
 a,b=inspect(light),inspect(dark);errors=a['errors']+b['errors']
 screenshot_pixels=Counter()
 screenshot_thresholds={}
 if screenshot_manifest:
  from screenshot_figures import load_figures
  manifest=Path(screenshot_manifest).resolve()
  root=Path(book_root).resolve() if book_root else manifest.parent
  figures=load_figures(root,str(manifest.relative_to(root)),required=True)
  for figure in figures.values():
   for panel in figure['panels']:
    with Image.open(panel['_path']) as image:
     fingerprint=hashlib.sha256(f'{image.width}x{image.height}:'.encode()+image.tobytes()).hexdigest()
     screenshot_pixels[fingerprint]+=1
     screenshot_thresholds.setdefault(fingerprint,[]).append(panel['minPpi'])
 for item in (a,b):
  screenshots=[x for x in item['placements'] if x['pixelSha256'] in screenshot_pixels]
  artwork=[x for x in item['placements'] if x['pixelSha256'] not in screenshot_pixels]
  if Counter(x['pixelSha256'] for x in screenshots)!=screenshot_pixels:errors.append('Screenshot paint count or frozen pixels differ from the manifest')
  if len(artwork)!=chapters:errors.append('Wrong chapter artwork paint count')
  if len(set(x['page'] for x in artwork))!=chapters:errors.append('Repeated or unmapped chapter artwork paint')
  for paint in artwork:
   if min(paint['ppi'])<240:errors.append(f'Page {paint["page"]}: chapter artwork below 240 PPI')
  for fingerprint,thresholds in screenshot_thresholds.items():
   paints=sorted([paint for paint in screenshots if paint['pixelSha256']==fingerprint],key=lambda paint:min(paint['ppi']))
   for paint,minimum in zip(paints,sorted(thresholds)):
    paint['requiredMinPpi']=minimum
    if min(paint['ppi'])<minimum:errors.append(f'Page {paint["page"]}: screenshot below its recorded {minimum} PPI minimum')
  item['screenshotPlacements']=screenshots
  item['chapterArtworkPlacements']=artwork
 if [{k:x[k] for k in ['page','matrix']} for x in a['placements']] != [{k:x[k] for k in ['page','matrix']} for x in b['placements']]:errors.append('Artwork placement geometry differs')
 if a['structureOrder']!=b['structureOrder']:errors.append('Tagged structure order differs')
 if a['markedOrder']!=b['markedOrder']:errors.append('Marked-content reading order differs')
 tokens=theme_tokens('dark');checks=[]
 for fg,minimum in [('ink',4.5),('muted',4.5),('rule',3),('strongRule',3)]:
  for bg in ['paper','raised']:
   ratio=contrast(tokens[fg],tokens[bg]);checks.append({'foreground':fg,'background':bg,'ratio':round(ratio,2),'minimum':minimum});
   if ratio<minimum:errors.append('Insufficient contrast '+fg+'/'+bg)
 return {'status':'failed' if errors else 'passed','retained':a,'candidate':b,'contrast':checks,'failures':errors,'limitations':'Tagged structure and marked-content order are compared structurally; this is not a PDF/UA certification or a VoiceOver usability test.'}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--retained',required=True);p.add_argument('--candidate',required=True);p.add_argument('--chapters',type=int,required=True);p.add_argument('--screenshot-manifest',help='Frozen screenshot manifest for a content edition with inline figures');p.add_argument('--book-root',help='Root for assets when the screenshot manifest is in a nested directory');p.add_argument('--output',required=True);a=p.parse_args();result=audit(a.retained,a.candidate,a.chapters,a.screenshot_manifest,a.book_root);Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(result['status'],result['failures']);raise SystemExit(result['status']=='failed')
