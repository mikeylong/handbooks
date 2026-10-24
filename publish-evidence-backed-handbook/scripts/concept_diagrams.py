"""Shared restrained branch and ownership diagrams from book-owned semantics."""
import json
from html import escape
from pathlib import Path
from reportlab.platypus import Flowable, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def validate_definition(d):
    if d.get('layout') == 'grouped-map':
        from grouped_diagrams import validate
        return validate(d)
    if d.get('layout') not in ('branch-actions', 'ownership-loop', 'ordered-sequence'):
        raise ValueError('Unsupported concept diagram layout')
    if not d.get('id') or not d.get('title') or not d.get('textEquivalent'):
        raise ValueError('Concept diagram requires identity and a text equivalent')
    count = len(d.get('nodes', []))
    valid_count = 2 <= count <= 8 if d['layout'] == 'ordered-sequence' else count == 3
    if not valid_count or len({n['id'] for n in d['nodes']}) != count:
        raise ValueError('Concept diagram requires distinct nodes within its layout limits')
    if any(not n.get('label') or not n.get('detail') for n in d['nodes']):
        raise ValueError('Concept diagram requires node labels and details')
    if d['layout'] == 'ownership-loop' and (not d.get('feedback') or any(not n.get('role') for n in d['nodes'])):
        raise ValueError('Ownership loop requires roles and feedback')
    ids=[n['id'] for n in d['nodes']]
    expected = set(zip(ids, ids[1:])) if d['layout']=='ordered-sequence' else ({('wait', i) for i in ids} if d['layout']=='branch-actions' else {(ids[0],ids[1]),(ids[1],ids[2]),(ids[2],ids[0])})
    if {(e['from'],e['to']) for e in d.get('edges',[])} != expected or len(d.get('edges',[])) != len(expected):
        raise ValueError('Concept edges do not match the fixed diagram geometry')
    return d


def render_concept_html(d):
    validate_definition(d)
    if d['layout']=='grouped-map':
        from grouped_diagrams import html
        return html(d)
    e = lambda v: escape(str(v), quote=True)
    nodes = ''.join('<li data-diagram-node="'+e(n['id'])+'">'+
        ('<small>'+e(n['role'])+'</small>' if n.get('role') else '')+
        '<strong>'+e(n['label'])+'</strong><span>'+e(n['detail'])+'</span></li>' for n in d['nodes'])
    return ('<figure class="reader-concept-diagram '+e(d['layout'])+'" role="img" aria-labelledby="'+e(d['id'])+'-title" aria-describedby="'+e(d['id'])+'-description" data-diagram-title="'+e(d['title'])+'" data-text-equivalent="'+e(d['textEquivalent'])+'">'+
        '<figcaption id="'+e(d['id'])+'-title">'+e(d['title'])+'</figcaption>'+
        '<div class="concept-drawing" aria-hidden="true"><ol>'+nodes+'</ol>'+
        ('<p class="concept-feedback">'+e(d['feedback'])+'</p>' if d.get('feedback') else '')+'</div>'+
        '<p class="concept-description" id="'+e(d['id'])+'-description">'+e(d['textEquivalent'])+'</p></figure>')


class ConceptDiagram(Flowable):
    def __init__(self, book_root, name):
        super().__init__()
        from reportlab_layout import CONTENT_W
        self.semantic_definition = validate_definition(json.loads((Path(book_root)/'source/diagrams'/f'{name}.json').read_text()))
        self.width = CONTENT_W
        self.height = 130 if self.semantic_definition['layout'] == 'branch-actions' else 140
        if self.semantic_definition['layout'] == 'ordered-sequence':
            from reportlab_layout import SANS, SANS_BOLD, INK
            self.sequence_rows=[]
            for node in self.semantic_definition['nodes']:
                label=Paragraph(escape(node['label']),ParagraphStyle('SequenceLabel',fontName=SANS_BOLD,fontSize=8.7,leading=11,textColor=INK))
                detail=Paragraph(escape(node['detail']),ParagraphStyle('SequenceDetail',fontName=SANS,fontSize=8.2,leading=10.5,textColor=INK))
                lh=label.wrap(self.width-30,1000)[1];dh=detail.wrap(self.width-30,1000)[1]
                self.sequence_rows.append((label,detail,lh,dh))
            self.height=26+sum(lh+dh+13 for _,_,lh,dh in self.sequence_rows)
        if self.semantic_definition['layout']=='grouped-map':
            self.height=self.semantic_definition['height']*self.width/self.semantic_definition['width']
        self.spaceBefore = 10
        self.spaceAfter = 14

    def draw(self):
        from reportlab_layout import SANS, SANS_BOLD, INK, MID_GRAY, WHITE
        c=self.canv; d=self.semantic_definition; w=self.width; c.saveState()
        if d['layout']=='grouped-map':
            from grouped_diagrams import render
            c.scale(w/d['width'],w/d['width']);render(d,c);c.restoreState();return
        def text(value, x, top, width, size=8.6, bold=False, color=INK):
            p=Paragraph(escape(value), ParagraphStyle('ConceptLabel',fontName=SANS_BOLD if bold else SANS,fontSize=size,leading=size*1.22,textColor=color,alignment=TA_CENTER))
            _,h=p.wrap(width,100)
            if h>42: raise ValueError('Concept label exceeds its reserved print area: '+value)
            p.drawOn(c,x-width/2,top-h)
        def line(x1,y1,x2,y2):
            c.setStrokeColor(INK);c.setLineWidth(.6);c.line(x1,y1,x2,y2)
        def arrow(x,y,direction='down'):
            p=c.beginPath();p.moveTo(x,y)
            for a,b in ((-2.3,4),(2.3,4)) if direction=='down' else ((-4,2.3),(-4,-2.3)):
                p.lineTo(x+a,y+b)
            p.close();c.setFillColor(INK);c.drawPath(p,fill=1,stroke=0)
        xs=[w/6,w/2,5*w/6]; cw=w/3-15
        if d['layout']=='ordered-sequence':
            text(d['title'],w/2,self.height-2,w,10.1,True)
            top=self.height-26
            for i,(label,detail,lh,dh) in enumerate(self.sequence_rows):
                c.setFillColor(INK);c.setFont(SANS_BOLD,8.7);c.drawCentredString(8,top-9,str(i+1))
                label.drawOn(c,30,top-lh);detail.drawOn(c,30,top-lh-dh-2)
                next_top=top-lh-dh-13
                if i<len(self.sequence_rows)-1:
                    line(8,top-14,8,next_top+5);arrow(8,next_top+3)
                top=next_top
        elif d['layout']=='branch-actions':
            text(d['title'],w/2,126,w,10.2,True)
            line(w/2,108,w/2,100);line(xs[0],100,xs[-1],100)
            for x,n in zip(xs,d['nodes']):
                line(x,100,x,93);arrow(x,92)
                text(n['label'],x,85,cw,8.5,True)
                line(x,52,x,45);arrow(x,44)
                text(n['detail'],x,37,cw,8.6)
        else:
            text(d['title'],w/2,137,w,10.1,True)
            line(9,118,w-9,118);line(9,118,9,111);line(w-9,118,w-9,111)
            for i,(x,n) in enumerate(zip(xs,d['nodes'])):
                text(n['role'].upper(),x,103,cw,6.8,False,MID_GRAY)
                text(n['label'],x,88,cw,8.6,True)
                text(n['detail'],x,65,cw,7.9)
                if i<2:
                    line(x+cw/2+3,75,xs[i+1]-cw/2-5,75);arrow(xs[i+1]-cw/2-4,75,'right')
            line(xs[-1],28,xs[-1],18);line(xs[-1],18,xs[0],18);line(xs[0],18,xs[0],29)
            p=c.beginPath();p.moveTo(xs[0],30);p.lineTo(xs[0]-2.3,26);p.lineTo(xs[0]+2.3,26);p.close();c.setFillColor(INK);c.drawPath(p,fill=1,stroke=0)
            text(d['feedback'],w/2,11,w,7.6,False,MID_GRAY)
        c.restoreState()
