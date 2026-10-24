"""Shared A5 layout runtime. Import in a fresh process with explicit book configuration."""


from pathlib import Path
import os
import sys
from diagram_data import load_diagram
from typing import Iterable, Sequence
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A5, LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    NextPageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfdoc import PDFString
from reportlab.pdfbase.ttfonts import TTFont


import json
from pdf_theme import theme_tokens, theme_color
CONFIG = json.loads(os.environ.get('HANDBOOK_PDF_CONFIG', '{}'))
ROOT = Path(os.environ.get('HANDBOOK_BOOK_ROOT', Path(__file__).resolve().parent.parent))
REVIEW_RUN = ROOT
FONT_DIR = Path(__file__).resolve().parents[1]/'assets/design-system/fonts' if CONFIG.get('fonts','toolkit')=='toolkit' else ROOT / CONFIG['fonts']
THEME = os.environ.get('HANDBOOK_PDF_THEME', 'light')
TOKENS = theme_tokens(THEME)
OUTPUT_PDF = Path(os.environ.get('HANDBOOK_PDF_OUTPUT', ROOT / 'candidate.pdf'))
OUTPUT_DIR = OUTPUT_PDF.parent

PAGE_W, PAGE_H = CONFIG.get('pageSizePoints', A5)
LEFT = 13 * mm
RIGHT = 13 * mm
TOP = 15 * mm
BOTTOM = 18 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT
DESIGN_CONTENT_W = LETTER[0] - 2 * 0.72 * inch

NAVY = theme_color("#000000")
INK = theme_color("#000000")
TEAL = theme_color("#31312F")
TEAL_DARK = theme_color("#000000")
CORAL = theme_color("#4D4B47")
AMBER = theme_color("#44423E")
GREEN = theme_color("#262624")
PALE_TEAL = theme_color("#F5F5F3")
PALE_BLUE = theme_color("#F2F2F0")
PALE_CORAL = theme_color("#F7F6F3")
PALE_AMBER = theme_color("#F3F2EE")
PALE_GREEN = theme_color("#F4F4F1")
PALE_GRAY = theme_color("#F2F2F2")
MID_GRAY = theme_color("#333333")
LINE_GRAY = theme_color("#BBBBBB")
WHITE = HexColor(TOKENS['paper'])


def register_family(prefix, filenames):
    names = (prefix, prefix+'-Bold', prefix+'-Italic', prefix+'-BoldItalic')
    for name, filename in zip(names, filenames):
        path = FONT_DIR / filename
        if not path.is_file(): raise FileNotFoundError(path)
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily(prefix, normal=names[0], bold=names[1], italic=names[2], boldItalic=names[3])
    return names

def _register_sans_fonts():
    return register_family('GuideSans', ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','NotoSans-Regular.ttf','NotoSans-Bold.ttf'])

def _register_serif_fonts():
    pdfmetrics.registerFont(TTFont('GuideSerif-Medium', str(FONT_DIR / 'SourceSerif4-Medium.ttf')))
    return register_family('GuideSerif', ['SourceSerif4-Regular.ttf','SourceSerif4-Bold.ttf','SourceSerif4-RegularItalic.ttf','SourceSerif4-BoldItalic.ttf'])

SANS, SANS_BOLD, SANS_ITALIC, SANS_BOLD_ITALIC = _register_sans_fonts()
SERIF, SERIF_BOLD, SERIF_ITALIC, SERIF_BOLD_ITALIC = _register_serif_fonts()

# Preserve the original names for narrative flowables while making the
# handbook's serif/sans split explicit in the styles below.
FONT, FONT_BOLD, FONT_ITALIC, FONT_BOLD_ITALIC = (
    SERIF,
    SERIF_BOLD,
    SERIF_ITALIC,
    SERIF_BOLD_ITALIC,
)


def clean(text: str) -> str:
    """Keep typography portable and comply with the PDF ASCII-hyphen rule."""
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
        "\u00a0": " ",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


styles = getSampleStyleSheet()
BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName=FONT,
    fontSize=10,
    leading=15,
    textColor=INK,
    spaceAfter=9,
    allowWidows=0,
    allowOrphans=0,
)
BODY_TIGHT = ParagraphStyle(
    "BodyTight",
    parent=BODY,
    fontSize=9.1,
    leading=12.5,
    spaceAfter=4,
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontName=SANS,
    fontSize=7.3,
    leading=9.7,
    textColor=MID_GRAY,
    spaceAfter=3,
)
CAPTION = ParagraphStyle(
    "Caption",
    parent=SMALL,
    fontName=SERIF_ITALIC,
    fontSize=7.5,
    leading=9.8,
    textColor=MID_GRAY,
    alignment=TA_LEFT,
)
H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName=SERIF,
    fontSize=28,
    leading=27.44,
    textColor=INK,
    spaceBefore=0,
    spaceAfter=8,
    keepWithNext=1,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName="GuideSerif-Medium",
    fontSize=18,
    leading=20.16,
    textColor=INK,
    spaceBefore=9 * mm,
    spaceAfter=4 * mm,
    keepWithNext=1,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName=SANS_BOLD,
    fontSize=9.4,
    leading=12,
    textColor=INK,
    spaceBefore=9,
    spaceAfter=4,
    keepWithNext=1,
)
DECK = ParagraphStyle(
    "Deck",
    parent=BODY,
    fontName=SERIF_ITALIC,
    fontSize=11.3,
    leading=16.2,
    textColor=MID_GRAY,
    spaceAfter=13,
)
QUOTE = ParagraphStyle(
    "Quote",
    parent=BODY,
    fontName=FONT_ITALIC,
    fontSize=10.8,
    leading=15.4,
    leftIndent=13,
    rightIndent=8,
    borderWidth=0,
    borderPadding=(0, 0, 0, 9),
    borderColor=INK,
    textColor=INK,
)
TABLE_TEXT = ParagraphStyle(
    "TableText",
    parent=BODY,
    fontName=SANS,
    fontSize=7.2,
    leading=9.36,
    spaceAfter=0,
)
TABLE_TEXT_SMALL = ParagraphStyle(
    "TableTextSmall",
    parent=TABLE_TEXT,
    fontSize=7.2,
    leading=9.36,
)
TABLE_HEAD = ParagraphStyle(
    "TableHead",
    parent=TABLE_TEXT,
    fontName=SANS_BOLD,
    fontSize=6.5,
    leading=8.45,
    textColor=INK,
    alignment=TA_LEFT,
    splitLongWords=0,
)
CALLOUT_TITLE = ParagraphStyle(
    "CalloutTitle",
    parent=BODY,
    fontName=SANS_BOLD,
    fontSize=7.4,
    leading=9.4,
    tracking=0.5,
    spaceAfter=3,
)
CALLOUT_BODY = ParagraphStyle(
    "CalloutBody",
    parent=BODY,
    fontSize=9.1,
    leading=13.1,
    spaceAfter=0,
)
WORKSHEET_LABEL = ParagraphStyle(
    "WorksheetLabel",
    parent=BODY,
    fontName=SANS_BOLD,
    fontSize=7.5,
    leading=9.6,
    textColor=INK,
    spaceAfter=0,
)
TOC_TITLE = ParagraphStyle(
    "TOCTitle",
    parent=H1,
    fontSize=26,
    leading=29,
    keepWithNext=0,
)
COVER_KICKER = ParagraphStyle(
    "CoverKicker",
    parent=SMALL,
    fontName=SANS_BOLD,
    fontSize=7.2,
    leading=9.4,
    textColor=INK,
    tracking=1.2,
    spaceAfter=10,
)
COVER_TITLE = ParagraphStyle(
    "CoverTitle",
    parent=H1,
    fontName=SERIF,
    fontSize=42,
    leading=37.8,
    textColor=INK,
    spaceAfter=14,
)
COVER_DECK = ParagraphStyle(
    "CoverDeck",
    parent=DECK,
    fontName=SERIF_ITALIC,
    fontSize=13,
    leading=17.55,
    textColor=INK,
    spaceAfter=15,
)
SECTION_LABEL = ParagraphStyle(
    "SectionLabel",
    parent=SMALL,
    fontName=SANS_BOLD,
    fontSize=7.2,
    leading=9.3,
    textColor=INK,
    spaceBefore=5,
    spaceAfter=4,
)

CHAPTER_KICKER = ParagraphStyle(
    "ChapterKicker",
    parent=SMALL,
    fontName=SANS_BOLD,
    fontSize=7.2,
    leading=9,
    tracking=1.5,
    textColor=INK,
    spaceAfter=10,
)
CHAPTER_DECK = ParagraphStyle(
    "ChapterDeck",
    parent=DECK,
    fontName=SERIF_ITALIC,
    fontSize=11.5,
    leading=16.675,
    textColor=theme_color("#3D3B38"),
    spaceBefore=7,
    spaceAfter=13,
)
TOC_KICKER = ParagraphStyle(
    "TOCKicker",
    parent=CHAPTER_KICKER,
    spaceBefore=0,
    spaceAfter=6,
)
COVER_CREDIT = ParagraphStyle(
    "CoverCredit",
    parent=SMALL,
    fontName=SANS,
    fontSize=7.7,
    leading=10,
    textColor=INK,
    spaceAfter=0,
)


class TwoColumnTOC(TableOfContents):
    """A compact, two-column contents page matching the reference handbook."""

    def _entry(self, entry: tuple[int, str, int, str | None], width: float) -> Table:
        _level, text, page_num, key = entry
        href_open = f'<a href="#{key}">' if key else ""
        href_close = "</a>" if key else ""
        title_style = ParagraphStyle(
            "TOCEntryTitle",
            parent=BODY_TIGHT,
            fontName=SERIF,
            fontSize=7.5,
            leading=9.4,
            textColor=INK,
            spaceAfter=0,
        )
        page_style = ParagraphStyle(
            "TOCEntryPage",
            parent=SMALL,
            fontName=SANS,
            fontSize=6.8,
            leading=9.4,
            alignment=TA_RIGHT,
            textColor=MID_GRAY,
            spaceAfter=0,
        )
        title = Paragraph(f"{href_open}{clean(text)}{href_close}", title_style)
        page = Paragraph(f"{href_open}{page_num}{href_close}", page_style)
        table = Table([[title, page]], colWidths=[width - 21, 21], hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LINEBELOW", (0, 0), (-1, -1), 0.35, LINE_GRAY),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        return table

    def wrap(self, availWidth: float, availHeight: float) -> tuple[float, float]:
        entries = self._lastEntries or [(0, "Contents will populate on the next pass", 0, None)]
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
        self._table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        self.width, self.height = self._table.wrapOn(self.canv, availWidth, availHeight)
        return self.width, self.height


INDEX_REFERENCE = ParagraphStyle('IndexReference', parent=BODY)


def P(text: str, style: ParagraphStyle = BODY, *, role=None) -> Flowable:
    from eyebrow_roles import suppress_eyebrow, OmittedEyebrow
    if suppress_eyebrow(style, role):
        return OmittedEyebrow()
    from heading_wrap import paragraph_class
    paragraph = paragraph_class(style)(clean(text), style)
    paragraph._handbook_role = role
    return paragraph


def heading(text: str, level: int = 2) -> Paragraph:
    return P(text, {1: H1, 2: H2, 3: H3}[level])


def bullet_list(items: Iterable[str], *, compact: bool = False) -> Table:
    body_style = TABLE_TEXT if compact else BODY_TIGHT
    rows = [[P("-", ParagraphStyle("BulletMark", parent=body_style, textColor=INK, fontName=SANS_BOLD)), P(item, body_style)] for item in items]
    table = Table(rows, colWidths=[0.15 * inch, CONTENT_W - 0.15 * inch], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def numbered_steps(items: Sequence[str]) -> Table:
    rows = []
    for index, item in enumerate(items, start=1):
        number = Table(
            [[P(str(index), ParagraphStyle("StepNumber", parent=TABLE_TEXT, fontName=SANS_BOLD, textColor=INK, alignment=TA_CENTER))]],
            colWidths=[0.24 * inch],
            rowHeights=[0.24 * inch],
        )
        number.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                    ("BOX", (0, 0), (-1, -1), 0.65, INK),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        rows.append([number, P(item, BODY_TIGHT)])
    table = Table(rows, colWidths=[0.36 * inch, CONTENT_W - 0.36 * inch])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


CALLOUTS = {
    "Decision": (WHITE, INK),
    "Caution": (WHITE, INK),
    "Try it": (WHITE, INK),
    "Answer": (WHITE, INK),
    "Claim": (WHITE, INK),
    "Novice note": (WHITE, INK),
}


def callout(kind: str, title: str, body: str) -> Table:
    background, accent = CALLOUTS[kind]
    title_style = ParagraphStyle(f"CalloutTitle-{kind}", parent=CALLOUT_TITLE, textColor=accent)
    title_para = P(f"{escape(kind.upper())}: {escape(clean(title))}", title_style)
    body_para = P(body, CALLOUT_BODY)
    table = Table([[[title_para, body_para]]], colWidths=[CONTENT_W - 8])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("LINEBEFORE", (0, 0), (0, -1), 1.1, accent),
                ("LINEABOVE", (0, 0), (-1, 0), 0.35, LINE_GRAY),
                ("LINEBELOW", (0, 0), (-1, -1), 0.35, LINE_GRAY),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def data_table(
    rows: Sequence[Sequence[str]],
    widths: Sequence[float],
    *,
    small: bool = False,
    header_background=TEAL_DARK,
    repeat_rows: int = 1,
) -> Table:
    body_style = TABLE_TEXT_SMALL if small else TABLE_TEXT
    normalized_widths = list(widths)
    if len(normalized_widths) > 1 and (
        abs(sum(normalized_widths) - CONTENT_W) < 1 or normalized_widths[-1] <= 0
    ):
        intended_last = DESIGN_CONTENT_W - sum(normalized_widths[:-1])
        if intended_last > 0:
            normalized_widths[-1] = intended_last
    if any(width <= 0 for width in normalized_widths):
        for index, width in enumerate(normalized_widths):
            if width <= 0:
                normalized_widths[index] = max(
                    0.55 * inch,
                    DESIGN_CONTENT_W - sum(normalized_widths[:index]) - sum(max(item, 0) for item in normalized_widths[index + 1 :]),
                )
    width_total = sum(normalized_widths)
    normalized_widths = [width * CONTENT_W / width_total for width in normalized_widths]
    if list(rows[0]) == ["Path", "Time", "What to do", "Outcome"]:
        normalized_widths = [22 * mm, 22 * mm, 46 * mm, 32 * mm]
    rendered = []
    for row_index, row in enumerate(rows):
        style = TABLE_HEAD if row_index < repeat_rows else body_style
        rendered.append([P(str(cell).upper() if row_index < repeat_rows else str(cell), style) for cell in row])
    table = Table(rendered, colWidths=normalized_widths, repeatRows=repeat_rows, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, repeat_rows - 1), PALE_GRAY),
                ("LINEABOVE", (0, 0), (-1, 0), 0.8, INK),
                ("LINEBELOW", (0, repeat_rows - 1), (-1, repeat_rows - 1), 0.5, LINE_GRAY),
                ("LINEBELOW", (0, repeat_rows), (-1, -1), 0.35, LINE_GRAY),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def checklist(items: Sequence[str], *, compact: bool = False) -> Table:
    body_style = (
        ParagraphStyle(
            "ChecklistCompact",
            parent=BODY_TIGHT,
            fontName=SERIF,
            fontSize=8.0,
            leading=10.4,
            spaceAfter=0,
        )
        if compact
        else BODY_TIGHT
    )
    rows = [[P("[ ]", ParagraphStyle("Checkbox", parent=TABLE_TEXT, fontName=SANS_BOLD, textColor=INK)), P(item, body_style)] for item in items]
    table = Table(rows, colWidths=[0.30 * inch, CONTENT_W - 0.30 * inch])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2 if compact else 3),
            ]
        )
    )
    return table


def worksheet(title: str, fields: Sequence[tuple[str, int]]) -> list[Flowable]:
    title_cell = P(
        title,
        ParagraphStyle(
            "WorksheetTitle",
            parent=H3,
            fontName=SANS_BOLD,
            fontSize=8.3,
            leading=10.2,
            textColor=INK,
            tracking=0.6,
            spaceAfter=0,
        ),
    )
    form_rows: list[list[Flowable]] = [[title_cell]]
    for label, line_count in fields:
        field_rows = [[P(label, WORKSHEET_LABEL)]] + [[""] for _ in range(line_count)]
        heights = [0.28 * inch] + [0.24 * inch for _ in range(line_count)]
        field_table = Table(field_rows, colWidths=[CONTENT_W], rowHeights=heights, splitByRow=0)
        field_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.4, LINE_GRAY),
                    ("LINEBELOW", (0, 1), (-1, -2), 0.35, LINE_GRAY),
                    ("BACKGROUND", (0, 0), (-1, 0), WHITE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ]
            )
        )
        form_rows.append([field_table])

    form = Table(
        form_rows,
        colWidths=[CONTENT_W],
        repeatRows=1,
        hAlign="LEFT",
        splitByRow=1,
        splitInRow=0,
    )
    form.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PALE_GRAY),
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
            ]
        )
    )
    return [form]



from pdf_theme import paint_page
class CoverArt(Flowable):
    def __init__(self, width: float = CONTENT_W, height: float = 1.42 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        c.setFillColor(NAVY)
        c.roundRect(0, 0, self.width, self.height, 12, fill=1, stroke=0)
        labels = ["Goal", "Risks", "Data", "Graders", "Evidence", "Decision"]
        node_w = (self.width - 58) / len(labels)
        x = 14
        center_y = self.height / 2
        for index, label in enumerate(labels):
            c.setFillColor(WHITE if index % 2 == 0 else PALE_TEAL)
            c.roundRect(x, center_y - 16, node_w - 8, 32, 6, fill=1, stroke=0)
            c.setFillColor(NAVY)
            c.setFont(SANS_BOLD, 8.1)
            c.drawCentredString(x + (node_w - 8) / 2, center_y - 3, label)
            if index < len(labels) - 1:
                start = x + node_w - 6
                c.setStrokeColor(WHITE)
                c.setLineWidth(1.4)
                c.line(start, center_y, start + 9, center_y)
                c.setFillColor(WHITE)
                c.drawPath(_arrow_path(c, start + 9, center_y), fill=1, stroke=0)
            x += node_w
        c.setStrokeColor(TEAL)
        c.setLineWidth(4)
        c.line(12, 12, self.width - 12, 12)
        c.restoreState()


def _arrow_path(canvas, x: float, y: float):
    path = canvas.beginPath()
    path.moveTo(x, y)
    path.lineTo(x - 5, y + 3.5)
    path.lineTo(x - 5, y - 3.5)
    path.close()
    return path


class EvidenceLoop(Flowable):
    def __init__(self, width: float = CONTENT_W, height: float = 1.65 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        x_gap = 15
        node_w = (self.width - 2 * x_gap) / 3
        node_h = 32
        top_y = 74
        bottom_y = 24
        number_rail = 21

        # A clockwise 2 x 3 grid keeps every peer stage the same size and
        # reserves the gutters for centered, orthogonal connectors.
        positions = {
            1: (0, top_y),
            2: (node_w + x_gap, top_y),
            3: (2 * (node_w + x_gap), top_y),
            4: (2 * (node_w + x_gap), bottom_y),
            5: (node_w + x_gap, bottom_y),
            6: (0, bottom_y),
        }
        definition = load_diagram(ROOT, "EvidenceLoop", kind="sequence", count=6, feedback=True)
        labels = {index + 1: node["label"] for index, node in enumerate(definition["nodes"])}


        def arrowhead(x: float, y: float, direction: str, color=MID_GRAY) -> None:
            size = 4.2
            half = 2.8
            path = c.beginPath()
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
            else:  # up
                path.lineTo(x - half, y - size)
                path.lineTo(x + half, y - size)
            path.close()
            c.setFillColor(color)
            c.drawPath(path, fill=1, stroke=0)

        def connector(
            x1: float,
            y1: float,
            x2: float,
            y2: float,
            direction: str,
            color=MID_GRAY,
            line_width: float = 1.1,
        ) -> None:
            c.setStrokeColor(color)
            c.setLineWidth(line_width)
            c.line(x1, y1, x2, y2)
            arrowhead(x2, y2, direction, color)

        top_mid = top_y + node_h / 2
        bottom_mid = bottom_y + node_h / 2
        for left_stage, right_stage in ((1, 2), (2, 3)):
            left_x, _ = positions[left_stage]
            right_x, _ = positions[right_stage]
            connector(left_x + node_w + 3, top_mid, right_x - 3, top_mid, "right")
        for right_stage, left_stage in ((4, 5), (5, 6)):
            right_x, _ = positions[right_stage]
            left_x, _ = positions[left_stage]
            connector(right_x - 3, bottom_mid, left_x + node_w + 3, bottom_mid, "left")

        right_center = positions[3][0] + node_w / 2
        connector(right_center, top_y - 3, right_center, bottom_y + node_h + 3, "down")
        left_center = node_w / 2
        connector(
            left_center,
            bottom_y + node_h + 3,
            left_center,
            top_y - 3,
            "up",
            CORAL,
            1.35,
        )

        for stage in range(1, 7):
            x, y = positions[stage]
            c.setFillColor(PALE_TEAL)
            c.setStrokeColor(TEAL)
            c.setLineWidth(0.9)
            c.roundRect(x, y, node_w, node_h, 4, fill=1, stroke=1)
            c.setStrokeColor(LINE_GRAY)
            c.setLineWidth(0.65)
            c.line(x + number_rail, y + 5, x + number_rail, y + node_h - 5)
            c.setFillColor(TEAL_DARK)
            c.setFont(SANS_BOLD, 6.8)
            c.drawCentredString(x + number_rail / 2, y + node_h / 2 - 2.4, str(stage))
            c.setFont(SANS_BOLD, 7.2)
            c.drawCentredString(
                x + number_rail + (node_w - number_rail) / 2,
                y + node_h / 2 - 2.6,
                labels[stage],
            )

        c.setFont(SERIF_ITALIC, 6.8)
        c.setFillColor(CORAL)
        c.drawCentredString(self.width / 2, 6, definition["note"])
        c.restoreState()


class DataSplitDiagram(Flowable):
    def __init__(self, width: float = CONTENT_W, height: float = 2.0 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        center_y = self.height / 2
        source_x = 4
        source_w = 0.27 * self.width
        source_h = 48
        spine_x = 0.345 * self.width
        card_x = 0.41 * self.width
        card_w = self.width - card_x - 2
        card_h = 26
        card_gap = 8
        title_col = 78
        definition = load_diagram(ROOT, "DataSplitDiagram", kind="branch", count=5, feedback=False)
        boxes = [(node["label"], node["detail"]) for node in definition["nodes"][1:]]


        total_cards_h = len(boxes) * card_h + (len(boxes) - 1) * card_gap
        bottom_y = (self.height - total_cards_h) / 2
        card_positions = [
            self.height - bottom_y - card_h - index * (card_h + card_gap)
            for index in range(len(boxes))
        ]
        card_centers = [y + card_h / 2 for y in card_positions]

        # One orthogonal distribution spine gives every peer branch the same
        # geometry and keeps connectors out of the text-bearing cards.
        c.setStrokeColor(MID_GRAY)
        c.setLineWidth(0.85)
        c.line(source_x + source_w, center_y, spine_x, center_y)
        c.line(spine_x, card_centers[-1], spine_x, card_centers[0])
        for card_center in card_centers:
            arrow_tip = card_x - 3
            c.line(spine_x, card_center, arrow_tip, card_center)
            arrow = c.beginPath()
            arrow.moveTo(arrow_tip, card_center)
            arrow.lineTo(arrow_tip - 4.2, card_center + 2.8)
            arrow.lineTo(arrow_tip - 4.2, card_center - 2.8)
            arrow.close()
            c.setFillColor(MID_GRAY)
            c.drawPath(arrow, fill=1, stroke=0)

        c.setFillColor(NAVY)
        c.roundRect(source_x, center_y - source_h / 2, source_w, source_h, 4, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont(SANS_BOLD, 7.7)
        c.drawCentredString(source_x + source_w / 2, center_y + 5, definition["nodes"][0]["label"])
        c.setFont(SANS, 6.1)
        c.drawCentredString(source_x + source_w / 2, center_y - 8, definition["nodes"][0]["detail"])

        for (title, desc), y in zip(boxes, card_positions):
            c.setFillColor(PALE_TEAL)
            c.setStrokeColor(TEAL)
            c.setLineWidth(0.8)
            c.roundRect(card_x, y, card_w, card_h, 4, fill=1, stroke=1)
            c.setStrokeColor(LINE_GRAY)
            c.setLineWidth(0.55)
            c.line(card_x + title_col, y + 5, card_x + title_col, y + card_h - 5)
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 7.1)
            c.drawString(card_x + 7, y + card_h / 2 - 2.5, title)
            c.setFillColor(MID_GRAY)
            c.setFont(SANS, 6.2)
            c.drawString(card_x + title_col + 8, y + card_h / 2 - 2.3, desc)
        c.restoreState()


class ChapterIllustration(Flowable):
    """A chapter-specific pointillist plate in the handbook's fixed art slot."""

    def __init__(self, number: int, width: float = CONTENT_W, height: float = 2.45 * inch):
        super().__init__()
        self.number = number
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        image_path = Path(os.environ.get('HANDBOOK_PDF_ARTWORK', ROOT / 'assets/chapter-art/pdf')) / f'chapter-{self.number:02d}.png'
        if not image_path.exists():
            raise FileNotFoundError(f"Missing chapter illustration: {image_path}")
        image = ImageReader(str(image_path))
        image_w, image_h = image.getSize()
        max_w = min(self.width, 104 * mm)
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
    """Restart displayed folios at one on the first chapter opener."""

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
    """Set the body running head before a forced page break."""

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
    def multiBuild(self, story, *args, **kwargs):
        from term_index import bind_index_targets
        bind_index_targets(story)
        from heading_wrap import prepare_pdf_story
        prepare_pdf_story(story)
        return super().multiBuild(story, *args, **kwargs)

    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=(PAGE_W,PAGE_H),
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title=CONFIG.get('title', 'Handbook'),
            author="Michael Long",
            subject="A practical evaluation guide for product teams",
            creator="ReportLab",
            showBoundary=0,
        )
        self.current_chapter = CONFIG.get('runningDeck', '')
        self.logical_page_offset: int | None = None

        def page_frame(frame_id: str) -> Frame:
            return Frame(
                LEFT,
                BOTTOM,
                CONTENT_W,
                PAGE_H - TOP - BOTTOM,
                id=frame_id,
                leftPadding=0,
                rightPadding=0,
                topPadding=0,
                bottomPadding=0,
            )

        self.addPageTemplates(
            [
                PageTemplate(id="Front", frames=[page_frame("front")], onPage=self._on_front_page),
                PageTemplate(id="Body", frames=[page_frame("body")], onPage=self._on_body_page),
                PageTemplate(id="Chapter", frames=[page_frame("chapter")], onPage=self._on_chapter_page),
            ]
        )

    def beforeDocument(self) -> None:
        self.current_chapter = CONFIG.get('runningDeck', '')
        self.logical_page_offset = None

    @staticmethod
    def _roman(number: int) -> str:
        values = [
            (1000, "m"), (900, "cm"), (500, "d"), (400, "cd"),
            (100, "c"), (90, "xc"), (50, "l"), (40, "xl"),
            (10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i"),
        ]
        result = []
        remainder = number
        for value, numeral in values:
            while remainder >= value:
                result.append(numeral)
                remainder -= value
        return "".join(result)

    @staticmethod
    def _set_metadata(canvas) -> None:
        canvas._doc.Catalog.Lang = PDFString("en-US")
        canvas.setTitle(CONFIG.get('title', 'Handbook'))
        canvas.setAuthor("Michael Long")

    @staticmethod
    def _footer(canvas, page_number: str) -> None:
        canvas.setStrokeColor(LINE_GRAY)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, 12 * mm, PAGE_W - RIGHT, 12 * mm)
        canvas.setFont(SANS, 6.2)
        canvas.setFillColor(MID_GRAY)
        canvas.drawCentredString(PAGE_W / 2, 6.8 * mm, page_number)

    def _display_page(self, physical_page: int) -> str:
        if self.logical_page_offset is None:
            return self._roman(physical_page)
        return str(physical_page - self.logical_page_offset)

    def _on_front_page(self, canvas, doc) -> None:
        canvas.saveState()
        paint_page(canvas, PAGE_W, PAGE_H)
        self._set_metadata(canvas)
        if doc.page == 1:
            canvas.setStrokeColor(LINE_GRAY)
            canvas.setLineWidth(0.4)
            canvas.line(LEFT, 21 * mm, PAGE_W - RIGHT, 21 * mm)
        else:
            self._footer(canvas, self._roman(doc.page))
        canvas.restoreState()

    def _on_body_page(self, canvas, doc) -> None:
        canvas.saveState()
        paint_page(canvas, PAGE_W, PAGE_H)
        self._set_metadata(canvas)
        canvas.setStrokeColor(LINE_GRAY)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, PAGE_H - 10 * mm, PAGE_W - RIGHT, PAGE_H - 10 * mm)
        canvas.setFont(SANS, 5.7)
        canvas.setFillColor(MID_GRAY)
        canvas.drawString(LEFT, PAGE_H - 7.2 * mm, CONFIG.get('title', 'Handbook').upper())
        running = clean(self.current_chapter).upper()
        while stringWidth(running, SANS, 5.7) > CONTENT_W * 0.54 and len(running) > 12:
            running = running[:-4].rstrip() + "..."
        canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 7.2 * mm, running)
        self._footer(canvas, self._display_page(doc.page))
        canvas.restoreState()

    def _on_chapter_page(self, canvas, doc) -> None:
        canvas.saveState()
        paint_page(canvas, PAGE_W, PAGE_H)
        self._set_metadata(canvas)
        canvas.setStrokeColor(LINE_GRAY)
        canvas.setLineWidth(0.4)
        canvas.line(LEFT, PAGE_H - 14 * mm, PAGE_W - RIGHT, PAGE_H - 14 * mm)
        self._footer(canvas, self._display_page(doc.page))
        canvas.restoreState()

    def afterFlowable(self, flowable) -> None:
        if isinstance(flowable, Paragraph):
            if getattr(flowable, '_index_section_key', None):
                anchor = flowable._index_section_anchor
                self.canv.bookmarkPage(anchor)
                self.notify('TermIndexSection', (flowable._index_section_key, flowable._index_section_title, self._display_page(self.page), anchor))
            text = getattr(flowable, "_toc_title", flowable.getPlainText())
            if flowable.style.name == "H1":
                self.current_chapter = text
                key = f"h1-{self.seq.nextf('h1')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=0, closed=False)
                self.notify("TOCEntry", (0, text, self._display_page(self.page), key))
            elif flowable.style.name == "H2":
                key = f"h2-{self.seq.nextf('h2')}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(text, key, level=1, closed=True)


def module_start(number: str, title: str, deck: str) -> list[Flowable]:
    chapter_title = P(title, H1)
    chapter_title._toc_title = f"{number}. {title}"
    start: list[Flowable] = [StartLogicalNumbering()] if number == "1" else []
    return start + [
        NextPageTemplate("Chapter"),
        PageBreak(),
        Spacer(1, 5 * mm),
        P(f"CHAPTER {int(number):02d}", CHAPTER_KICKER, role='chapter-marker'),
        chapter_title,
        P(deck, CHAPTER_DECK),
        Spacer(1, 3 * mm),
        ChapterIllustration(int(number)),
        NextPageTemplate("Body"),
        PageBreak(),
    ]



class OpticallyFitChapterIllustration(Flowable):
    """Scale each chapter plate from its visible ink instead of its white canvas."""

    def __init__(self, number: int, width: float = CONTENT_W, height: float = 4.0 * inch):
        super().__init__()
        self.number = number
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        image_path = Path(os.environ.get('HANDBOOK_PDF_ARTWORK', ROOT / 'assets/chapter-art/pdf')) / f'chapter-{self.number:02d}.png'
        if not image_path.exists():
            raise FileNotFoundError(f"Missing chapter illustration: {image_path}")

        image = ImageReader(str(image_path))
        image_w, image_h = image.getSize()
        scale = min((self.width - 6 * mm) / image_w, self.height / image_h)
        draw_w, draw_h = image_w * scale, image_h * scale
        c.drawImage(image, (self.width - draw_w) / 2, (self.height - draw_h) / 2,
                    width=draw_w, height=draw_h, preserveAspectRatio=True, mask=None)
        c.restoreState()


class ConsultingLifecycle(Flowable):
    """Seven-stage engagement loop in the field-guide visual language."""

    def __init__(self, width: float = CONTENT_W, height: float = 1.72 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        definition = load_diagram(ROOT, "ConsultingLifecycle", kind="sequence", count=7, feedback=True)
        labels = [node["label"] for node in definition["nodes"]]
        track_w = self.width / len(labels)
        gutter = 8
        box_w = track_w - gutter
        box_h = 32
        y = self.height / 2 - box_h / 2 + 5
        for index, label in enumerate(labels):
            x = index * track_w + gutter / 2
            c.setStrokeColor(INK)
            c.setLineWidth(0.65)
            c.roundRect(x, y, box_w, box_h, 3, fill=0, stroke=1)
            c.setFillColor(MID_GRAY)
            c.setFont(SANS, 5.6)
            c.drawString(x + 4, y + box_h - 8, str(index + 1))
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 6.1)
            c.drawCentredString(x + box_w / 2, y + 11, label)
            if index < len(labels) - 1:
                next_x = (index + 1) * track_w + gutter / 2
                line_start = x + box_w + 1.5
                arrow_tip = next_x - 1.5
                ay = y + box_h / 2
                c.line(line_start, ay, arrow_tip, ay)
                c.line(arrow_tip - 2.5, ay + 2, arrow_tip, ay)
                c.line(arrow_tip - 2.5, ay - 2, arrow_tip, ay)
        c.setFillColor(MID_GRAY)
        c.setFont(SERIF_ITALIC, 7.1)
        c.drawCentredString(
            self.width / 2,
            12,
            definition["note"],
        )
        c.restoreState()


class ExposureLadder(Flowable):
    """A simple diagram showing how evidence earns wider exposure."""

    def __init__(self, width: float = CONTENT_W, height: float = 1.8 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self) -> None:
        c = self.canv
        c.saveState()
        definition = load_diagram(ROOT, "ExposureLadder", kind="sequence", count=5, feedback=False)
        labels = [(node["label"], node["detail"]) for node in definition["nodes"]]

        step_w = self.width / len(labels)
        for index, (title, verb) in enumerate(labels):
            x = index * step_w
            y = 10 + index * 13
            h = 35
            c.setStrokeColor(INK)
            c.setFillColor(WHITE if index % 2 == 0 else PALE_GRAY)
            c.rect(x + 2, y, step_w - 4, h, fill=1, stroke=1)
            c.setFillColor(INK)
            c.setFont(SANS_BOLD, 6.5)
            c.drawCentredString(x + step_w / 2, y + 21, title)
            c.setFont(SANS, 5.8)
            c.setFillColor(MID_GRAY)
            c.drawCentredString(x + step_w / 2, y + 10, verb)
        c.setFont(SERIF_ITALIC, 7.1)
        c.setFillColor(MID_GRAY)
        c.drawString(2, self.height - 8, definition["note"])
        c.restoreState()
