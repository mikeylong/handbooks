#!/usr/bin/env python3
"""Derive collection favicons and share cards from governed fonts and reader covers."""
import argparse, hashlib, html, json, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

TOOLKIT=Path(__file__).resolve().parents[1]
FONTS=TOOLKIT/'assets/design-system/fonts'
SIZES=[16,24,32,48,96,180,192]
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def cover_fields(markup):
    def text(pattern):
        match=re.search(pattern,markup,re.S)
        if not match:raise ValueError('Missing reader cover field')
        return html.unescape(re.sub('<[^>]+>','',match[1])).strip()
    return text(r'<h1\b[^>]*>(.*?)</h1>'),text(r'<p\b[^>]*class="cover-subtitle"[^>]*>(.*?)</p>')
def chapter_image(markup,reader,site):
    match=re.search(r'<figure\b[^>]*(?:chapter-art|chapter-figure)[^>]*>(.*?)</figure>',markup,re.S)
    src=re.search(r'<img\b[^>]*src="([^"]+)"',match[1] if match else '')
    if not src:raise ValueError('Sharing card needs existing chapter artwork')
    source=src[1];path=(site/source.lstrip('/') if source.startswith('/') else reader.parent/source).resolve()
    if not path.is_relative_to(site.resolve()) or not path.is_file():raise ValueError('Unsafe or missing chapter artwork')
    return path
def wrapped(text,font,width):
    lines=[];line=''
    for word in text.split():
        candidate=(line+' '+word).strip()
        if font.getlength(candidate)>width:
            if not line:raise ValueError('Unbreakable sharing-card word: '+word)
            lines.append(line);line=word
        else:line=candidate
    if line:lines.append(line)
    return lines
def icon(mark,size):
    scale=8;im=Image.new('RGBA',(size*scale,size*scale));d=ImageDraw.Draw(im);unit=size*scale/16
    d.rounded_rectangle((0,0,size*scale-1,size*scale-1),radius=mark['radius']*unit,fill=mark['background'])
    for polygon in mark['pages']:d.polygon([(x*unit,y*unit) for x,y in polygon],fill=mark['foreground'])
    return im.resize((size,size),Image.Resampling.LANCZOS)
def card(record,brand,mark):
    im=Image.new('RGB',(1200,630),'white');d=ImageDraw.Draw(im)
    sans=lambda size:ImageFont.truetype(str(FONTS/'NotoSans-Regular.ttf'),size)
    serif=lambda size:ImageFont.truetype(str(FONTS/'SourceSerif4-Bold.ttf'),size)
    ink='#191918';muted='#55534e'
    d.line((64,58,1136,58),fill=ink,width=2)
    d.text((64,78),brand['siteName'].upper(),font=sans(20),fill=muted)
    im.paste(icon(mark,40),(1096,78),icon(mark,40))
    title=record['title'];size=94 if record['id']=='collection' else 78
    while size>=60:
        font=serif(size);lines=wrapped(title,font,704)
        if len(lines)<=3 and len(lines)*(size+9)<=270:break
        size-=2
    else:raise ValueError('Title does not fit sharing card: '+title)
    y=138
    for line in lines:d.text((60,y),line,font=font,fill=ink);y+=size+9
    subtitle_font=sans(25);subtitle=wrapped(record['description'],subtitle_font,690)
    if len(subtitle)>3:raise ValueError('Description does not fit sharing card')
    y=max(425,y+22)
    for line in subtitle:d.text((64,y),line,font=subtitle_font,fill=muted);y+=35
    if y>548:raise ValueError('Sharing card text overlaps its footer')
    # Existing approved engraving; no generated replacement or raster filter.
    art=Image.open(record['artwork']).convert('RGBA');art.thumbnail((326,326),Image.Resampling.LANCZOS)
    im.paste(art,(810+(326-art.width)//2,180+(326-art.height)//2),art)
    d.line((64,564,1136,564),fill='#c1bfba',width=1)
    d.text((64,582),brand['author'],font=sans(21),fill=ink)
    domain=brand['origin'].removeprefix('https://');d.text((1136,582),domain,font=sans(20),fill=muted,anchor='ra')
    return im
def build(args):
    site=args.site_output.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
    brand=json.loads(args.brand.read_text());catalog=json.loads(args.catalog.read_text());mark=json.loads((TOOLKIT/'assets/brand/book-mark.json').read_text())
    icon_dir=out/'icons';icon_dir.mkdir(exist_ok=True)
    polygons=''.join('<polygon points="'+' '.join(f'{x},{y}' for x,y in p)+'"/>' for p in mark['pages'])
    (icon_dir/'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="{mark["radius"]}" fill="{mark["background"]}"/><g fill="{mark["foreground"]}">{polygons}</g></svg>\n')
    for size in SIZES:icon(mark,size).save(icon_dir/f'favicon-{size}.png')
    icon(mark,256).save(icon_dir/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
    records=[]
    for book in catalog['books']:
        if book.get('status')!='published':continue
        reader=site/book['id']/'index.html';markup=reader.read_text();title,description=cover_fields(markup)
        if title!=book['title']:raise ValueError('Sharing title differs from catalog')
        records.append(dict(id=book['id'],title=title,description=description,artwork=chapter_image(markup,reader,site)))
    art=next(r['artwork'] for r in records if r['id']==brand['collectionArtworkBook'])
    records.insert(0,dict(id='collection',title=brand['collectionTitle'],description=brand['collectionDescription'],artwork=art))
    result={'schemaVersion':1,'brand':brand,'generator':'build-sharing-assets.py','markSha256':digest(TOOLKIT/'assets/brand/book-mark.json'),'fonts':{p.name:digest(p) for p in [FONTS/'SourceSerif4-Bold.ttf',FONTS/'NotoSans-Regular.ttf']},'icons':{},'cards':{}}
    for p in sorted(icon_dir.iterdir()):result['icons'][p.name]={'sha256':digest(p),'bytes':p.stat().st_size}
    for record in records:
        path=out/(record['id']+'.png');card(record,brand,mark).save(path,optimize=True)
        art=record['artwork'];result['cards'][record['id']]={k:record[k] for k in ['title','description']}
        result['cards'][record['id']].update(file=path.name,sha256=digest(path),width=1200,height=630,bytes=path.stat().st_size,artwork={'path':str(art.relative_to(site)),'sha256':digest(art)},alt=record['title']+' — '+record['description'])
    (out/'manifest.json').write_text(json.dumps(result,indent=2)+'\n')
    print(f'Generated {len(records)} sharing cards and {len(result["icons"])} icon assets')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--site-output',type=Path,required=True);p.add_argument('--brand',type=Path,required=True);p.add_argument('--catalog',type=Path,required=True);p.add_argument('--output',type=Path,required=True);build(p.parse_args())
