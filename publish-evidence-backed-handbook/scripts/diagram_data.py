"""Load handbook-owned semantics and guard fixed print geometry against drift."""
import json
from pathlib import Path


def load_diagram(book_root, name, *, kind=None, count=None, feedback=False):
    definition=json.loads((Path(book_root)/'source/diagrams'/f'{name}.json').read_text())
    if kind is not None:
        nodes=definition['nodes']
        ids=[node['id'] for node in nodes]
        if definition['kind']!=kind or len(nodes)!=count or len(set(ids))!=len(ids):
            raise ValueError(f'{name}: definition no longer fits the print geometry')
        expected={(ids[0],node_id) for node_id in ids[1:]} if kind=='branch' else set(zip(ids,ids[1:]))
        if feedback:
            expected.add((ids[-1],ids[0]))
        edges=[(edge['from'],edge['to']) for edge in definition['edges']]
        if len(edges)!=len(expected) or set(edges)!=expected:
            raise ValueError(f'{name}: relationships no longer fit the print geometry; update its renderer')
    return definition
