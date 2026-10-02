from pathlib import Path
import json,hashlib,re,subprocess
from pypdf import PdfReader
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'release-manifest.json').read_text());pdf=root/manifest['pdf'];reader=PdfReader(pdf,strict=True);sha=hashlib.sha256(pdf.read_bytes()).hexdigest()
manifest.update(sha256=sha,pages=len(reader.pages),art=[{'path':str(p.relative_to(root)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted((root/'assets/chapter-art').rglob('*.png'))])
(root/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
rows=[];section='Front matter'
for i,page in enumerate(reader.pages,1):
 text=page.extract_text() or '';role='body';match=re.search(r'CHAPTER (\d\d)\s*\n([^\n]+)',text)
 if i==1:role='cover'
 elif '\nContents\n' in text:role='contents'
 if match:section='Chapter '+match[1]+': '+match[2];role='chapter-opener'
 elif 'Further reading' in text.splitlines()[:8]:section='Further reading';role='references'
 elif 'Appendix ' in '\n'.join(text.splitlines()[:6]):section=' / '.join(text.splitlines()[:4]);role='appendix'
 row={'page':i,'role':role,'section':section,'textCharacters':len(text)}
 if match:row['requiredRasterIllustration']={'paintCount':1,'minimumEffectivePpi':240,'requireOpaque':True}
 rows.append(row)
assert sum(x['role']=='chapter-opener' for x in rows)==12
(root/'qa/page-map.json').write_text(json.dumps({'artifactProfile':'candidate','pdfSha256':sha,'pages':rows},indent=2)+'\n')
subprocess.run(['pdftotext','-layout',str(pdf),str(root/'qa/manuscript.txt')],check=True)
print(json.dumps({'sha256':sha,'pages':len(reader.pages),'status':'derived manifest refreshed; validation and visual review still required'},indent=2))
