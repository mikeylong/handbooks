#!/usr/bin/env python3
"""Check explicit comparison page roles without authoring PDF artifacts."""

from __future__ import annotations

import argparse
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from pypdf import PdfReader


SCRIPT_ROOT = Path(__file__).resolve().parent
# Actual extracted heading/table text from an Appendix C body page. "Contents"
# is a column label, not a table-of-contents heading.
BODY_TABLE_TEXT = """CLAUDE DESIGN FIELD GUIDE
APPENDIX B: HANDOFF RECORD
48
Appendix C: Package map
Path
Contents
README.md
First-run, journey, validation, and reset instructions
"""


def load_comparison(path: Path):
    spec = importlib.util.spec_from_file_location("edition_comparison", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


COMPARE = load_comparison(SCRIPT_ROOT / "compare-editions.py")


class PageRoleTests(unittest.TestCase):
    def test_body_table_contents_is_substantive(self):
        self.assertIn("contents", COMPARE.heading_lines(BODY_TABLE_TEXT))
        self.assertFalse(COMPARE.is_navigation_surface(BODY_TABLE_TEXT, "body"))
        self.assertFalse(COMPARE.is_changelog_surface(BODY_TABLE_TEXT, "body"))

    def test_explicit_body_overrides_changelog_heading(self):
        self.assertFalse(COMPARE.is_changelog_surface("Changelog\nA body example", "body"))

    def test_explicit_navigation_role_overrides_changelog_heading(self):
        self.assertFalse(COMPARE.is_changelog_surface("Changelog", "contents"))
        self.assertTrue(COMPARE.is_navigation_surface("Changelog", "contents"))

    def test_explicit_changelog_role_overrides_navigation_heading(self):
        self.assertTrue(COMPARE.is_changelog_surface("Contents", "conditional-final-changelog"))
        self.assertFalse(COMPARE.is_navigation_surface("Contents", "conditional-final-changelog"))

    def test_absent_roles_preserve_heading_fallback(self):
        self.assertTrue(COMPARE.is_navigation_surface(BODY_TABLE_TEXT, ""))
        self.assertTrue(COMPARE.is_navigation_surface("Index of terms", ""))
        self.assertTrue(COMPARE.is_changelog_surface("Changelog", ""))
        self.assertFalse(COMPARE.is_navigation_surface("An ordinary body", ""))

    def test_map_normalization_and_blank_role_fallback(self):
        with tempfile.TemporaryDirectory(prefix="edition-page-role-test-") as name:
            page_map = Path(name) / "map.json"
            page_map.write_text(json.dumps({"pages": [{"role": " Body "}, {"role": " "}, {}]}))
            self.assertEqual(COMPARE.page_roles(page_map, 3, "test map"), {1: "body", 2: "", 3: ""})
        self.assertEqual(COMPARE.page_roles(None, 3, "test map"), {})

    def test_surface_partition_uses_supplied_roles(self):
        texts = [BODY_TABLE_TEXT, "Changelog", "Changelog", "Contents", "Contents", "Changelog", "Ordinary body"]
        reader = SimpleNamespace(pages=[SimpleNamespace(extract_text=lambda value=value: value) for value in texts])
        all_pages, substantive, changelog, navigation = COMPARE.page_surfaces(
            reader, {1: "body", 2: "body", 3: "contents", 4: "conditional-final-changelog", 5: ""}
        )
        self.assertEqual(len(all_pages), 7)
        self.assertEqual([number for number, _ in substantive], [1, 2, 7])
        self.assertEqual(changelog, [4, 6])
        self.assertEqual(navigation, [3, 5])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path)
    parser.add_argument("--page-map", type=Path)
    parser.add_argument("--body-page", type=int)
    parser.add_argument("--comparator", type=Path, help="Optional saved comparator for a negative regression check")
    args = parser.parse_args()
    if any(value is not None for value in (args.pdf, args.page_map, args.body_page)) and not all(
        value is not None for value in (args.pdf, args.page_map, args.body_page)
    ):
        parser.error("--pdf, --page-map and --body-page must be supplied together")
    global COMPARE
    if args.comparator:
        COMPARE = load_comparison(args.comparator.resolve())
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PageRoleTests))
    if not result.wasSuccessful():
        raise SystemExit(1)
    report = {"status": "passed", "tests": result.testsRun, "pdfsAuthored": 0}
    if args.pdf:
        reader = PdfReader(args.pdf)
        roles = COMPARE.page_roles(args.page_map, len(reader.pages), "actual page map")
        assert roles.get(args.body_page) == "body", "Actual regression page must have an explicit body role"
        all_pages, substantive, changelog, navigation = COMPARE.page_surfaces(reader, roles)
        assert args.body_page in [number for number, _ in substantive], "Explicit body page was excluded"
        assert "contents" in COMPARE.heading_lines(dict(all_pages)[args.body_page]), "Actual page must exercise the ambiguous Contents heading"
        report["actualPdf"] = {"page": args.body_page, "role": roles[args.body_page], "substantive": True,
                               "ignoredChangelogPages": changelog, "ignoredNavigationPages": navigation}
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
