"""Freeze PDF derivatives from verified authored artwork pairs without touching originals."""
import json,hashlib,math
from pathlib import Path
from PIL import Image
from pdf_theme import theme_tokens

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def bound(root, name):
    p = Path(root) / name
    if Path(name).is_absolute() or '..' in Path(name).parts or p.is_symlink() or not p.resolve().is_relative_to(Path(root).resolve()): raise ValueError('Unsafe artwork path')
    return p

def normalize(book, output, config):
    book, output = Path(book).resolve(), Path(output).resolve()
    if output.exists(): raise ValueError('Derivative directory already exists')
    if output.is_relative_to(book / 'assets'): raise ValueError('Preserve selected originals')
    pairs_path = book / 'artwork-pairs.json'; pairs = json.loads(pairs_path.read_text())
    output.mkdir(parents=True); records=[]
    for entry in pairs['artwork']:
        light=bound(book,entry['light']); dark=bound(book,entry['dark'])
        for p,sha in [(light,entry['lightSha256']),(dark,entry['darkSha256'])]:
            if digest(p)!=sha: raise ValueError('Stale artwork hash: '+str(p))
        im=Image.open(dark).convert('RGBA')
        if im.size!=tuple(entry['darkDimensions']): raise ValueError('Artwork dimensions changed')
        if list(im.getchannel('A').getextrema())!=entry['transparencyReview']['alphaRange'] or im.getchannel('A').getextrema()[0]!=0: raise ValueError('Authored alpha range changed')
        paper=theme_tokens('dark')['paper']
        # Keep foreground proportions. Letterbox into an integer multiple of the
        # released Light frame so both renderers place the exact same rectangle.
        reference=book/'assets/chapter-art/pdf'/f"chapter-{entry['chapter']:02d}.png"
        if not reference.exists():reference=light
        lw,lh=Image.open(reference).size
        multiplier=max(1,math.ceil(max(im.width/lw,im.height/lh)))
        frame=(lw*multiplier,lh*multiplier);scale=min(frame[0]/im.width,frame[1]/im.height)
        resized=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        offset=((frame[0]-resized.width)//2,(frame[1]-resized.height)//2)
        plate=Image.new('RGBA',frame,paper); plate.alpha_composite(resized,offset)
        dest=output / f"chapter-{entry['chapter']:02d}.png"
        plate.convert('RGB').save(dest)
        # Place dark art at the same frame aspect as the released PDF derivative.
        records.append({'chapter':entry['chapter'],'pairManifestSha256':digest(pairs_path),'original':entry['dark'],'originalSha256':digest(dark),'normalized':dest.name,'normalizedSha256':digest(dest),'dimensions':list(frame),'mode':'RGB','transform':{'operation':'alpha composite','background':paper,'crop':None,'resize':'proportional LANCZOS','scale':scale,'offset':list(offset),'releasedLightFrame':str(reference.relative_to(book)),'releasedLightFrameSha256':digest(reference)},'lightReference':entry['light'],'lightReferenceSha256':digest(light)})
    (output/'manifest.json').write_text(json.dumps({'schemaVersion':1,'book':config['id'],'theme':'dark','artwork':records},indent=2)+'\n')
    return output
