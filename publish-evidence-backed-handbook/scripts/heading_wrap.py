"""Measured PDF heading wrapping without changing text or typography."""
from reportlab.platypus import Paragraph
import re
from html import escape
from html.parser import HTMLParser

HEADING_STYLES = frozenset({'H1', 'H2', 'H3', 'TOCTitle'})


def measured_lines(paragraph):
    lines = []
    for line in paragraph.blPara.lines:
        if isinstance(line, tuple):
            extra, words = line
            text = ' '.join(words)
        else:
            extra = line.extraSpace
            text = ''.join(getattr(word, 'text', '') for word in line.words)
        lines.append({'text': text, 'width': paragraph.width - extra})
    return lines


def stranded_tail(lines, available_width):
    return len(lines) > 1 and (len(lines[-1]['text'].split()) < 2 or
                               lines[-1]['width'] < available_width * .25)


class BalancedHeading(Paragraph):
    """Move words as a group instead of shrinking type or editing the heading.

    Choose the widest measured line width that removes a stranded final word
    or a final fragment below one quarter of the available width. Preserve the
    original line count and explicit author line breaks. If no legal solution
    exists, retain the original geometry for review rather than forcing a split.
    """
    def wrap(self, availWidth, availHeight):
        width, height = super().wrap(availWidth, availHeight)
        original = measured_lines(self)
        self.heading_original_lines = original
        self.heading_wrap_width = availWidth
        if '<br' in self.text.lower() or not stranded_tail(original, availWidth):
            self.heading_lines = original
            return width, height
        count = len(original)
        chosen = availWidth
        # A one-point search is deterministic and keeps the largest possible
        # width. Paragraph measures the actual font, kerning and rich text.
        for step in range(1, max(1, int(availWidth))):
            candidate = availWidth - step
            super().wrap(candidate, availHeight)
            lines = measured_lines(self)
            if len(lines) > count:
                break
            if not stranded_tail(lines, availWidth):
                chosen = candidate
                break
        _, height = super().wrap(chosen, availHeight)
        self.heading_wrap_width = chosen
        self.heading_lines = measured_lines(self)
        return availWidth, height


class IndexReferenceParagraph(Paragraph):
    """Keep a compact group of index entries together at a page boundary."""
    def split(self, availWidth, availHeight):
        return []


def paragraph_class(style):
    if style.name == 'IndexReference':
        return IndexReferenceParagraph
    return BalancedHeading if style.name in HEADING_STYLES or getattr(style, 'handbookHeading', False) else Paragraph


SECTION_PREFIX = re.compile(r'^(\d+(?:\.\d+)+)\s+(.+)$', re.S)


def prepare_pdf_story(story):
    """Separate visible PDF titles from source IDs and link numeric references.

    Reader conversion uses the original story and never calls this PDF hook.
    No author wording, list numbers, chapter markers or numerical data change.
    """
    from reportlab.platypus import Table, KeepTogether
    paragraphs = []
    def walk(item):
        if isinstance(item, Paragraph):
            paragraphs.append(item)
        elif isinstance(item, Table):
            for row in item._cellvalues:
                for cell in row:
                    walk(cell)
        elif isinstance(item, KeepTogether):
            walk(item._content)
        elif isinstance(item, (list, tuple)):
            for child in item:
                walk(child)
    walk(story)
    sections = {}
    for paragraph in paragraphs:
        source = getattr(paragraph, '_pdf_source_text', paragraph.text)
        if paragraph.style.name in ('H2', 'H3'):
            match = SECTION_PREFIX.match(paragraph.getPlainText())
            if match:
                key, title = match.groups()
                sections[key] = (title, 'section-' + key.replace('.', '-'))
                paragraph._pdf_source_text = source
                paragraph._pdf_section_id = key
                paragraph._toc_title = title
                paragraph.__init__('<a name="' + sections[key][1] + '"/>' + escape(title), paragraph.style)
    if not sections:
        return
    # Match whole decimal references, never parts of URLs, versions or values.
    reference = re.compile(r'(?<![\w./$])(?:section\s+)?(\d+\.\d+)(?:[–−-](\d+\.\d+))?(?![\w/]|\.\d)', re.I)
    def link(key):
        title, anchor = sections[key]
        return '<link href="#' + anchor + '">&quot;' + escape(title) + '&quot;</link>'
    class References(HTMLParser):
        def __init__(self, index=False):
            super().__init__(convert_charrefs=False)
            self.parts=[]; self.protected=0; self.index=index
        def handle_starttag(self, tag, attrs):
            self.parts.append(self.get_starttag_text())
            if tag in ('link','a','code'):self.protected+=1
        def handle_endtag(self, tag):
            self.parts.append('</'+tag+'>')
            if tag in ('link','a','code'):self.protected-=1
        def handle_startendtag(self, tag, attrs):self.parts.append(self.get_starttag_text())
        def handle_entityref(self, name):self.parts.append('&'+name+';')
        def handle_charref(self, name):self.parts.append('&#'+name+';')
        def handle_data(self, data):
            def replace(match):
                first, last = match.groups()
                if first not in sections or (last and last not in sections):return match[0]
                explicit = match[0].lower().startswith('section') or re.search(r'\b(?:in|see)\s*$',data[:match.start()],re.I)
                if not self.index and not explicit:return match[0]
                return link(first) + (' and '+link(last) if last else '')
            self.parts.append(data if self.protected else reference.sub(replace,data))
    for paragraph in paragraphs:
        if hasattr(paragraph, '_pdf_source_text'):
            continue
        source = paragraph.text
        parser=References(paragraph.style.name=='IndexReference');parser.feed(source);parser.close();replacement=''.join(parser.parts)
        if replacement != source:
            paragraph._pdf_source_text=source
            paragraph.__init__(replacement,paragraph.style)
