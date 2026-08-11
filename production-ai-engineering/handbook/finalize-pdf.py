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


BOOK_TITLE = "Production AI Engineering"
AUTHOR = "Michael Long"
SUBTITLE = "A Handbook for Building Reliable LLM Systems"
CHAPTERS = [
    "Build the System Around the Model",
    "Treat Context as a Budget",
    "Prefill and Decode Are Different Jobs",
    "Choose the Optimization That Fits",
    "Turn Model Output into a Contract",
    "Put Clear Limits on Agents",
    "Keep Retrieval Grounded",
    "Make Evals the Release Gate",
    "Trace the Whole User Journey",
    "Build Safety into the Architecture",
    "Choose What to Change",
    "Design for Production Failure",
]

MM = 72 / 25.4
RUNNING_FONT = "RunningSans"
RUNNING_FONT_PATH = Path("/System/Library/Fonts/Supplemental/Arial.ttf")


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
            ink = (0.30, 0.29, 0.27)
            rule = (0.76, 0.74, 0.70)
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

        canvas.showPage()

    canvas.save()
    buffer.seek(0)
    return PdfReader(buffer)


def finalize(input_path: Path, output_path: Path) -> None:
    reader = PdfReader(input_path)
    overlay = build_overlay(reader)
    writer = PdfWriter(clone_from=reader)

    for index, overlay_page in enumerate(overlay.pages):
        writer.pages[index].merge_page(overlay_page, over=True)

    writer.add_metadata(
        {
            "/Title": BOOK_TITLE,
            "/Author": AUTHOR,
            "/Subject": SUBTITLE,
            "/Keywords": "AI engineering, LLM systems, production AI, reliability, inference",
            "/Creator": "Codex; Chromium; ReportLab",
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
    args = parser.parse_args()
    finalize(args.input, args.output)


if __name__ == "__main__":
    main()
