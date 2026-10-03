"""Shared Markdown/directive A5 runtime; book inputs supply content and semantic definitions."""
from __future__ import annotations

import re
from pathlib import Path
import os, json
from pdf_theme import theme_tokens, paint_page
from diagram_data import load_diagram
from typing import Iterable, Sequence
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


CONFIG = json.loads(os.environ.get("HANDBOOK_PDF_CONFIG", "{}"))
ROOT = Path(os.environ["HANDBOOK_BOOK_ROOT"])
TOKENS = theme_tokens(os.environ.get("HANDBOOK_PDF_THEME", "light"))
LINK_COLOR = TOKENS["muted"]
SOURCE_MD = ROOT / CONFIG["markdown"]
OUTPUT_PDF = Path(os.environ.get("HANDBOOK_PDF_OUTPUT", ROOT / "candidate.pdf"))

SPEC = json.loads((Path(__file__).resolve().parents[1] / "handbook-spec.json").read_text())
TYPE_TOKENS = json.loads((Path(__file__).resolve().parents[1] / "assets/design-system/tokens.json").read_text())["type"]
PAGE_W, PAGE_H = SPEC["page"]["widthPoints"], SPEC["page"]["heightPoints"]
LEFT = 13 * mm
RIGHT = 13 * mm
TOP = 15 * mm
BOTTOM = 18 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT

INK = HexColor(TOKENS['ink'])
DARK = HexColor(TOKENS['raised']) if os.environ.get('HANDBOOK_PDF_THEME')=='dark' else HexColor('#262624')
MID = HexColor(TOKENS['muted'])
LINE = HexColor(TOKENS['rule'])
PALE = HexColor(TOKENS['raised'])
PALE_2 = PALE
WHITE = HexColor(TOKENS['paper'])
HEAD_INK = HexColor(TOKENS['ink']) if os.environ.get('HANDBOOK_PDF_THEME')=='dark' else WHITE
FONT_DIR = Path(__file__).resolve().parents[1] / 'assets/design-system/fonts'


def _register_family(name: str, candidates: Sequence[Sequence[str]], fallback: Sequence[str]) -> tuple[str, str, str, str]:
    for regular, bold, italic, bold_italic in candidates:
        if all(Path(path).exists() for path in (regular, bold, italic, bold_italic)):
            pdfmetrics.registerFont(TTFont(name, regular))
            pdfmetrics.registerFont(TTFont(f"{name}-Bold", bold))
            pdfmetrics.registerFont(TTFont(f"{name}-Italic", italic))
            pdfmetrics.registerFont(TTFont(f"{name}-BoldItalic", bold_italic))
            pdfmetrics.registerFontFamily(
                name,
                normal=name,
                bold=f"{name}-Bold",
                italic=f"{name}-Italic",
                boldItalic=f"{name}-BoldItalic",
            )
            return name, f"{name}-Bold", f"{name}-Italic", f"{name}-BoldItalic"
    return tuple(fallback)  # type: ignore[return-value]


SANS, SANS_BOLD, SANS_ITALIC, SANS_BOLD_ITALIC = _register_family('GuideSans',[(str(FONT_DIR/'NotoSans-Regular.ttf'),str(FONT_DIR/'NotoSans-Bold.ttf'),str(FONT_DIR/'NotoSans-Regular.ttf'),str(FONT_DIR/'NotoSans-Bold.ttf'))],())
SERIF, SERIF_BOLD, SERIF_ITALIC, SERIF_BOLD_ITALIC = _register_family('GuideSerif',[(str(FONT_DIR/'SourceSerif4-Regular.ttf'),str(FONT_DIR/'SourceSerif4-Bold.ttf'),str(FONT_DIR/'SourceSerif4-RegularItalic.ttf'),str(FONT_DIR/'SourceSerif4-BoldItalic.ttf'))],())
MONO = 'GuideMono'; MONO_BOLD = 'GuideMonoBold'
pdfmetrics.registerFont(TTFont(MONO,str(FONT_DIR/'SourceCodePro-Regular.ttf')))
pdfmetrics.registerFont(TTFont(MONO_BOLD,str(FONT_DIR/'SourceCodePro-Semibold.ttf')))


def clean(text: str) -> str:
    replacements = {
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u2192": "->",
        "\u00a0": " ",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


BASE = getSampleStyleSheet()
BODY = ParagraphStyle(
    "Body",
    parent=BASE["BodyText"],
    fontName=SERIF,
    fontSize=10,
    leading=15,
    textColor=INK,
    spaceAfter=6,
    allowWidows=0,
    allowOrphans=0,
)
BODY_TIGHT = ParagraphStyle("BodyTight", parent=BODY, fontSize=8.85, leading=12.1, spaceAfter=3.5)
SMALL = ParagraphStyle("Small", parent=BODY, fontName=SANS, fontSize=7.1, leading=9.5, textColor=MID, spaceAfter=3)
CAPTION = ParagraphStyle("Caption", parent=SMALL, fontName=SERIF_ITALIC, fontSize=7.4, leading=9.7)
H1 = ParagraphStyle(
    "H1",
    parent=BASE["Heading1"],
    fontName=SERIF,
    fontSize=28,
    leading=28 * 0.98,
    textColor=INK,
    spaceBefore=0,
    spaceAfter=9,
    keepWithNext=1,
)
H2 = ParagraphStyle(
    "H2",
    parent=BASE["Heading2"],
    fontName=SERIF_BOLD,
    fontSize=18,
    leading=18 * 1.12,
    textColor=INK,
    spaceBefore=13,
    spaceAfter=5,
    keepWithNext=1,
)
H3 = ParagraphStyle(
    "H3",
    parent=BASE["Heading3"],
    fontName=SANS_BOLD,
    fontSize=14,
    leading=14 * 1.2,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=4,
    keepWithNext=1,
)
DECK = ParagraphStyle("Deck", parent=BODY, fontName=SERIF_ITALIC, fontSize=10.9, leading=15.6, textColor=MID, spaceAfter=13)
COVER_KICKER = ParagraphStyle("CoverKicker", parent=SMALL, fontName=SANS_BOLD, fontSize=7.2, leading=9.2, tracking=1.5, textColor=INK)
COVER_TITLE = ParagraphStyle("CoverTitle", parent=H1, fontSize=42, leading=42 * 0.9, spaceAfter=14)
COVER_DECK = ParagraphStyle("CoverDeck", parent=DECK, fontSize=11.4, leading=16, textColor=INK)
CHAPTER_KICKER = ParagraphStyle("ChapterKicker", parent=SMALL, fontName=SANS_BOLD, fontSize=7.2, leading=9, tracking=1.5, textColor=INK, spaceAfter=10)
CHAPTER_DECK = ParagraphStyle("ChapterDeck", parent=DECK, fontSize=10.6, leading=15.3, textColor=MID, spaceBefore=7, spaceAfter=13)
TABLE_TEXT = ParagraphStyle("TableText", parent=BODY, fontName=SANS, fontSize=7.2, leading=7.2 * 1.3, spaceAfter=0)
TABLE_HEAD = ParagraphStyle("TableHead", parent=TABLE_TEXT, fontName=SANS_BOLD, fontSize=6.95, leading=8.75, splitLongWords=0)
CALLOUT_TITLE = ParagraphStyle("CalloutTitle", parent=BODY, fontName=SANS_BOLD, fontSize=7.2, leading=9.2, tracking=0.5, spaceAfter=3)
CALLOUT_BODY = ParagraphStyle("CalloutBody", parent=BODY, fontSize=8.95, leading=12.8, spaceAfter=0)
PROMPT_HEAD = ParagraphStyle("PromptHead", parent=SMALL, fontName=SANS_BOLD, fontSize=7.0, leading=8.8, textColor=HEAD_INK, tracking=0.5, spaceAfter=0)
PROMPT_BODY = ParagraphStyle(
    "PromptBody",
    parent=BODY_TIGHT,
    fontName=MONO,
    fontSize=7.8,
    leading=7.8 * 1.55,
    textColor=INK,
    backColor=None,
    borderColor=None,
    borderWidth=0,
    borderPadding=0,
    spaceBefore=0,
    spaceAfter=0,
    splitLongWords=1,
)
CODE = ParagraphStyle(
    "Code",
    parent=PROMPT_BODY,
    fontSize=7.8,
    leading=7.8 * 1.55,
)
WORKSHEET_LABEL = ParagraphStyle("WorksheetLabel", parent=BODY, fontName=SANS_BOLD, fontSize=7.4, leading=9.4, spaceAfter=0)
TOC_TITLE = ParagraphStyle("TOCTitle", parent=H1, fontSize=25.5, leading=28.5, keepWithNext=0)


def _tokenized_inline(text: str) -> str:
    text = clean(text)
    tokens: list[str] = []

    def hold(value: str) -> str:
        index = len(tokens)
        tokens.append(value)
        return f"@@TOK{index}@@"

    def code_repl(match: re.Match[str]) -> str:
        return hold(f'<font name="{MONO}">{escape(match.group(1))}</font>')

    def link_repl(match: re.Match[str]) -> str:
        label = escape(match.group(1))
        url = escape(match.group(2), {'"': '&quot;'})
        return hold(f'<a href="{url}" color="{LINK_COLOR}"><u>{label}</u></a>')

    text = re.sub(r"`([^`]+)`", code_repl, text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", link_repl, text)
    escaped = escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)

    url_pattern = re.compile(r"(?<![\w=\"'])(https?://[^\s<]+)")

    def url_repl(match: re.Match[str]) -> str:
        url = match.group(1).rstrip(".,;)")
        suffix = match.group(1)[len(url):]
        safe = escape(url, {'"': '&quot;'})
        return f'<a href="{safe}" color="{LINK_COLOR}"><u>{safe}</u></a>{suffix}'

    escaped = url_pattern.sub(url_repl, escaped)
    for index, value in enumerate(tokens):
        escaped = escaped.replace(f"@@TOK{index}@@", value)
    return escaped


def P(text: str, style: ParagraphStyle = BODY) -> Paragraph:
    return Paragraph(_tokenized_inline(text), style)


def heading(text: str, level: int) -> Paragraph:
    paragraph = P(text, {1: H1, 2: H2, 3: H3}[level])
    paragraph._toc_title = clean(text)
    return paragraph


class TwoColumnTOC(TableOfContents):
    def _entry(self, entry: tuple[int, str, str, str | None], width: float) -> Table:
        _level, label, page_num, key = entry
        href_open = f'<a href="#{key}">' if key else ""
        href_close = "</a>" if key else ""
        title_style = ParagraphStyle("TOCEntryTitle", parent=BODY_TIGHT, fontName=SERIF, fontSize=7.35, leading=9.25, spaceAfter=0)
        page_style = ParagraphStyle("TOCEntryPage", parent=SMALL, fontSize=6.7, leading=9.25, alignment=TA_RIGHT, spaceAfter=0)
        table = Table(
            [[Paragraph(f"{href_open}{escape(clean(label))}{href_close}", title_style), Paragraph(f"{href_open}{page_num}{href_close}", page_style)]],
            colWidths=[width - 21, 21],
            hAlign="LEFT",
        )
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, -1), 0.35, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]))
        return table

    def wrap(self, availWidth: float, availHeight: float) -> tuple[float, float]:
        entries = self._lastEntries or [(0, "Contents will populate on the next pass", "-", None)]
        split_at = (len(entries) + 1) // 2
        left_entries = entries[:split_at]
        right_entries = entries[split_at:]
        gap = 16
        column_width = (availWidth - gap) / 2
        rows = []
        for index in range(split_at):
            left = self._entry(left_entries[index], column_width)
            right = self._entry(right_entries[index], column_width) if index < len(right_entries) else ""
            rows.append([left, "", right])
        self._table = Table(rows, colWidths=[column_width, gap, column_width], hAlign="LEFT")
        self._table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        self.width, self.height = self._table.wrapOn(self.canv, availWidth, availHeight)
        return self.width, self.height


def bullet_list(items: Iterable[str]) -> Table:
    rows = [[P("-", ParagraphStyle("BulletMark", parent=BODY_TIGHT, fontName=SANS_BOLD)), P(item, BODY_TIGHT)] for item in items]
    table = Table(rows, colWidths=[0.15 * inch, CONTENT_W - 0.15 * inch], hAlign="LEFT", splitByRow=1)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return table


def checklist(items: Iterable[str]) -> Table:
    rows = [[P("[ ]", ParagraphStyle("Checkbox", parent=TABLE_TEXT, fontName=SANS_BOLD)), P(item, BODY_TIGHT)] for item in items]
    table = Table(rows, colWidths=[0.30 * inch, CONTENT_W - 0.30 * inch], hAlign="LEFT", splitByRow=1)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def numbered_steps(items: Sequence[str], *, start: int = 1) -> Table:
    rows = []
    for index, item in enumerate(items, start=start):
        number = Table([[P(str(index), ParagraphStyle("StepNumber", parent=TABLE_TEXT, fontName=SANS_BOLD, alignment=TA_CENTER))]], colWidths=[0.23 * inch], rowHeights=[0.23 * inch])
        number.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.65, INK),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        rows.append([number, P(item, BODY_TIGHT)])
    table = Table(rows, colWidths=[0.36 * inch, CONTENT_W - 0.36 * inch], splitByRow=1)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def callout(kind: str, title: str, body: str) -> list[Flowable]:
    label = kind.replace("-", " ").upper()
    body_style = ParagraphStyle(
        "CalloutBodyDynamic",
        parent=CALLOUT_BODY,
        borderColor=None,
        borderWidth=0,
        borderPadding=0,
        backColor=None,
    )
    panel = Table(
        [[P(f"{label}: {title}", CALLOUT_TITLE)], [P(body.replace("\n", " "), body_style)]],
        colWidths=[CONTENT_W],
        hAlign="LEFT",
        splitByRow=0,
    )
    panel.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("BACKGROUND", (0, 1), (-1, 1), WHITE),
        ("LINEABOVE", (0, 0), (-1, 0), 0.8, INK),
        ("LINEBELOW", (0, 0), (-1, 0), 0.35, LINE),
        ("LINEBEFORE", (0, 1), (0, -1), 0.35, LINE),
        ("LINEAFTER", (-1, 1), (-1, -1), 0.35, LINE),
        ("LINEBELOW", (0, -1), (-1, -1), 0.35, LINE),
        ("LEFTPADDING", (0, 0), (-1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
        ("LEFTPADDING", (0, 1), (-1, -1), 8),
        ("RIGHTPADDING", (0, 1), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
    ]))
    return [KeepTogether([panel]), Spacer(1, 3)]


def _preformatted_paragraphs(body: str, style: ParagraphStyle, *, lines_per_chunk: int = 8) -> list[Paragraph]:
    lines = clean(body).strip("\n").splitlines() or [""]
    paragraphs: list[Paragraph] = []
    for start in range(0, len(lines), lines_per_chunk):
        chunk = lines[start:start + lines_per_chunk]
        rendered = "<br/>".join(escape(line) for line in chunk)
        paragraphs.append(Paragraph(rendered or " ", style))
    return paragraphs


def prompt_block(tool: str, title: str, body: str) -> list[Flowable]:
    body_rows = [[paragraph] for paragraph in _preformatted_paragraphs(body, PROMPT_BODY)]
    table = Table(
        [[P(f"{tool.upper()}  /  {title.upper()}", PROMPT_HEAD)]] + body_rows,
        colWidths=[CONTENT_W],
        hAlign="LEFT",
        repeatRows=1,
        splitByRow=1,
        splitInRow=1,
        spaceAfter=7,
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), DARK),
        ("BACKGROUND", (0, 1), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
        ("TOPPADDING", (0, 1), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 0),
        ("TOPPADDING", (0, 1), (-1, 1), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    return [table]


def code_block(body: str) -> Table:
    rows = [[paragraph] for paragraph in _preformatted_paragraphs(body, CODE)]
    table = Table(rows, colWidths=[CONTENT_W], hAlign="LEFT", splitByRow=1, splitInRow=1, spaceAfter=7)
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PALE_2),
        ("BOX", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 8),
    ]))
    return table


def data_table(rows: Sequence[Sequence[str]]) -> Table:
    columns = max(len(row) for row in rows)
    minimums: list[float] = []
    scores: list[float] = []
    for column in range(columns):
        values = [re.sub(r"[*`]", "", row[column] if column < len(row) else "") for row in rows]
        max_len = max(len(value) for value in values)
        longest_word = max((word for value in values for word in re.split(r"\s+", value) if word), key=len, default="")
        word_width = pdfmetrics.stringWidth(longest_word, SANS, TABLE_TEXT.fontSize)
        minimums.append(max(30, min(92, word_width + 10)))
        scores.append(max(5, min(34, max_len)))
    minimum_total = sum(minimums)
    if minimum_total >= CONTENT_W:
        widths = [width * CONTENT_W / minimum_total for width in minimums]
    else:
        extra = CONTENT_W - minimum_total
        score_total = sum(scores)
        widths = [minimums[index] + extra * scores[index] / score_total for index in range(columns)]
    rendered = []
    for row_index, row in enumerate(rows):
        style = TABLE_HEAD if row_index == 0 else TABLE_TEXT
        rendered.append([P(row[column] if column < len(row) else "", style) for column in range(columns)])
    table = Table(rendered, colWidths=widths, repeatRows=1, hAlign="LEFT", splitByRow=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("LINEABOVE", (0, 0), (-1, 0), 0.8, INK),
        ("LINEBELOW", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def worksheet(title: str, fields: Sequence[tuple[str, int]]) -> Table:
    title_cell = P(title, ParagraphStyle("WorksheetTitle", parent=H3, fontName=SANS_BOLD, fontSize=8.3, leading=10.2, tracking=0.6, spaceAfter=0))
    rows: list[list[object]] = [[title_cell]]
    for label, line_count in fields:
        field_rows: list[list[object]] = [[P(label, WORKSHEET_LABEL)]] + [[""] for _ in range(line_count)]
        heights = [0.27 * inch] + [0.22 * inch for _ in range(line_count)]
        field = Table(field_rows, colWidths=[CONTENT_W], rowHeights=heights, splitByRow=0)
        field.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.4, LINE),
            ("LINEBELOW", (0, 1), (-1, -2), 0.35, LINE),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        rows.append([field])
    form = Table(rows, colWidths=[CONTENT_W], repeatRows=1, hAlign="LEFT", splitByRow=1)
    form.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("LINEABOVE", (0, 0), (-1, 0), 0.9, INK),
        ("LINEBELOW", (0, 0), (-1, 0), 0.45, INK),
        ("LEFTPADDING", (0, 0), (-1, 0), 9),
        ("RIGHTPADDING", (0, 0), (-1, 0), 9),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("LEFTPADDING", (0, 1), (-1, -1), 0),
        ("RIGHTPADDING", (0, 1), (-1, -1), 0),
        ("TOPPADDING", (0, 1), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 3),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return form


class CoverDiagram(Flowable):
    def __init__(self, width: float = CONTENT_W, height: float = 1.65 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        labels = [n["label"] for n in load_diagram(ROOT,"CoverDiagram",kind="sequence",count=5)["nodes"]]
        node_w = 48
        node_h = 28
        gap = (self.width - len(labels) * node_w) / (len(labels) - 1)
        y = self.height * 0.48
        c.setStrokeColor(INK)
        c.setFillColor(WHITE)
        c.setLineWidth(0.8)
        for index, label in enumerate(labels):
            x = index * (node_w + gap)
            c.setFillColor(WHITE)
            c.setStrokeColor(INK)
            c.roundRect(x, y, node_w, node_h, 4, fill=1, stroke=1)
            c.setFont(SANS_BOLD, 6.2)
            c.setFillColor(INK)
            c.drawCentredString(x + node_w / 2, y + 10.5, label)
            if index < len(labels) - 1:
                start = x + node_w
                end = x + node_w + gap
                c.line(start, y + node_h / 2, end - 4, y + node_h / 2)
                path = c.beginPath()
                path.moveTo(end, y + node_h / 2)
                path.lineTo(end - 5, y + node_h / 2 + 3)
                path.lineTo(end - 5, y + node_h / 2 - 3)
                path.close()
                c.drawPath(path, fill=1, stroke=0)
        c.setFillColor(MID)
        for row in range(8):
            for col in range(31):
                if (row + col) % 3 == 0:
                    c.circle(8 + col * 9.7, 14 + row * 5.0, 0.65, fill=1, stroke=0)
        c.setStrokeColor(LINE)
        c.line(0, self.height - 12, self.width, self.height - 12)
        c.restoreState()


def _arrowhead(canvas, x: float, y: float, direction: str, color=MID, size: float = 4.2) -> None:
    half = size * 0.65
    path = canvas.beginPath()
    path.moveTo(x, y)
    if direction == "right":
        path.lineTo(x - size, y + half)
        path.lineTo(x - size, y - half)
    elif direction == "left":
        path.lineTo(x + size, y + half)
        path.lineTo(x + size, y - half)
    elif direction == "down":
        path.lineTo(x - half, y + size)
        path.lineTo(x + half, y + size)
    else:
        path.lineTo(x - half, y - size)
        path.lineTo(x + half, y - size)
    path.close()
    canvas.setFillColor(color)
    canvas.drawPath(path, fill=1, stroke=0)


class WorkflowLoop(Flowable):
    """Eight equal stages in a clockwise operating loop."""

    def __init__(self, width: float = CONTENT_W, height: float = 1.72 * inch):
        super().__init__()
        self.width = width
        self.height = height

    @staticmethod
    def _connector(c, x1: float, y1: float, x2: float, y2: float, direction: str, color=MID, line_width: float = 0.9) -> None:
        c.setStrokeColor(color)
        c.setLineWidth(line_width)
        c.line(x1, y1, x2, y2)
        _arrowhead(c, x2, y2, direction, color)

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        gap = 10
        node_w = (self.width - 3 * gap) / 4
        node_h = 28
        top_y = 75
        bottom_y = 29
        number_rail = 18
        definition = load_diagram(ROOT, 'WorkflowLoop', kind='sequence', count=8, feedback=True)
        labels = {i+1:n['label'] for i,n in enumerate(definition['nodes'])}
        positions = {
            1: (0, top_y),
            2: (node_w + gap, top_y),
            3: (2 * (node_w + gap), top_y),
            4: (3 * (node_w + gap), top_y),
            5: (3 * (node_w + gap), bottom_y),
            6: (2 * (node_w + gap), bottom_y),
            7: (node_w + gap, bottom_y),
            8: (0, bottom_y),
        }
        top_mid = top_y + node_h / 2
        bottom_mid = bottom_y + node_h / 2
        for left_stage, right_stage in ((1, 2), (2, 3), (3, 4)):
            left_x, _ = positions[left_stage]
            right_x, _ = positions[right_stage]
            self._connector(c, left_x + node_w + 2, top_mid, right_x - 2, top_mid, "right")
        right_center = positions[4][0] + node_w / 2
        self._connector(c, right_center, top_y - 2, right_center, bottom_y + node_h + 2, "down")
        for right_stage, left_stage in ((5, 6), (6, 7), (7, 8)):
            right_x, _ = positions[right_stage]
            left_x, _ = positions[left_stage]
            self._connector(c, right_x - 2, bottom_mid, left_x + node_w + 2, bottom_mid, "left")
        left_center = positions[8][0] + node_w / 2
        self._connector(c, left_center, bottom_y + node_h + 2, left_center, top_y - 2, "up", INK, 1.25)

        for stage in range(1, 9):
            x, y = positions[stage]
            c.setFillColor(PALE)
            c.setStrokeColor(INK)
            c.setLineWidth(0.75)
            c.roundRect(x, y, node_w, node_h, 3.5, fill=1, stroke=1)
            c.setStrokeColor(LINE)
            c.setLineWidth(0.55)
            c.line(x + number_rail, y + 5, x + number_rail, y + node_h - 5)
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 7)
            c.drawCentredString(x + number_rail / 2, y + node_h / 2 - 2.2, str(stage))
            c.setFont(SANS_BOLD, 7)
            c.drawCentredString(x + number_rail + (node_w - number_rail) / 2, y + node_h / 2 - 2.3, labels[stage])

        c.setFillColor(MID)
        c.setFont(SERIF_ITALIC, 7.2)
        c.drawCentredString(self.width / 2, 7, definition["note"])
        c.restoreState()


class SurfaceContinuityDiagram(Flowable):
    """One source of product state distributed to four coordinated surfaces."""

    def __init__(self, width: float = CONTENT_W, height: float = 1.78 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        center_y = self.height / 2
        source_x = 2
        source_w = 0.28 * self.width
        source_h = 45
        spine_x = 0.37 * self.width
        card_x = 0.43 * self.width
        card_w = self.width - card_x - 2
        card_h = 24
        card_gap = 7
        title_col = 68
        definition = load_diagram(ROOT, 'SurfaceContinuityDiagram', kind='branch', count=5)
        cards = [(n['label'],n.get('detail','')) for n in definition['nodes'][1:]]
        total_h = len(cards) * card_h + (len(cards) - 1) * card_gap
        bottom_y = (self.height - total_h) / 2
        card_positions = [self.height - bottom_y - card_h - index * (card_h + card_gap) for index in range(len(cards))]
        centers = [y + card_h / 2 for y in card_positions]

        c.setStrokeColor(MID)
        c.setLineWidth(0.85)
        c.line(source_x + source_w, center_y, spine_x, center_y)
        c.line(spine_x, centers[-1], spine_x, centers[0])
        for card_center in centers:
            tip = card_x - 3
            c.line(spine_x, card_center, tip, card_center)
            _arrowhead(c, tip, card_center, "right", MID, 4)

        c.setFillColor(DARK)
        c.setStrokeColor(DARK)
        c.roundRect(source_x, center_y - source_h / 2, source_w, source_h, 4, fill=1, stroke=0)
        c.setFillColor(HEAD_INK)
        c.setFont(SANS_BOLD, 7.3)
        c.drawCentredString(source_x + source_w / 2, center_y + 4, definition["nodes"][0]["label"])
        c.setFont(SANS, 5.8)
        c.drawCentredString(source_x + source_w / 2, center_y - 8, definition["nodes"][0]["detail"])

        for (title, detail), y in zip(cards, card_positions):
            c.setFillColor(PALE)
            c.setStrokeColor(INK)
            c.setLineWidth(0.7)
            c.roundRect(card_x, y, card_w, card_h, 3.5, fill=1, stroke=1)
            c.setStrokeColor(LINE)
            c.setLineWidth(0.5)
            c.line(card_x + title_col, y + 4, card_x + title_col, y + card_h - 4)
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 6.5)
            c.drawString(card_x + 7, y + card_h / 2 - 2.2, title)
            c.setFillColor(MID)
            c.setFont(SANS, 5.9)
            c.drawString(card_x + title_col + 7, y + card_h / 2 - 2.1, detail)
        c.restoreState()


class ChapterIllustration(Flowable):
    """A chapter-specific ImageGen engraving in the fixed opener art slot."""

    def __init__(self, number: int, width: float = CONTENT_W, height: float = 2.45 * inch):
        super().__init__()
        self.number = number
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        image_path = Path(os.environ.get("HANDBOOK_PDF_ARTWORK", ROOT / "assets/chapter-art/pdf")) / f"chapter-{self.number:02d}.png"
        if not image_path.exists():
            raise FileNotFoundError(f"Missing chapter illustration: {image_path}")
        image = ImageReader(str(image_path))
        image_w, image_h = image.getSize()
        max_w = min(self.width, 4.28 * inch)
        scale = min(max_w / image_w, self.height / image_h)
        draw_w = image_w * scale
        draw_h = image_h * scale
        c.drawImage(
            image,
            (self.width - draw_w) / 2,
            (self.height - draw_h) / 2,
            width=draw_w,
            height=draw_h,
            preserveAspectRatio=True,
            mask=None,
        )
        c.restoreState()


class StartLogicalNumbering(Flowable):
    def __init__(self):
        super().__init__()
        self.width = 0
        self.height = 0

    def wrap(self, availWidth: float, availHeight: float) -> tuple[float, float]:
        return 0, 0

    def draw(self) -> None:
        doc = getattr(self.canv, "_doctemplate", None)
        if doc is not None:
            doc.logical_page_offset = doc.page


class SetNextRunningHead(Flowable):
    def __init__(self, title: str):
        super().__init__()
        self.title = title
        self.width = 0
        self.height = 0

    def wrap(self, availWidth: float, availHeight: float) -> tuple[float, float]:
        return 0, 0

    def draw(self) -> None:
        doc = getattr(self.canv, "_doctemplate", None)
        if doc is not None:
            doc.current_chapter = self.title


class GuideDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=(PAGE_W, PAGE_H),
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title=CONFIG["title"],
            author="Michael Long",
            subject=CONFIG["subtitle"],
            creator="ReportLab",
            showBoundary=0,
        )
        self.current_chapter = CONFIG["subtitle"].upper()
        self.logical_page_offset: int | None = None

        def frame(frame_id: str) -> Frame:
            return Frame(LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id=frame_id, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)

        self.addPageTemplates([
            PageTemplate(id="Front", frames=[frame("front")], onPage=self._front),
            PageTemplate(id="Body", frames=[frame("body")], onPage=self._body),
            PageTemplate(id="Chapter", frames=[frame("chapter")], onPage=self._chapter),
        ])

    def beforeDocument(self) -> None:
        self.current_chapter = CONFIG["subtitle"].upper()
        self.logical_page_offset = None

    @staticmethod
    def _roman(number: int) -> str:
        values = [(1000, "m"), (900, "cm"), (500, "d"), (400, "cd"), (100, "c"), (90, "xc"), (50, "l"), (40, "xl"), (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")]
        result: list[str] = []
        for value, numeral in values:
            while number >= value:
                result.append(numeral)
                number -= value
        return "".join(result)

    @staticmethod
    def _metadata(canvas) -> None:
        paint_page(canvas, PAGE_W, PAGE_H)
        canvas._doc.Catalog.Lang = PDFString("en-US")
        canvas.setTitle(CONFIG["title"])
        canvas.setAuthor("Michael Long")

    @staticmethod
    def _footer(canvas, page_number: str) -> None:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, 12 * mm, PAGE_W - RIGHT, 12 * mm)
        canvas.setFont(SANS, 6.2)
        canvas.setFillColor(MID)
        canvas.drawCentredString(PAGE_W / 2, 6.8 * mm, page_number)

    def _display_page(self, physical_page: int) -> str:
        if self.logical_page_offset is None:
            return self._roman(physical_page)
        return str(physical_page - self.logical_page_offset)

    def _front(self, canvas, doc) -> None:
        canvas.saveState()
        self._metadata(canvas)
        if doc.page == 1:
            canvas.setStrokeColor(LINE)
            canvas.setLineWidth(0.4)
            canvas.line(LEFT, 21 * mm, PAGE_W - RIGHT, 21 * mm)
        else:
            self._footer(canvas, self._roman(doc.page))
        canvas.restoreState()

    def _body(self, canvas, doc) -> None:
        canvas.saveState()
        self._metadata(canvas)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, PAGE_H - 10 * mm, PAGE_W - RIGHT, PAGE_H - 10 * mm)
        canvas.setFont(SANS, 5.7)
        canvas.setFillColor(MID)
        canvas.drawString(LEFT, PAGE_H - 7.2 * mm, CONFIG["title"].upper())
        running = clean(self.current_chapter).upper()
        while pdfmetrics.stringWidth(running, SANS, 5.7) > CONTENT_W * 0.55 and len(running) > 12:
            running = running[:-4].rstrip() + "..."
        canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 7.2 * mm, running)
        self._footer(canvas, self._display_page(doc.page))
        canvas.restoreState()

    def _chapter(self, canvas, doc) -> None:
        canvas.saveState()
        self._metadata(canvas)
        if self.logical_page_offset is None:
            self.logical_page_offset = doc.page - 1
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, PAGE_H - 14 * mm, PAGE_W - RIGHT, PAGE_H - 14 * mm)
        self._footer(canvas, self._display_page(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable) -> None:
        if isinstance(flowable, Paragraph):
            title = getattr(flowable, "_toc_title", flowable.getPlainText())
            if flowable.style.name == "H1":
                self.current_chapter = title
                key = f"h1-{self.seq.nextf('h1')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(title, key, level=0, closed=False)
                self.notify("TOCEntry", (0, title, self._display_page(self.page), key))
            elif flowable.style.name == "H2":
                key = f"h2-{self.seq.nextf('h2')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(title, key, level=1, closed=True)


CHAPTER_SOURCE_NOTES = CONFIG.get("chapterSourceNotes", {})


def chapter_start(number: str, title: str, deck: str) -> list[Flowable]:
    title_para = heading(title, 1)
    title_para._toc_title = f"{number}. {title}"
    start: list[Flowable] = [StartLogicalNumbering()] if number == "1" else []
    items: list[Flowable] = start + [
        NextPageTemplate("Chapter"),
        PageBreak(),
        Spacer(1, 5 * mm),
        P(f"CHAPTER {int(number):02d}", CHAPTER_KICKER),
        title_para,
        P(deck, CHAPTER_DECK),
        Spacer(1, 3 * mm),
        ChapterIllustration(int(number)),
        Spacer(1, 2 * mm),
        NextPageTemplate("Body"),
        PageBreak(),
    ]
    return items


def _parse_table(lines: list[str], start: int) -> tuple[list[list[str]], int]:
    rows: list[list[str]] = []
    index = start
    while index < len(lines) and lines[index].strip().startswith("|"):
        cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
        if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            rows.append(cells)
        index += 1
    return rows, index


def _next_nonblank(lines: list[str], index: int) -> str:
    while index < len(lines) and not lines[index].strip():
        index += 1
    return lines[index].strip() if index < len(lines) else ""


def parse_markdown() -> list[Flowable]:
    raw = SOURCE_MD.read_text(encoding="utf-8")
    if raw.startswith("---\n"):
        end = raw.find("\n---\n", 4)
        raw = raw[end + 5:]
    lines = raw.splitlines()

    story: list[Flowable] = [
        Spacer(1, 16 * mm),
        HRFlowable(width=18 * mm, thickness=0.7, color=INK, spaceAfter=24 * mm, hAlign="LEFT"),
        P(CONFIG["coverKicker"], COVER_KICKER),
        Spacer(1, 5 * mm),
        Paragraph(CONFIG["coverTitleHtml"], COVER_TITLE),
        P(CONFIG["subtitle"], COVER_DECK),
        Spacer(1, 10 * mm),
        CoverDiagram(),
        Spacer(1, 2 * mm),
        P("Michael Long", SMALL),
        P(CONFIG["editionLabel"], SMALL),
        PageBreak(),
    ]

    index = 0
    pending_chapter: tuple[str, str, str] | None = None
    inserted_toc = False
    current_chapter: str | None = None
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped:
            index += 1
            continue

        marker = re.fullmatch(r"<!-- CHAPTER (\d+) \| (.*?) \| (.*?) -->", stripped)
        if marker:
            if current_chapter:
                story.append(P(CHAPTER_SOURCE_NOTES.get(current_chapter, ""), SMALL))
            if not inserted_toc:
                story.extend([
                    PageBreak(),
                    Spacer(1, 5 * mm),
                    P("REFERENCE MAP", CHAPTER_KICKER),
                    P("Contents", TOC_TITLE),
                    P(CONFIG["contentsDeck"], DECK),
                    TwoColumnTOC(),
                ])
                inserted_toc = True
            pending_chapter = (str(int(marker.group(1))), marker.group(2), marker.group(3))
            current_chapter = str(int(marker.group(1)))
            index += 1
            continue

        diagram_marker = re.fullmatch(r"<!-- DIAGRAM ([a-z0-9-]+) -->", stripped)
        if diagram_marker:
            diagrams = {
                "workflow-loop": WorkflowLoop,
                "surface-continuity": SurfaceContinuityDiagram,
            }
            name = diagram_marker.group(1)
            if name not in diagrams:
                raise ValueError(f"Unknown diagram marker: {name}")
            story.append(KeepTogether([Spacer(1, 5), diagrams[name](), Spacer(1, 7)]))
            index += 1
            continue

        if stripped == "<pagebreak>":
            next_line = _next_nonblank(lines, index + 1)
            if not next_line.startswith("<!-- CHAPTER"):
                if next_line.startswith("# "):
                    story.append(SetNextRunningHead(next_line[2:]))
                story.append(PageBreak())
            index += 1
            continue

        if pending_chapter and stripped.startswith("# "):
            number, title, deck = pending_chapter
            story.extend(chapter_start(number, title, deck))
            pending_chapter = None
            index += 1
            continue

        directive = re.fullmatch(r"::: (callout|prompt|worksheet) (.*)", stripped)
        if directive:
            kind = directive.group(1)
            spec = directive.group(2)
            body_lines: list[str] = []
            index += 1
            while index < len(lines) and lines[index].strip() != ":::":
                body_lines.append(lines[index])
                index += 1
            index += 1
            if kind == "callout":
                callout_kind, title = [part.strip() for part in spec.split("|", 1)]
                story.extend(callout(callout_kind, title, "\n".join(body_lines).strip()))
            elif kind == "prompt":
                tool, title = [part.strip() for part in spec.split("|", 1)]
                story.extend(prompt_block(tool, title, "\n".join(body_lines).strip()))
            else:
                fields: list[tuple[str, int]] = []
                for line in body_lines:
                    if "|" in line:
                        label, count = [part.strip() for part in line.split("|", 1)]
                        fields.append((label, int(count)))
                story.append(worksheet(spec.strip(), fields))
                story.append(Spacer(1, 4))
            continue

        if stripped.startswith("```"):
            index += 1
            code_lines: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code_lines.append(lines[index])
                index += 1
            index += 1
            story.append(code_block("\n".join(code_lines)))
            continue

        if stripped.startswith("|") and index + 1 < len(lines) and re.match(r"^\|?\s*:?-{3,}", lines[index + 1].strip()):
            rows, index = _parse_table(lines, index)
            story.append(data_table(rows))
            story.append(Spacer(1, 5))
            continue

        if stripped.startswith("- [ ] "):
            items: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("- [ ] "):
                items.append(lines[index].strip()[6:])
                index += 1
            story.append(checklist(items))
            continue

        if stripped.startswith("- "):
            items = []
            while index < len(lines) and lines[index].strip().startswith("- ") and not lines[index].strip().startswith("- [ ] "):
                items.append(lines[index].strip()[2:])
                index += 1
            story.append(bullet_list(items))
            continue

        if re.match(r"^\d+\. ", stripped):
            start_number = int(re.match(r"^(\d+)\. ", stripped).group(1))
            items = []
            while index < len(lines) and re.match(r"^\d+\. ", lines[index].strip()):
                items.append(re.sub(r"^\d+\. ", "", lines[index].strip()))
                index += 1
            story.append(numbered_steps(items, start=start_number))
            continue

        if stripped.startswith("### "):
            story.append(heading(stripped[4:], 3))
            index += 1
            continue
        if stripped.startswith("## "):
            story.append(heading(stripped[3:], 2))
            index += 1
            continue
        if stripped.startswith("# "):
            if current_chapter:
                story.append(P(CHAPTER_SOURCE_NOTES.get(current_chapter, ""), SMALL))
                current_chapter = None
            story.append(heading(stripped[2:], 1))
            index += 1
            continue

        paragraph_lines = [stripped]
        index += 1
        while index < len(lines):
            candidate = lines[index].strip()
            if not candidate:
                break
            if (
                candidate.startswith(("#", "- ", "```", "::: ", "<pagebreak>", "<!-- CHAPTER", "|"))
                or candidate.startswith("<!-- DIAGRAM")
                or re.match(r"^\d+\. ", candidate)
            ):
                break
            paragraph_lines.append(candidate)
            index += 1
        story.append(P(" ".join(paragraph_lines)))

    if current_chapter:
        story.append(P(CHAPTER_SOURCE_NOTES.get(current_chapter, ""), SMALL))
    return story



def build_pdf():
    raise RuntimeError('Use build-pdf-variants.mjs with explicit isolated output.')
