#!/usr/bin/env python3
"""Exact-hash placement, tagged-order, background and color proof for a PDF pair."""
import argparse,json,hashlib,math
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import ContentStream
from pdf_theme import theme_tokens


def mul(a,b):
 return [a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]]
def inspect(file):
 r=PdfReader(file,strict=True);placements=[];marked=[];errors=[]
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
    obj=resources.get('/XObject',{}).get(args[0]);obj=obj.get_object() if obj else None
    if obj and obj.get('/Subtype')=='/Image':
     w,h=math.hypot(matrix[0],matrix[1]),math.hypot(matrix[2],matrix[3]);record={'page':page,'matrix':[round(v,3) for v in matrix],'sizePoints':[round(w,3),round(h,3)],'ppi':[round(float(obj['/Width'])/w*72,1),round(float(obj['/Height'])/h*72,1)]};placements.append(record)
     if min(record['ppi'])<240:errors.append(f'Page {page}: painted image below 240 PPI')
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
def audit(light,dark,chapters):
 a,b=inspect(light),inspect(dark);errors=a['errors']+b['errors']
 for item in (a,b):
  if len(item['placements'])!=chapters:errors.append('Wrong image paint count')
  if len(set(x['page'] for x in item['placements']))!=chapters:errors.append('Repeated or unmapped image paint')
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
 p=argparse.ArgumentParser();p.add_argument('--retained',required=True);p.add_argument('--candidate',required=True);p.add_argument('--chapters',type=int,required=True);p.add_argument('--output',required=True);a=p.parse_args();result=audit(a.retained,a.candidate,a.chapters);Path(a.output).write_text(json.dumps(result,indent=2)+'\n');print(result['status'],result['failures']);raise SystemExit(result['status']=='failed')
