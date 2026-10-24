"""Shared, monochrome quantitative chart primitives for PDF and hosted readers."""
from html import escape
from math import isfinite
from reportlab.pdfbase.pdfmetrics import stringWidth

KINDS={'timeline','trial-matrix','budget','bars','line'}
def validate(d):
    if d.get('kind') not in KINDS or not all(d.get(k) for k in ['id','title','textEquivalent']):
        raise ValueError('Chart needs a supported kind, identity, title and text equivalent')
    if d.get('width',360)!=360 or not 150<=d.get('height',220)<=320:raise ValueError('Invalid chart dimensions')
    if d['kind']=='timeline' and any(not 1<=r['start']<=r['end']<=10 for r in d['rows']):raise ValueError('Invalid timeline range')
    if d['kind']=='trial-matrix':
        rows=d['values']
        if len(rows)!=3 or any(len(r)!=15 for r in rows) or any(x not in [0,1] for r in rows for x in r):raise ValueError('Invalid trial matrix')
    if d['kind']=='budget':
        if not 0<=d['lowerCap']<=d['max'] or any(x['value']<0 for x in d['segments']) or sum(x['value'] for x in d['segments'])>d['max']:raise ValueError('Invalid budget')
    if d['kind']=='bars' and (d['max']<=0 or any(not 0<=r['value']<=d['max'] for r in d['rows'])):raise ValueError('Invalid bar values')
    if d['kind']=='line':
        xs,ys=d['xDomain'],d['yDomain']
        if not(xs[0]<xs[1] and ys[0]<ys[1]):raise ValueError('Invalid domains')
        if any(not all(isfinite(v) for v in p) or not(xs[0]<=p[0]<=xs[1] and ys[0]<=p[1]<=ys[1]) for p in d['points']):raise ValueError('Point outside domains')
    return d

class Scene:
    def __init__(self,d):self.w=360;self.h=d['height'];self.ops=[]
    def line(self,x1,y1,x2,y2,role='muted',dash=False):self.ops.append(('line',x1,y1,x2,y2,role,dash))
    def rect(self,x,y,w,h,fill='paper'):self.ops.append(('rect',x,y,w,h,fill))
    def dot(self,x,y,r=3,fill='ink'):self.ops.append(('dot',x,y,r,fill))
    def text(self,value,x,y,size=9,anchor='start',bold=False,width=None):
        from reportlab_layout import SANS,SANS_BOLD
        font=SANS_BOLD if bold else SANS
        for i,row in enumerate(str(value).split('\n')):
            length=stringWidth(row,font,size)
            left=x-length/2 if anchor=='middle' else x-length if anchor=='end' else x
            yy=y+i*size*1.3
            if left<-.1 or left+length>self.w+.1 or yy>self.h or yy<size:raise ValueError('Chart text out of bounds: '+row)
            if width and length>width:raise ValueError('Chart label exceeds slot: '+row)
            self.ops.append(('text',row,x,yy,size,anchor,bold))

def scene(d):
    validate(d);s=Scene(d);s.text(d['title'],180,16,10.4,'middle',True)
    if d['kind']=='timeline':
        left,pw,top=114,232,53
        for i in range(10):s.text(str(i+1),left+(i+.5)*pw/10,39,8,'middle')
        s.text('Week',9,39,8.5)
        for i,r in enumerate(d['rows']):
            y=top+i*28;s.text(r['label'],left-9,y+10,8.5,'end',width=102)
            x=left+(r['start']-1)*pw/10;w=(r['end']-r['start']+1)*pw/10
            s.rect(x,y,w,17,'shade');s.text(f"{r['start']}–{r['end']}",x+w/2,y+12,8.5,'middle',True)
        s.text('Each release still needs at least 14 calendar days of follow-up.',10,190,8.5)
        s.text('Illustrative schedule; confirm actual dates before enrollment.',10,205,8.5)
    elif d['kind']=='trial-matrix':
        left,step=56,19.4;s.text('Case',8,43,8.5)
        for col in range(15):s.text(str(col+1),left+col*step,43,8,'middle')
        for row,values in enumerate(d['values']):
            y=61+row*24;s.text(f'Trial {row+1}',8,y+3,8.5)
            for col,value in enumerate(values):
                x=left+col*step;s.rect(x-5,y-6,10,12,'ink' if value else 'paper')
                if not value:s.line(x-3,y-4,x+3,y+4,'ink');s.line(x+3,y-4,x-3,y+4,'ink')
        s.text('41/45 trials pass. Case 1 fails all three.',10,149,10,bold=True)
        s.text('One possible result; case-level checks expose the failure.',10,167,8.4)
        s.rect(12,185,8,8,'ink');s.text('Pass',27,192,8.5);s.rect(80,185,8,8);s.line(81,186,87,192,'ink');s.line(87,186,81,192,'ink');s.text('Fail',95,192,8.5)
    elif d['kind']=='budget':
        left,pw,top=12,336,62;total=sum(r['value'] for r in d['segments']);maximum=d['max'];scale=pw/maximum
        s.rect(left,top,pw,34,'paper');x=left
        for i,r in enumerate(d['segments']):
            width=r['value']*scale;s.rect(x,top,width,34,'shade' if i%2==0 else 'paper');s.text(r['label'],x+width/2,53,8.5,'middle',True);s.text(f"${r['value']:,}",x+width/2,83,9,'middle');x+=width
        reserve=maximum-total;s.text('Reserve',left+(total+reserve/2)*scale,53,8,'middle');s.text(f'${reserve:,}',left+(total+reserve/2)*scale,83,8,'middle')
        marker=left+d['lowerCap']*scale;s.line(marker,59,marker,103,'ink',True)
        for n in [0,20000,40000,60000,80000]:s.text('$0' if n==0 else f'${n//1000}k',left+n*scale,115,8,'middle' if n else 'start')
        s.text(f'Cost before reserve: ${total:,}',12,140,10,bold=True)
        s.text(f"${d['lowerCap']:,} cap: ${total-d['lowerCap']:,} short (dashed mark).",12,160,9)
        s.text(f"${maximum:,} cap: ${maximum-total:,} available after full cost.",12,178,9)
        s.text('No-benefit plan; all 48 assignments remain in cost.',12,202,8.5)
    elif d['kind']=='bars':
        left,pw=96,225
        for i,r in enumerate(d['rows']):
            y=54+i*48;width=r['value']/d['max']*pw;s.text(r['label'],left-9,y+15,9,'end');s.rect(left,y,width,23,'shade' if i==0 else 'ink');s.text(f"${r['value']:,}",left+width+6,y+16,10,bold=True)
        s.line(left,151,left+pw,151)
        for n in [0,500,1000,1500]:s.text('$0' if n==0 else f'${n:,}',left+n/d['max']*pw,166,8,'middle')
        s.text('Recurring cost per confirmed timely outcome',180,187,8.5,'middle')
        s.text('23 confirmed / 24 assigned in each group. Unsuccessful work included.',9,208,8.2)
        s.text('Cost ratio 0.692; pilot unit cost 30.8% lower.',9,226,9,bold=True)
    elif d['kind']=='line':
        left,right,top,bottom=38,340,37,168
        xd,yd=d['xDomain'],d['yDomain'];x=lambda v:left+(v-xd[0])/(xd[1]-xd[0])*(right-left);y=lambda v:bottom-(v-yd[0])/(yd[1]-yd[0])*(bottom-top)
        for n in [0,6,12,18,24]:s.line(left,y(n),right,y(n),'muted',n==12);s.text(str(n),left-7,y(n)+3,8,'end')
        s.text('Weeks',8,27,8)
        points=d['points']
        for a,b in zip(points,points[1:]):s.line(x(a[0]),y(a[1]),x(b[0]),y(b[1]),'ink')
        for a,b in d['markers']:s.dot(x(a),y(b),3,'paper')
        for n in [50,75,88,100]:s.text(f'{n}%',x(n),183,8,'middle' if n<100 else 'end')
        s.text('12-week requirement',left+5,y(12)-5,8.2)
        s.text('75%: 14.3 weeks',x(75)+8,y(d['markers'][0][1])-14,8.5,'start')
        s.text('100%: 10.4 weeks',right,y(d['markers'][-1][1])+15,8.5,'end')
        s.text('Share of saved time used for completed priority work',180,208,8.4,'middle')
        s.text('Forecast: demand, rates and delivery capacity held fixed.',10,229,8.2)
    return s

def render(d,canvas=None):
    s=scene(d)
    from reportlab_layout import INK,WHITE,PALE_GRAY,MID_GRAY,SANS,SANS_BOLD
    colors={'ink':INK,'paper':WHITE,'shade':PALE_GRAY,'muted':MID_GRAY};css={'ink':'var(--ink)','paper':'var(--paper)','shade':'color-mix(in srgb, var(--paper) 92%, var(--ink))','muted':'var(--muted)'};out=[]
    for op in s.ops[0 if canvas is not None else 1:]:
        kind,*v=op
        if kind=='text':
            text,x,y,size,anchor,bold=v
            if canvas:
                canvas.setFillColor(INK);canvas.setFont(SANS_BOLD if bold else SANS,size)
                fn=canvas.drawCentredString if anchor=='middle' else canvas.drawRightString if anchor=='end' else canvas.drawString;fn(x,s.h-y,text)
            out.append(f'<text x="{x}" y="{y}" font-size="{size}" font-family="var(--sans)" text-anchor="{anchor}" font-weight="{700 if bold else 400}" fill="var(--ink)">{escape(text)}</text>')
        elif kind=='line':
            x1,y1,x2,y2,role,dash=v
            if canvas:
                canvas.setStrokeColor(colors[role]);canvas.setLineWidth(.6);canvas.setDash(3,2) if dash else canvas.setDash();canvas.line(x1,s.h-y1,x2,s.h-y2);canvas.setDash()
            out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{css[role]}" stroke-width=".6"'+(' stroke-dasharray="3 2"' if dash else '')+'/>')
        elif kind=='rect':
            x,y,w,h,fill=v
            if canvas:canvas.setFillColor(colors[fill]);canvas.setStrokeColor(INK);canvas.setLineWidth(.55);canvas.rect(x,s.h-y-h,w,h,fill=1,stroke=1)
            out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{css[fill]}" stroke="var(--ink)" stroke-width=".55"/>')
        elif kind=='dot':
            x,y,r,fill=v
            if canvas:canvas.setFillColor(colors[fill]);canvas.setStrokeColor(INK);canvas.circle(x,s.h-y,r,fill=1,stroke=1)
            out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{css[fill]}" stroke="var(--ink)" stroke-width=".75"/>')
    return ''.join(out)

def html(d):
    content=render(d);key=escape(d['id']);title=escape(d['title']);desc=escape(d['textEquivalent']);source=escape(d.get('sourceNote',''));note=f'<p class="chart-source"><small>{source}</small></p>' if source else ''
    return f'<figure class="reader-concept-diagram reader-quant-chart" data-diagram-title="{title}" data-text-equivalent="{desc}" role="img" aria-labelledby="{key}-title" aria-describedby="{key}-description" data-chart-kind="{d["kind"]}"><figcaption id="{key}-title">{title}</figcaption><div class="chart-viewport" tabindex="0" role="region" aria-label="{title}; scroll horizontally on a narrow screen" style="overflow-x:auto"><svg viewBox="0 0 360 {d["height"]}" style="display:block;width:100%;min-width:540px;height:auto" aria-hidden="true">{content}</svg></div><p class="concept-description" id="{key}-description">{desc}</p>{note}</figure>'
