#!/usr/bin/env python3
"""Check semantic preservation and reject layout-incompatible concept graphs."""
from concept_diagrams import validate_definition, render_concept_html
from copy import deepcopy

d={'id':'choice','layout':'branch-actions','title':'Choose a response','nodes':[{'id':x,'label':f'Cause {x}','detail':f'Action {x}'} for x in 'abc'],'edges':[{'from':'wait','to':x} for x in 'abc'],'textEquivalent':'Cause a calls for action a; b calls for b; c calls for c.'}
h=render_concept_html(d)
assert 'role="img"' in h and 'aria-describedby="choice-description"' in h
for n in d['nodes']:
 assert n['label'] in h and n['detail'] in h and 'data-diagram-node="'+n['id']+'"' in h
for mutate in [lambda x:x['edges'].pop(), lambda x:x['nodes'][0].update(label=''), lambda x:x.update(textEquivalent='')]:
 broken=deepcopy(d);mutate(broken)
 try:validate_definition(broken)
 except ValueError:pass
 else:raise AssertionError('Invalid semantic graph accepted')
d.update(layout='ownership-loop',feedback='Review evidence',edges=[{'from':'a','to':'b'},{'from':'b','to':'c'},{'from':'c','to':'a','feedback':True}])
for n in d['nodes']:n['role']='Team'
assert 'concept-feedback' in render_concept_html(d)
print('PASS concept labels, accessible equivalents, ownership feedback and invalid-graph rejection')

d={'id':'review','layout':'ordered-sequence','title':'Review order','nodes':[{'id':str(i),'label':f'Step {i}','detail':f'Check {i}'} for i in range(1,6)],'edges':[{'from':str(i),'to':str(i+1)} for i in range(1,5)],'textEquivalent':'Review steps 1 through 5 in order.'}
assert render_concept_html(d).count('data-diagram-node=')==5
broken=deepcopy(d);broken['edges'].reverse();broken['edges'][0]['to']='1'
try:validate_definition(broken)
except ValueError:pass
else:raise AssertionError('Invalid sequence edges accepted')
print('PASS ordered sequence preserves five nodes and rejects broken order')
