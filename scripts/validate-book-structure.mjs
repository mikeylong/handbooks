import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'..'),id=process.argv[2];
const catalog=JSON.parse(readFileSync(resolve(root,'catalog.json')));
const book=catalog.books.find(b=>b.id===id&&b.status==='published');
if(!book)throw Error('Published book required');
const manifest=JSON.parse(readFileSync(resolve(root,id,'release-manifest.json')));
const variants=JSON.parse(readFileSync(resolve(root,id,'pdf-variants.json')));
const paths=variants.variants.map(v=>v.path);
const common=['--book',id,'--html',`site/output/site/${id}/index.html`];
const pdfs=paths.flatMap(p=>['--pdf',p]);
for(const script of ['validate-term-index.py','validate-heading-labels.py']){
 const extra=script==='validate-heading-labels.py'?['--markdown',`site/output/site/${id}/editions/v${manifest.version}/${id}-v${manifest.version}.md`]:[];
 execFileSync('python3',[`publish-evidence-backed-handbook/scripts/${script}`,...common,...extra,...pdfs],{cwd:root,stdio:'inherit'});
}
