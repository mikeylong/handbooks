#!/usr/bin/env python3
"""Exercise actual prior PDFs, changed pagination and both finalization paths."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
from pypdf import PdfReader, PdfWriter

TOOLKIT = Path(__file__).resolve().parents[1]


def assert_embedded_page_fonts(reader):
    """A companion must not retain unused standard-font resources."""
    count=0
    for page in reader.pages:
        resources=page['/Resources'].get_object()
        fonts=resources.get('/Font',{}).get_object()
        for font_ref in fonts.values():
            font=font_ref.get_object()
            faces=font.get('/DescendantFonts',[font])
            for face_ref in faces:
                face=face_ref.get_object()
                descriptor=face.get('/FontDescriptor')
                descriptor=descriptor.get_object() if descriptor else {}
                assert any(descriptor.get(key) for key in ('/FontFile','/FontFile2','/FontFile3')),font.get('/BaseFont')
            count+=1
    assert count>0
    return count

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    output=args.output.resolve()
    if output.exists():raise SystemExit('Use a new baseline-test output directory')
    book=output/'book';(book/'source').mkdir(parents=True)
    (book/'source/manuscript.py').write_text('''import os,json
from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate,Paragraph,PageBreak
from reportlab.lib.styles import getSampleStyleSheet
CONFIG=json.loads(os.environ['HANDBOOK_PDF_CONFIG'])
SERIF='FixtureSans'
pdfmetrics.registerFont(TTFont(SERIF,str(Path(os.environ['HANDBOOK_PUBLISHING_TOOLKIT'])/'assets/design-system/fonts/NotoSans-Regular.ttf')))
class FixtureDoc(SimpleDocTemplate):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,pagesize=(420,594.96),**kwargs)
        self.logical_page_offset=1
    def afterFlowable(self,flowable):
        # Deliberately list/select a standard font without painting with it.
        self.canv.setFont('Helvetica',10)
        self.canv.setFont(SERIF,10)
def story():
    style=getSampleStyleSheet()['BodyText'];style.fontName=SERIF
    result=[]
    for n in range(CONFIG['fixturePages']):
        if n:result.append(PageBreak())
        result.append(Paragraph('Synthetic content page '+str(n+1),style))
    return result
''')
    config={'id':'baseline-fixture','title':'Baseline fixture','version':'1.0.0','date':'2026-10-05','renderer':'reportlab','source':'source/manuscript.py','story':'story','docClass':'FixtureDoc','chapterCount':0,'fixturePages':4,'pageLabelStyle':'frontmatter-roman','releasedPdf':None}
    config_path=book/'pdf-config.json';records=[]
    def run(name,cfg,error=None,chromium=False,input_name='edition'):
        config_path.write_text(json.dumps(cfg));destination=output/(name+'.pdf')
        command=([sys.executable,str(TOOLKIT/'scripts/finalize_chromium_pdf.py'),'--book',str(book),'--input',str(output/(input_name+'.pdf')),'--output',str(destination),'--config',str(config_path),'--theme','light'] if chromium else ['node',str(TOOLKIT/'scripts/build-pdf-variants.mjs'),'--book',str(book),'--config',str(config_path),'--theme','light','--output',str(destination),'--python',sys.executable])
        result=subprocess.run(command,capture_output=True,text=True)
        assert (result.returncode!=0 and error in result.stderr) if error else result.returncode==0,(name,result.stdout,result.stderr)
        records.append({'case':name,'status':'passed','expectedError':error,'exitCode':result.returncode})
        return destination
    prior=run('prior',config)
    writer=PdfWriter(clone_from=PdfReader(prior));writer.set_page_label(0,3,prefix='Previous-',start=1)
    baseline=book/'previous.pdf';writer.write(baseline)
    before=hashlib.sha256(baseline.read_bytes()).hexdigest()
    cfg={**config,'releasedPdf':'previous.pdf','releasedSha256':before}
    edition=run('edition',{**cfg,'version':'1.1.0','fixturePages':5,'baselineMode':'content-edition'})
    reader=PdfReader(edition)
    assert len(reader.pages)==5 and len(PdfReader(baseline).pages)==4
    assert reader.page_labels==['i','1','2','3','4'],reader.page_labels
    for name,mode in [('companion','appearance-companion'),('legacy-companion',None)]:
        companion=run(name,{**cfg,'baselineMode':mode})
        companion_reader=PdfReader(companion,strict=True)
        baseline_reader=PdfReader(baseline,strict=True)
        assert companion_reader.page_labels==baseline_reader.page_labels
        assert [page.extract_text() for page in companion_reader.pages]==[page.extract_text() for page in baseline_reader.pages]
        font_count=assert_embedded_page_fonts(companion_reader)
        records[-1]['fontResourcesChecked']=font_count
        records[-1]['paintedTextPreserved']=True
    run('companion-pagination-rejected',{**cfg,'fixturePages':5,'baselineMode':'appearance-companion'},'Pagination mismatch')
    run('bad-hash-rejected',{**cfg,'releasedSha256':'0'*64,'baselineMode':'content-edition'},'releasedSha256 mismatch')
    assert not (output/'bad-hash-rejected.pdf').exists()
    run('missing-hash-rejected',{**cfg,'releasedSha256':None},'Missing or invalid releasedSha256')
    run('unknown-mode-rejected',{**cfg,'baselineMode':'other'},'Unknown PDF baselineMode')
    run('unsafe-baseline-rejected',{**cfg,'releasedPdf':'../previous.pdf'},'Unsafe releasedPdf path')
    chromium={**cfg,'author':'Fixture author','subtitle':'Fixture','chapters':[],'runningFont':str(TOOLKIT/'assets/design-system/fonts/NotoSans-Regular.ttf')}
    new=run('chromium-edition',{**chromium,'baselineMode':'content-edition'},chromium=True)
    assert PdfReader(new).page_labels==['Cover','ii','iii','1','2']
    same=run('chromium-companion',{**chromium,'baselineMode':'appearance-companion'},chromium=True,input_name='prior')
    assert PdfReader(same).page_labels==PdfReader(baseline).page_labels
    run('chromium-companion-pagination-rejected',{**chromium,'baselineMode':'appearance-companion'},'Pagination mismatch',chromium=True)
    run('chromium-bad-hash-rejected',{**chromium,'releasedSha256':'0'*64,'baselineMode':'content-edition'},'releasedSha256 mismatch',chromium=True)
    assert not (output/'chromium-bad-hash-rejected.pdf').exists()
    assert hashlib.sha256(baseline.read_bytes()).hexdigest()==before
    report={'status':'passed','cases':records,'previousSha256':before,'previousPreserved':True,'previousPages':4,'editionPages':5,'editionLabels':reader.page_labels,'toolkit':TOOLKIT.name}
    (output/'baseline-tests.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

if __name__=='__main__':main()
