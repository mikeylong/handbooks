#!/usr/bin/env python3
"""Portable synthetic PDF runtime fixtures; never production artwork or publication approval."""
import argparse,json,hashlib,subprocess,sys,shutil
from pathlib import Path
from PIL import Image,ImageDraw
TOOLKIT=Path(__file__).resolve().parents[1]
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def create(root,chapters,version):
    root.mkdir(parents=True);(root/'source').mkdir();pairs=[]
    for n in range(1,chapters+1):
        dims=[(1700,600),(800,1700),(2500,1200)][n%3]
        for theme in ['light','dark']:
            folder=root/'assets/chapter-art'/('pdf' if theme=='light' else 'dark');folder.mkdir(parents=True,exist_ok=True)
            im=Image.new('RGBA',dims,'white' if theme=='light' else (0,0,0,0));draw=ImageDraw.Draw(im)
            draw.rectangle((dims[0]*.25,dims[1]*.25,dims[0]*.75,dims[1]*.75),outline='black' if theme=='light' else '#eeece6',width=12)
            file=folder/f'chapter-{n:02d}.png';im.convert('RGB').save(file) if theme=='light' else im.save(file)
        light=root/'assets/chapter-art/pdf'/f'chapter-{n:02d}.png';dark=root/'assets/chapter-art/dark'/light.name
        pairs.append({'chapter':n,'light':str(light.relative_to(root)),'dark':str(dark.relative_to(root)),'lightSha256':h(light),'darkSha256':h(dark),'darkDimensions':list(dims),'transparencyReview':{'alphaRange':[0,255]},'acquisitionMode':'synthetic-test-only'})
    (root/'artwork-pairs.json').write_text(json.dumps({'schemaVersion':1,'book':root.name,'artwork':pairs}))
    cfg={'schemaVersion':1,'id':root.name,'title':'Synthetic fixture','version':version,'date':'2026-10-02','renderer':'reportlab','source':'source/manuscript.py','story':'build_story','fonts':'toolkit','chapterCount':chapters,'pageSizePoints':[420,594.96],'releasedPdf':None}
    (root/'pdf-config.json').write_text(json.dumps(cfg))
    (root/'source/diagrams').mkdir();(root/'source/diagrams/EvidenceLoop.json').write_text(json.dumps({'title':'Repeated fixture diagram','kind':'sequence','nodes':[{'id':str(i),'label':f'Stage {i}'} for i in range(1,7)],'edges':[{'from':str(i),'to':str(i+1)} for i in range(1,6)]+[{'from':'6','to':'1','feedback':True}],'note':'Synthetic repeated diagram'}))
    (root/'source/manuscript.py').write_text('''from reportlab_layout import *
def build_story():
    story=[P(CONFIG['title'],COVER_TITLE),P('Synthetic fixture, never public.',BODY),PageBreak()]
    for n in range(1,CONFIG['chapterCount']+1):
        story.extend([P(f'CHAPTER {n:02d}',CHAPTER_KICKER),P(f'Chapter {n}',H1),ChapterIllustration(n,height=100),P('Fixture content with a repeated table and diagram.',BODY),data_table([['Role','Value'],['Test','Shared runtime']],[160,186]),EvidenceLoop(),EvidenceLoop(),PageBreak()])
    return story
''')
    return cfg
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--browser');p.add_argument('--playwright-module');a=p.parse_args();out=Path(a.output).resolve()
    if out.exists():raise SystemExit('Use a new fixture output directory')
    out.mkdir(parents=True)
    previous=out/'previous-edition';create(previous,2,'1.0.0')
    previous_pdf=out/'baselines/previous.pdf'
    subprocess.run(['node',str(TOOLKIT/'scripts/build-pdf-variants.mjs'),'--book',str(previous),'--config',str(previous/'pdf-config.json'),'--theme','light','--output',str(previous_pdf),'--python',sys.executable],check=True)
    for name,count,version in [('next-edition',3,'1.1.0'),('future-title',25,'1.0.0')]:
        root=out/name;create(root,count,version)
        if name=='next-edition':
            (root/'reference').mkdir();shutil.copy2(previous_pdf,root/'reference/previous.pdf')
            config=json.loads((root/'pdf-config.json').read_text())
            config.update(releasedPdf='reference/previous.pdf',releasedSha256=h(previous_pdf),baselineMode='content-edition')
            (root/'pdf-config.json').write_text(json.dumps(config))
        for theme in ['light','dark']:
            subprocess.run(['node',str(TOOLKIT/'scripts/build-pdf-variants.mjs'),'--book',str(root),'--config',str(root/'pdf-config.json'),'--theme',theme,'--output',str(out/'pdfs'/name/(theme+'.pdf')),'--python',sys.executable],check=True)
    # Same shared Chromium adapter, governing fixture geometry; no sibling-book imports.
    if a.browser and a.playwright_module:
        root=out/'chromium-fixture';root.mkdir();(root/'source.html').write_text('<!doctype html><html lang="en"><head><style>@page{size:420pt 594.96pt;margin:40pt}body{font-family:Arial}h1{break-before:page}</style></head><body><h1>Fixture cover</h1><h1>Contents</h1><h1>Chapter 1</h1><p>Repeated diagram labels remain searchable.</p><h1>Narrative</h1><p>Future edition.</p></body></html>')
        cfg={'id':'chromium-fixture','title':'Synthetic fixture','author':'Fixture author','subtitle':'Fixture','chapters':[],'renderer':'chromium','source':'source.html','chapterCount':0,'runningFont':str(TOOLKIT/'assets/design-system/fonts/NotoSans-Regular.ttf')}
        (root/'pdf-config.json').write_text(json.dumps(cfg));(root/'artwork-pairs.json').write_text(json.dumps({'schemaVersion':1,'book':root.name,'artwork':[]}))
        for theme in ['light','dark']:
            subprocess.run(['node',str(TOOLKIT/'scripts/build-pdf-variants.mjs'),'--book',str(root),'--config',str(root/'pdf-config.json'),'--theme',theme,'--output',str(out/'pdfs'/root.name/(theme+'.pdf')),'--python',sys.executable,'--browser',a.browser,'--playwright-module',a.playwright_module],check=True)
    print(json.dumps({'status':'generated','directory':str(out)}))
