#!/usr/bin/env python3
"""Add book metadata, running heads, and page numbers to the browser PDF."""

from __future__ import annotations

import argparse
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.constants import PageLabelStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.colors import HexColor


import json
from pdf_theme import theme_tokens
CONFIG = {}
BOOK_TITLE = ''
AUTHOR = ''
SUBTITLE = ''
CHAPTERS = []
THEME = 'light'

MM = 72 / 25.4
RUNNING_FONT = "RunningSans"
RUNNING_FONT_PATH = Path(__file__).resolve().parents[1]/"assets/design-system/fonts/NotoSans-Regular.ttf"


def normalized_text(page) -> str:
    return " ".join((page.extract_text() or "").split())


def page_label(index: int) -> str:
    if index == 1:
        return "ii"
    if index == 2:
        return "iii"
    return str(index - 2)


def build_overlay(reader: PdfReader) -> PdfReader:
    pdfmetrics.registerFont(TTFont(RUNNING_FONT, str(RUNNING_FONT_PATH)))
    buffer = BytesIO()
    first_box = reader.pages[0].mediabox
    canvas = Canvas(
        buffer,
        pagesize=(float(first_box.width), float(first_box.height)),
        initialFontName=RUNNING_FONT,
        initialFontSize=7,
    )
    current_chapter = ""

    for index, page in enumerate(reader.pages):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        canvas.setPageSize((width, height))
        canvas._code.append("/Artifact BMC")
        text = normalized_text(page)
        upper_text = text.upper()
        opening_chapter = next(
            (
                title
                for number, title in enumerate(CHAPTERS, start=1)
                if f"CHAPTER {number:02d}" in upper_text
            ),
            "",
        )
        opening_back_matter = ""
        if "APPENDIX A" in upper_text and "NOTES AND SOURCES" in upper_text:
            opening_back_matter = "Notes and Sources"
        elif "INDEX OF TERMS" in upper_text:
            opening_back_matter = "Index of Terms"
        elif "VERSION HISTORY" in upper_text and "CHANGELOG" in upper_text:
            opening_back_matter = "Changelog"
        opening_section = opening_chapter or opening_back_matter
        if opening_section:
            current_chapter = opening_section

        if index > 0:
            ink = (0.30, 0.29, 0.27) if THEME=='light' else HexColor(theme_tokens(THEME)['muted']).rgb()
            rule = (0.76, 0.74, 0.70) if THEME=='light' else HexColor(theme_tokens(THEME)['rule']).rgb()
            canvas.setFillColorRGB(*ink)
            canvas.setStrokeColorRGB(*rule)
            canvas.setLineWidth(0.35)

            if index >= 3 and not opening_section:
                canvas.setFont(RUNNING_FONT, 6.2)
                canvas.drawString(13 * MM, height - 7.4 * MM, BOOK_TITLE.upper())
                canvas.drawRightString(width - 13 * MM, height - 7.4 * MM, current_chapter.upper())
                canvas.line(13 * MM, height - 10 * MM, width - 13 * MM, height - 10 * MM)

            canvas.setFont(RUNNING_FONT, 7)
            canvas.line(13 * MM, 11.5 * MM, width - 13 * MM, 11.5 * MM)
            canvas.drawCentredString(width / 2, 6.7 * MM, page_label(index))

        canvas._code.append("EMC")
        canvas.showPage()

    canvas.save()
    buffer.seek(0)
    return PdfReader(buffer)


def finalize(input_path: Path, output_path: Path, config=None, theme='light') -> None:
    global CONFIG, BOOK_TITLE, AUTHOR, SUBTITLE, CHAPTERS, RUNNING_FONT_PATH, THEME
    CONFIG=config or {}; BOOK_TITLE=CONFIG['title']; AUTHOR=CONFIG['author']; SUBTITLE=CONFIG['subtitle']; CHAPTERS=CONFIG['chapters']; THEME=theme
    RUNNING_FONT_PATH=Path(CONFIG['runningFont'])
    if output_path.exists(): raise ValueError('Refusing to overwrite an existing PDF')
    reader = PdfReader(input_path)
    overlay = build_overlay(reader)
    writer = PdfWriter(clone_from=reader)
    # Preserve Chromium's declared PDF version. pypdf otherwise defaults the
    # cloned document to PDF 1.3 even when the input uses PDF 1.4 features.
    writer.pdf_header = reader.pdf_header

    for index, overlay_page in enumerate(overlay.pages):
        if THEME=='dark':
            page=writer.pages[index]; buffer=BytesIO()
            bg=Canvas(buffer,pagesize=(float(page.mediabox.width),float(page.mediabox.height)),initialFontName=RUNNING_FONT)
            bg._code.append('/Artifact BMC')
            bg.setFillColor(HexColor(theme_tokens(THEME)['paper']))
            bg.rect(0,0,float(page.mediabox.width),float(page.mediabox.height),fill=1,stroke=0)
            bg._code.append('EMC');bg.showPage();bg.save();buffer.seek(0)
            page.merge_page(PdfReader(buffer).pages[0],over=False)
        writer.pages[index].merge_page(overlay_page, over=True)

    writer.add_metadata(
        {
            "/Title": BOOK_TITLE+" · "+theme_tokens(THEME)["displayName"],
            "/Author": AUTHOR,
            "/Subject": SUBTITLE,
            "/Keywords": CONFIG.get("keywords", "handbook, evidence, publishing"),
            "/Creator": "Chromium; ReportLab",
        }
    )
    writer.set_page_label(0, 0, prefix="Cover")
    writer.set_page_label(1, 2, style=PageLabelStyle.LOWERCASE_ROMAN, start=2)
    writer.set_page_label(
        3,
        len(writer.pages) - 1,
        style=PageLabelStyle.DECIMAL,
        start=1,
    )
    writer.page_mode = "/UseOutlines"
    writer.create_viewer_preferences().display_doctitle = True
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as stream:
        writer.write(stream)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--config",type=Path,required=True)
    parser.add_argument("--theme",choices=["light","dark"],required=True)
    args = parser.parse_args()
    finalize(args.input, args.output,json.loads(args.config.read_text()),args.theme)


if __name__ == "__main__":
    main()
