"""Canonical alphabetical term indexes: one entry per term, linked printed pages."""
from collections import defaultdict
from html import escape
import json
from pathlib import Path
import re
from reportlab.platypus import Paragraph,Table,TableStyle,KeepTogether,HRFlowable
from reportlab.platypus.flowables import BalancedColumns

PREFIX=re.compile(r'^(\d+\.\d+|[A-Z])\.?(?:\s+)(.+)$')
def walk(items):
    for item in items if isinstance(items,(list,tuple)) else [items]:
        if isinstance(item,KeepTogether):yield from walk(item._content)
        elif isinstance(item,Table):
            for row in item._cellvalues:
                for cell in row:yield from walk(cell)
        else:yield item

def bind_index_targets(story):
    """Bind authored section IDs before PDF title preparation removes prefixes."""
    for p in walk(story):
        if not isinstance(p,Paragraph) or p.style.name not in ('H2','H3'):continue
        match=PREFIX.match(p.getPlainText())
        if not match:continue
        key,title=match.groups();key='tool-'+key.lower() if key.isalpha() else key
        p._index_section_key=key
        p._index_section_title=p.getPlainText() if key.startswith('tool-') else title
        p._index_section_anchor='index-section-'+key.replace('.','-')

def validate_entries(entries):
    if not entries:raise ValueError('Term index cannot be empty')
    terms=[e.get('term','').strip() for e in entries]
    if any(not t or ':' in t for t in terms) or len({t.casefold() for t in terms})!=len(terms):raise ValueError('Index needs one distinct, plain term per entry')
    if any(not e.get('sections') or len(set(e['sections']))!=len(e['sections']) for e in entries):raise ValueError('Index entries need distinct target sections')
    return sorted(entries,key=lambda e:e['term'].casefold())

class TermIndex(BalancedColumns):
    _canonical_term_index=True
    def __init__(self,book_root,filename='source/index-terms.json'):
        self.book_root=Path(book_root);self.entries=validate_entries(json.loads((self.book_root/filename).read_text())['entries'])
        self._seen={};self._previous={}
        super().__init__([],nCols=2,needed=90,innerPadding=18,leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0,name='CanonicalTermIndex')
    def isIndexing(self):return 1
    def beforeBuild(self):
        self._previous=dict(self._seen);self._seen={};self._content=self._paragraphs(self._previous)
    def afterBuild(self):pass
    def isSatisfied(self):
        same=self._seen==self._previous
        if same:
            missing={s for e in self.entries for s in e['sections']}-self._seen.keys()
            if missing:raise ValueError('Unresolved index targets: '+', '.join(sorted(missing)))
        return same
    def notify(self,kind,stuff):
        if kind=='TermIndexSection':
            key,title,page,anchor=stuff;self._seen[key]={'title':title,'page':str(page),'anchor':anchor}
    def _paragraphs(self,pages):
        from reportlab.lib.styles import ParagraphStyle
        from reportlab_layout import SERIF,SANS_BOLD,INK
        termstyle=ParagraphStyle('TermIndexEntry',fontName=SERIF,fontSize=8.4,leading=11,spaceAfter=4,textColor=INK)
        letterstyle=ParagraphStyle('TermIndexLetter',fontName=SANS_BOLD,fontSize=10,leading=12,spaceBefore=7,spaceAfter=3,textColor=INK,keepWithNext=1)
        out=[];last=None
        for entry in self.entries:
            letter=entry['term'][0].upper()
            if letter!=last:
                out.append(Paragraph(escape(letter),letterstyle))
                rule=HRFlowable(width='100%',thickness=.35,color=INK,spaceAfter=4);rule.keepWithNext=1;out.append(rule);last=letter
            refs=[];seen=set()
            for key in entry['sections']:
                ref=pages.get(key)
                if not ref:refs.append('…');continue
                if ref['page'] in seen:continue
                seen.add(ref['page']);refs.append(f'<link href="#{ref["anchor"]}">{escape(ref["page"])}</link>')
            out.append(Paragraph('<b>'+escape(entry['term'])+'</b> · '+', '.join(refs),termstyle))
        return out
    def html(self,book_root,targets):
        from pypdf import PdfReader
        root=Path(book_root);manifest=json.loads((root/'release-manifest.json').read_text());reader=PdfReader(root/manifest['pdf']);outline={}
        def collect(values):
            for value in values:
                if isinstance(value,list):collect(value)
                elif hasattr(value,'title'):
                    page=reader.get_destination_page_number(value);outline.setdefault(value.title,[]).append(page)
        collect(reader.outline);labels=reader.page_labels;groups=defaultdict(list)
        for e in self.entries:
            refs=[];seen=set()
            for key in e['sections']:
                target=targets.get(key)
                if not target:raise ValueError('Missing HTML index target '+key)
                matches=outline.get(target['title'],[])
                if len(matches)!=1:raise ValueError('Missing or ambiguous PDF index target '+target['title'])
                page=labels[matches[0]]
                if page in seen:continue
                seen.add(page);label=f'{e["term"]}, {target["title"]}, page {page}'
                refs.append(f'<a href="#{escape(target["anchor"])}" aria-label="{escape(label)}">{escape(page)}</a>')
            slug=re.sub('[^a-z0-9]+','-',e['term'].lower()).strip('-')
            groups[e['term'][0].upper()].append(f'<li id="index-{slug}"><span class="index-term">{escape(e["term"])}</span><span class="index-pages">'+', '.join(refs)+'</span></li>')
        return '<div class="term-index" data-term-index><div class="index-columns">'+''.join(f'<section class="index-group" aria-labelledby="index-letter-{letter.lower()}"><h3 id="index-letter-{letter.lower()}">{letter}</h3><ul>'+''.join(rows)+'</ul></section>' for letter,rows in groups.items())+'</div></div>'
