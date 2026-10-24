#!/usr/bin/env python3
"""Regress quantitative bounds, zero-based bars, semantics and neutral themes."""
from copy import deepcopy
from quantitative_charts import validate,scene,html
base={'id':'fixture','layout':'quantitative','title':'Example','width':360,'height':240,'textEquivalent':'Complete accessible values.','sourceNote':'Synthetic test.'}
fixtures=[dict(base,kind='bars',rows=[{'label':'A','value':100},{'label':'B','value':75}],max=1500),dict(base,kind='budget',segments=[{'label':'A','value':16000},{'label':'B','value':30600},{'label':'C','value':31200}],max=86000,lowerCap=72000),dict(base,kind='timeline',rows=[{'label':'Start','start':1,'end':2}]),dict(base,kind='trial-matrix',values=[[0,0]+[1]*13,[0]+[1]*14,[0]+[1]*14]),dict(base,kind='line',xDomain=[50,100],yDomain=[0,24],points=[[50,22.86],[75,14.33],[88,12],[100,10.43]],markers=[[75,14.33],[88,12],[100,10.43]])]
for d in fixtures:
 validate(d);assert scene(d).ops
 markup=html(d);assert 'data-text-equivalent="Complete accessible values."' in markup
 assert 'min-width:540px' in markup and 'var(--ink)' in markup and '#fff' not in markup
 assert markup.count('<svg')==1 and '<text' in markup
bad=deepcopy(fixtures[0]);bad['rows'][0]['value']=-1
try:validate(bad);raise AssertionError('Negative bar accepted')
except ValueError:pass
bad=deepcopy(fixtures[-1]);bad['points'][0][1]=25
try:validate(bad);raise AssertionError('Out-of-domain point accepted')
except ValueError:pass
bad=deepcopy(fixtures[2]);bad['rows'][0]['end']=11
try:validate(bad);raise AssertionError('Out-of-schedule milestone accepted')
except ValueError:pass
assert sum(sum(r) for r in fixtures[3]['values'])==41
print('PASS chart bounds, neutral themes, accessible values, invalid inputs and 41/45 matrix arithmetic')
