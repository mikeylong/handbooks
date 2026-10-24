"""Shared vector renderer for book-owned grouped ownership/coordination maps."""
from html import escape
from math import atan2,cos,sin,pi,isfinite
from reportlab.pdfbase.pdfmetrics import stringWidth

def validate(d):
    if not d.get('id') or not d.get('title') or not d.get('textEquivalent'):raise ValueError('Map needs identity and text equivalent')
    w,h=d.get('width',0),d.get('height',0)
    if not (0<w<=1000 and 0<h<=1000):raise ValueError('Invalid map size')
    ids={n['id'] for n in d['nodes']}
    if len(ids)!=len(d['nodes']) or not ids:raise ValueError('Map nodes must be distinct')
    byid={n['id']:n for n in d['nodes']}
    for n in d['nodes']:
        x,y,nw,nh=(n[k] for k in ['x','y','width','height'])
        if not all(isfinite(v) for v in [x,y,nw,nh]) or not(0<=x<x+nw<=w and 0<=y<y+nh<=h):raise ValueError('Node out of bounds: '+n['id'])
        if n['kind'] not in ['node','group','agent'] or not n.get('label') or n.get('fontSize',8)<7.5:raise ValueError('Invalid node presentation')
        if n.get('parent'):
            p=byid[n['parent']]
            if p['kind']!='group' or not(p['x']<=x and p['y']<=y and x+nw<=p['x']+p['width'] and y+nh<=p['y']+p['height']):raise ValueError('Node not inside parent')
    for e in d['edges']:
        if e['from'] not in ids or e['to'] not in ids or len(e['points'])<2:raise ValueError('Unknown edge endpoint')
        if any(not(0<=x<=w and 0<=y<=h) for x,y in e['points']):raise ValueError('Edge outside map')
    return d

def lines(value,font,size,width):
    out=[]
    for part in value.split('\n'):
        line=''
        for word in part.split():
            candidate=(line+' '+word).strip()
            if stringWidth(candidate,font,size)>width and line:out.append(line);line=word
            else:line=candidate
        if line:out.append(line)
    if any(stringWidth(t,font,size)>width+.1 for t in out):raise ValueError('Map label is too wide: '+value)
    return out

def render(d,canvas=None):
    validate(d)
    from reportlab_layout import SANS,SANS_BOLD,INK,WHITE,PALE_GRAY,MID_GRAY
    h=d['height'];parts=[]
    def rect(n):
        x,y,w,nh=(n[k] for k in ['x','y','width','height']);fill=PALE_GRAY if n['kind']=='agent' else WHITE
        if canvas:
            canvas.setStrokeColor(MID_GRAY if n['kind']=='group' else INK);canvas.setFillColor(fill);canvas.setLineWidth(.55);canvas.rect(x,h-y-nh,w,nh,stroke=1,fill=1)
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{nh}" style="fill:{'color-mix(in srgb, var(--paper) 95%, var(--ink))' if n['kind']=='agent' else 'var(--paper)'}" stroke="currentColor" stroke-width=".55"/>')
    def text(value,x,y,w,nh,size=8,bold=False,top=False):
        font=SANS_BOLD if bold else SANS;rows=lines(value,font,size,w-8);leading=size*1.28
        if len(rows)*leading>nh-4:raise ValueError('Map label is too tall: '+value)
        y0=y+size+5 if top else y+(nh-len(rows)*leading)/2+size
        for i,row in enumerate(rows):
            yy=y0+i*leading
            if canvas:canvas.setFillColor(INK);canvas.setFont(font,size);canvas.drawCentredString(x+w/2,h-yy,row)
            parts.append(f'<text x="{x+w/2}" y="{yy}" text-anchor="middle" font-family="var(--sans)" font-size="{size}" font-weight="{700 if bold else 400}" fill="currentColor">{escape(row)}</text>')
    def arrow(a,b):
        ang=atan2(b[1]-a[1],b[0]-a[0]);q=[b,(b[0]-3*cos(ang-pi/6),b[1]-3*sin(ang-pi/6)),(b[0]-3*cos(ang+pi/6),b[1]-3*sin(ang+pi/6))]
        if canvas:
            p=canvas.beginPath();p.moveTo(q[0][0],h-q[0][1]);p.lineTo(q[1][0],h-q[1][1]);p.lineTo(q[2][0],h-q[2][1]);p.close();canvas.setFillColor(INK);canvas.drawPath(p,fill=1,stroke=0)
        parts.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in q)+'" fill="currentColor"/>')
    if canvas:text(d['title'],0,0,d['width'],24,10,True)
    # Parent groups must precede children, so their paper cannot cover child nodes.
    for n in d['nodes']:
        if n['kind']=='group':rect(n)
    for e in d['edges']:
        pts=e['points'];dash=e.get('dashed')
        if canvas:
            canvas.setStrokeColor(INK);canvas.setLineWidth(.65);canvas.setDash(3,2) if dash else canvas.setDash();p=canvas.beginPath();p.moveTo(pts[0][0],h-pts[0][1]);
            for x,y in pts[1:]:p.lineTo(x,h-y)
            canvas.drawPath(p,stroke=1);canvas.setDash()
        parts.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in pts)+'" fill="none" stroke="currentColor" stroke-width=".65"'+(' stroke-dasharray="3 2"' if dash else '')+'/>');arrow(pts[-2],pts[-1])
        if e.get('both'):arrow(pts[1],pts[0])
    for n in d['nodes']:
        if n['kind']!='group':rect(n)
        text(n['label'],n['x'],n['y'],n['width'],40 if n['kind']=='group' else n['height'],n.get('fontSize',8),n['kind'] in ['group','agent'],n['kind']=='group')
    for n in d.get('labels',[]):
        # A paper backing makes relationship labels readable over connector lines.
        if canvas:canvas.setFillColor(WHITE);canvas.rect(n['x'],h-n['y']-14,n['width'],14,stroke=0,fill=1)
        parts.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["width"]}" height="14" style="fill:var(--paper)"/>')
        text(n['text'],n['x'],n['y'],n['width'],14,7.5)
    return ''.join(parts)

def html(d):
    content=render(d);eid=escape(d['id']);title=escape(d['title']);desc=escape(d['textEquivalent'])
    return f'<figure class="reader-concept-diagram grouped-map" role="img" aria-labelledby="{eid}-title" aria-describedby="{eid}-description" data-diagram-title="{title}" data-text-equivalent="{desc}"><figcaption id="{eid}-title">{title}</figcaption><svg viewBox="0 0 {d["width"]} {d["height"]}" style="display:block;width:100%;height:auto;color:var(--ink)" aria-hidden="true">{content}</svg><p class="concept-description" id="{eid}-description">{desc}</p></figure>'
