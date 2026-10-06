#!/usr/bin/env python3
"""Check code-panel splits, headers and diagram pagination in isolated memory."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import os
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from reportlab.lib.sequencer import Sequencer

SCRIPT_ROOT = Path(__file__).resolve().parent
LAYOUT = None
SHELL = "npm install\nnpx playwright install chromium\nnpm run dev -- --port 4207"


def table_text(table):
    return "".join(
        item.getPlainText()
        for row in table._cellvalues
        for cell in row
        for item in (cell if isinstance(cell, (list, tuple)) else [cell])
        if hasattr(item, "getPlainText")
    )


class RecordingCanvas:
    def __init__(self):
        self.right_strings = []
        self.left_strings = []

    def drawRightString(self, x, y, text):
        self.right_strings.append((x, y, text))

    def drawString(self, x, y, text):
        self.left_strings.append((x, y, text))

    def __getattr__(self, name):
        return lambda *args, **kwargs: None


def doc_and_canvas(template="Body", title="Previous chapter", page=54):
    doc = LAYOUT.GuideDocTemplate("unused-regression.pdf")
    doc.current_chapter = title
    doc.page = page
    doc.seq = Sequencer()
    doc.pageTemplate = next(item for item in doc.pageTemplates if item.id == template)
    doc.canv = RecordingCanvas()
    return doc, doc.canv


class PageLayoutTests(unittest.TestCase):
    def test_heading_moves_with_diagram_when_page_remainder_is_short(self):
        for marker, diagram_type in (("workflow-loop", LAYOUT.WorkflowLoop), ("surface-continuity", LAYOUT.SurfaceContinuityDiagram)):
            with self.subTest(marker=marker), tempfile.TemporaryDirectory(prefix="markdown-diagram-heading-") as directory:
                source = Path(directory) / "fixture.md"
                source.write_text(f"## The workflow\n\n<!-- DIAGRAM {marker} -->\n")
                with patch.object(LAYOUT, "SOURCE_MD", source), patch.object(LAYOUT, "load_figures", return_value={}):
                    story = LAYOUT.parse_markdown()
                heading_index = next(index for index, item in enumerate(story) if getattr(item, "_toc_title", None) == "The workflow")
                rendered = []

                class DiagramDoc(LAYOUT.BaseDocTemplate):
                    def afterFlowable(self, item):
                        if getattr(item, "_toc_title", None) == "The workflow":
                            rendered.append(("heading", self.page))
                        elif isinstance(item, diagram_type):
                            rendered.append(("diagram", self.page))

                doc = DiagramDoc(io.BytesIO(), pagesize=(LAYOUT.PAGE_W, 400))
                doc.addPageTemplates(LAYOUT.PageTemplate(id="Fixture", frames=[LAYOUT.Frame(LAYOUT.LEFT, 50, LAYOUT.CONTENT_W, 300, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)]))
                with patch.object(diagram_type, "draw"):
                    doc.build([LAYOUT.Spacer(1, 240), *story[heading_index:]])
                self.assertEqual(rendered, [("heading", 2), ("diagram", 2)])

    def test_short_shell_moves_intact_without_blank_remainder(self):
        table = LAYOUT.code_block(SHELL, "sh")
        _, height = table.wrap(LAYOUT.CONTENT_W, 1000)
        self.assertEqual(len(table._cellvalues), 1)
        self.assertEqual(table.split(LAYOUT.CONTENT_W, height - 1), [])
        self.assertLess(height, LAYOUT.PAGE_H - LAYOUT.TOP - LAYOUT.BOTTOM)
        self.assertEqual(table._code_body, SHELL)
        self.assertEqual(table._code_language, "sh")

    def test_prior_in_row_split_reproduces_empty_continuation(self):
        table = LAYOUT.code_block(SHELL, "sh")
        table.splitInRow = 1
        _, height = table.wrap(LAYOUT.CONTENT_W, 1000)
        parts = table.split(LAYOUT.CONTENT_W, height - 1)
        self.assertEqual(len(parts), 2)
        self.assertEqual(table_text(parts[0]), SHELL.replace("\n", ""))
        self.assertEqual(table_text(parts[1]), "")

    def test_long_wrapped_block_still_splits_between_eight_line_chunks(self):
        source = "\n".join(f"echo fixture-{number:02d}-" + "x" * 90 for number in range(1, 73))
        table = LAYOUT.code_block(source, "sh")
        _, height = table.wrap(LAYOUT.CONTENT_W, 10000)
        frame = LAYOUT.PAGE_H - LAYOUT.TOP - LAYOUT.BOTTOM
        self.assertEqual(len(table._cellvalues), 9)
        self.assertGreater(height, frame)
        self.assertTrue(all(row_height <= frame for row_height in table._rowHeights))
        parts = table.split(LAYOUT.CONTENT_W, table._rowHeights[0] + 1)
        self.assertEqual(len(parts), 2)
        self.assertEqual(len(parts[0]._cellvalues), 1)
        self.assertEqual(len(parts[1]._cellvalues), 8)
        self.assertEqual("".join(map(table_text, parts)), source.replace("\n", ""))

    def test_appendix_header_uses_heading_on_current_page(self):
        doc, canvas = doc_and_canvas(title="Appendix B: Handoff record", page=54)
        with patch.object(doc, "_metadata"), patch.object(doc, "_footer"):
            doc.pageTemplate.onPage(canvas, doc)
        self.assertEqual(canvas.right_strings, [])
        doc.afterFlowable(LAYOUT.heading("Appendix C: Package map", 1))
        doc.afterPage()
        self.assertEqual(canvas.right_strings[-1][2], "APPENDIX C: PACKAGE MAP")

    def test_further_reading_header_uses_heading_on_current_page(self):
        doc, canvas = doc_and_canvas(title="Appendix C: Package map", page=55)
        doc.afterFlowable(LAYOUT.heading("Further reading", 1))
        doc.afterPage()
        self.assertEqual(canvas.right_strings[-1][2], "FURTHER READING")

    def test_chapter_continuation_header_preserves_title_and_typography(self):
        doc, canvas = doc_and_canvas(title="9. Build with Claude Code", page=42)
        doc.afterFlowable(LAYOUT.P("Continued chapter text."))
        doc.afterPage()
        self.assertEqual(canvas.right_strings, [(LAYOUT.PAGE_W - LAYOUT.RIGHT, LAYOUT.PAGE_H - 7.2 * LAYOUT.mm, "9. BUILD WITH CLAUDE CODE")])
        self.assertEqual(canvas.left_strings[-1][2], LAYOUT.CONFIG["title"].upper())

    def test_chapter_and_frontmatter_suppress_body_running_head(self):
        for template in ("Chapter", "Front"):
            with self.subTest(template=template):
                doc, canvas = doc_and_canvas(template=template)
                doc.afterFlowable(LAYOUT.heading("New section", 1))
                doc.afterPage()
                self.assertEqual(canvas.right_strings, [])
                self.assertEqual(canvas.left_strings, [])

    def test_pagebreak_does_not_set_following_title_on_previous_page(self):
        with tempfile.TemporaryDirectory(prefix="markdown-header-source-") as directory:
            source = Path(directory) / "fixture.md"
            source.write_text("# Previous section\n\nPrevious body.\n\n<pagebreak>\n\n# Following section\n\nFollowing body.\n")
            with patch.object(LAYOUT, "SOURCE_MD", source), patch.object(LAYOUT, "load_figures", return_value={}):
                story = LAYOUT.parse_markdown()
        self.assertFalse(any(isinstance(item, LAYOUT.SetNextRunningHead) for item in story))
        titles = [item.getPlainText() for item in story if getattr(getattr(item, "style", None), "name", None) == "H1"]
        self.assertEqual(titles, ["Previous section", "Following section"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", type=Path, help="Optional actual authoring inputs for wrapped chunk measurements")
    parser.add_argument("--layout", type=Path, help="Optional preserved pre-fix layout for negative regression")
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="markdown-page-layout-") as directory:
        fixture = Path(directory)
        config = {"markdown": "fixture.md", "title": "Layout fixture", "subtitle": "Layout fixture", "coverKicker": "FIXTURE", "coverTitleHtml": "Fixture", "editionLabel": "Fixture", "chapterSourceNotes": {}}
        book = args.book.resolve() if args.book else fixture
        if args.book:
            config = json.loads((book / "pdf-config.json").read_text())
        else:
            (fixture / "fixture.md").write_text("# Fixture\n\nFixture body.\n")
        os.environ.update(HANDBOOK_BOOK_ROOT=str(book), HANDBOOK_PDF_CONFIG=json.dumps(config))
        layout_path = (args.layout or SCRIPT_ROOT / "markdown_layout.py").resolve()
        sys.path.insert(0, str(layout_path.parent))
        spec = importlib.util.spec_from_file_location("markdown_page_layout_regression", layout_path)
        assert spec and spec.loader
        global LAYOUT
        LAYOUT = importlib.util.module_from_spec(spec)
        LAYOUT.__file__ = str(SCRIPT_ROOT / "markdown_layout.py")
        exec(compile(layout_path.read_text(), str(layout_path), "exec"), LAYOUT.__dict__)
        result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PageLayoutTests))
        if not result.wasSuccessful():
            raise SystemExit(1)
        report = {"status": "passed", "tests": result.testsRun, "pdfsAuthored": 0, "inMemoryPaginationProofs": 2, "layoutSha256": hashlib.sha256(layout_path.read_bytes()).hexdigest()}
        if args.book:
            source = book / config["markdown"]
            code = re.findall(r"^```[^\n]*\n(.*?)^```[ \t]*$", source.read_text(), re.MULTILINE | re.DOTALL)
            heights = []
            for body in code:
                table = LAYOUT.code_block(body)
                table.wrap(LAYOUT.CONTENT_W, 10000)
                heights.extend(table._rowHeights)
            frame = LAYOUT.PAGE_H - LAYOUT.TOP - LAYOUT.BOTTOM
            assert heights and max(heights) <= frame, "A wrapped eight-line code chunk exceeds the full body frame"
            report["actualSource"] = {"path": str(source), "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "codeBlocks": len(code), "chunks": len(heights), "maximumWrappedChunkHeightPoints": max(heights), "bodyFrameHeightPoints": frame, "allChunksFitFullFrame": True}
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
