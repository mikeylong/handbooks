#!/usr/bin/env python3
"""Regression tests for edition-independent PDF completeness checks.

Run with the same Python PDF dependencies as the weekly finalizer.
"""

from copy import deepcopy
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
SPEC = spec_from_file_location("validate_pdf", ROOT / "handbook/validate-pdf.py")
validator = module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


def edition(changelog=True, continuation_pages=0):
    texts = ["Cover", "Foreword", "Contents"]
    openers = []
    destinations = {}
    for number, title in enumerate(validator.CHAPTERS, start=1):
        page = len(texts)
        openers.append(page + 1)
        destinations[f"chapter-{number:02d}-title"] = page
        content = f"CHAPTER {number:02d}\n{title}"
        for section, (display, heading) in enumerate(zip(
            validator.SECTION_DISPLAY_NUMBERS, validator.SECTIONS,
        ), start=1):
            if int(display.split(".")[0]) == number:
                destinations[f"section-{section:02d}-title"] = page
                content += f"\n{display} {heading}"
        texts.append(content)
        if number == 1:
            texts.extend(["Chapter 1 continuation"] * continuation_pages)
    destinations["appendix-citations"] = len(texts)
    texts.append("APPENDIX A\nNOTES AND SOURCES")
    destinations["term-index"] = len(texts)
    texts.append("INDEX OF TERMS")
    if changelog:
        destinations["changelog"] = len(texts)
        texts.append("VERSION HISTORY\nCHANGELOG")
    return texts, openers, destinations, changelog


class StructureTests(unittest.TestCase):
    def check(self, fixture):
        return validator.validate_structure(*fixture)

    def test_short_and_long_editions_with_single_page_back_matter(self):
        for changed in [False, True]:
            for extra in [0, 80, 1000]:
                with self.subTest(changed=changed, extra=extra):
                    self.check(edition(changed, extra))

    def test_missing_required_content_and_destinations(self):
        original = edition()
        for name in original[2]:
            with self.subTest(missing=name):
                fixture = deepcopy(original)
                del fixture[2][name]
                with self.assertRaisesRegex(AssertionError, "destination"):
                    self.check(fixture)
        for page in range(3, len(original[0]) - 1):
            with self.subTest(missing_page_text=page):
                fixture = deepcopy(original)
                fixture[0][page] = "Only a running head remains"
                with self.assertRaises(AssertionError):
                    self.check(fixture)

    def test_invalid_destination_pages(self):
        for page in [-1, 10000, None]:
            fixture = edition()
            fixture[2]["ref-broken"] = page
            with self.subTest(page=page), self.assertRaisesRegex(AssertionError, "outside the PDF"):
                self.check(fixture)

    def test_reordered_chapters_and_misdirected_sections(self):
        fixture = edition()
        fixture[1][0], fixture[1][1] = fixture[1][1], fixture[1][0]
        with self.assertRaises(AssertionError):
            self.check(fixture)
        fixture = edition()
        fixture[2]["section-01-title"] = fixture[2]["chapter-02-title"]
        with self.assertRaisesRegex(AssertionError, "outside its chapter"):
            self.check(fixture)
        fixture = edition()
        fixture[2]["section-01-duplicate"] = fixture[2]["section-01-title"]
        with self.assertRaisesRegex(AssertionError, "Expected one destination"):
            self.check(fixture)

    def test_index_and_changelog_must_have_separate_pages(self):
        fixture = edition()
        fixture[2]["changelog"] = fixture[2]["term-index"]
        with self.assertRaisesRegex(AssertionError, "after the Index"):
            self.check(fixture)
        fixture = edition()
        fixture[2]["changelog-end"] = len(fixture[0]) - 2
        with self.assertRaisesRegex(AssertionError, "final PDF page"):
            self.check(fixture)

    def test_back_matter_continuations_and_unchanged_editions(self):
        fixture = edition(False)
        fixture[0].append("INDEX OF TERMS\nMore terms")
        self.check(fixture)
        fixture[0][-1] = "Unrelated appendix or trailing content"
        with self.assertRaisesRegex(AssertionError, "inside its page range"):
            self.check(fixture)
        fixture = edition(False)
        fixture[2]["changelog"] = len(fixture[0]) - 1
        with self.assertRaisesRegex(AssertionError, "Unexpected changelog"):
            self.check(fixture)


class ScaleTests(unittest.TestCase):
    class FakePage:
        def __init__(self, size):
            self.size = size

        def search(self, _pattern, *, regex, return_chars):
            self.assert_search_options = (regex, return_chars)
            return [{"chars": [{"text": "A", "size": self.size}]}]

    class FakePdf:
        def __init__(self, cover_size, body_size):
            self.pages = [ScaleTests.FakePage(cover_size), ScaleTests.FakePage(body_size)]

    def test_intended_print_scale_passes(self):
        validator.validate_print_scale(self.FakePdf(42.0, 10.0))

    def test_whole_document_shrinkage_fails(self):
        with self.assertRaisesRegex(AssertionError, "Print scale changed: cover title is 28.00 pt"):
            validator.validate_print_scale(self.FakePdf(28.0, 6.67))


class LedgerTests(unittest.TestCase):
    def test_published_candidate_unsaved_and_explicit_ledgers(self):
        with TemporaryDirectory() as directory:
            handbook = Path(directory)
            (handbook / "releases").mkdir()
            working = handbook / "changelog.json"
            published = {"summary": "Published changes", "items": ["saved change"]}
            (handbook / "releases/version-1.3.json").write_text(json.dumps(published))
            cover = "September 8, 2026 · Version 1.3"
            with patch.object(validator, "__file__", str(handbook / "validate-pdf.py")):
                for summary in [validator.UNCHANGED_CHANGELOG_SUMMARY, "New candidate changes"]:
                    candidate = {"summary": summary, "items": []}
                    working.write_text(json.dumps(candidate))
                    with self.subTest(working_summary=summary):
                        self.assertEqual(validator.load_changelog(cover_text=cover), (published, True))
                        expected = (candidate, summary != validator.UNCHANGED_CHANGELOG_SUMMARY)
                        self.assertEqual(validator.load_changelog(cover_text=cover + "-candidate.20260908.120000"), expected)
                        self.assertEqual(validator.load_changelog(cover_text=cover.replace("1.3", "1.4")), expected)
                        self.assertEqual(validator.load_changelog(working, cover_text=cover), expected)


if __name__ == "__main__":
    unittest.main()
