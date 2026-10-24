"""Reject unreadable or disconnected grouped maps before PDF/reader rendering."""
import copy,json,os,tempfile
from pathlib import Path
os.environ['HANDBOOK_PDF_CONFIG']=json.dumps({'fonts':'toolkit'})
from grouped_diagrams import validate,render,html
base={'id':'map','layout':'grouped-map','title':'Grouped ownership','width':300,'height':120,'textEquivalent':'A team owns delivery and agents execute bounded work.','nodes':[{'id':'team','x':0,'y':25,'width':300,'height':90,'label':'Team','kind':'group'},{'id':'owner','parent':'team','x':10,'y':65,'width':120,'height':40,'label':'Human owner','kind':'node'},{'id':'agent','parent':'team','x':170,'y':65,'width':120,'height':40,'label':'Agents','kind':'agent'}],'edges':[{'from':'owner','to':'agent','points':[[132,85],[168,85]],'both':True}]}
assert 'viewBox="0 0 300 120"' in html(base)
assert 'var(--paper)' in html(base) and 'currentColor' in html(base)
for mutate in [lambda d:d['nodes'][1].update(x=-1),lambda d:d['nodes'][1].update(fontSize=5),lambda d:d['edges'][0].update(to='missing'),lambda d:d['nodes'][1].update(parent='agent')]:
 d=copy.deepcopy(base);mutate(d)
 try:validate(d)
 except (ValueError,KeyError):pass
 else:raise AssertionError('Invalid map accepted')
d=copy.deepcopy(base);d['nodes'][1]['label']='This long label cannot fit inside the tiny reserved box';d['nodes'][1]['height']=10
try:render(d)
except ValueError:pass
else:raise AssertionError('Clipped label accepted')
print('Grouped-map containment, endpoints, readability and theme-aware SVG passed.')
