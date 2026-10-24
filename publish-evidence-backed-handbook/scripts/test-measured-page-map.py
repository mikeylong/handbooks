#!/usr/bin/env python3
"""Regression/contract tests for exact-PDF candidate page maps.

Optional ``--collection-root`` measures each current approved edition resolved
through catalog.json and its current release manifest, read-only. ``--output``
retains test evidence in a fresh directory. No review helpers or book builders
are invoked, and no production/review files are modified.
"""

from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
from pypdf import PdfReader
from reportlab.pdfgen import canvas


SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
spec = importlib.util.spec_from_file_location("measure_page_map", SCRIPTS_DIR / "measure-page-map.py")
assert spec and spec.loader
MAP = importlib.util.module_from_spec(spec)
spec.loader.exec_module(MAP)
IDENTITY = {"id": "test-handbook", "title": "Test Handbook", "version": "1.0.0-candidate", "date": "2026-10-12"}


def fixture_directory() -> tempfile.TemporaryDirectory:
    """Honor the runtime's portable temporary directory (including TMPDIR)."""
    return tempfile.TemporaryDirectory(prefix="measured-page-map-")


def fixture_pdf(
    root: Path,
    *,
    paints: int = 1,
    marker: str = "CHAPTER 01",
    outline: str | None = "1. A measured opener",
    duplicate_outline: bool = False,
    duplicate_chapter: bool = False,
    image_size: int = 300,
    mask: bool = False,
    version: str = IDENTITY["version"],
    date: str = "October 12, 2026",
    metadata_title: str = IDENTITY["title"],
    subject: str = "",
    changelog: bool = False,
) -> Path:
    pdf = root / "fixture.pdf"
    image = root / "image.png"
    pixels = Image.new("RGBA" if mask else "RGB", (image_size, image_size), (20, 20, 20, 128) if mask else (20, 20, 20))
    pixels.save(image)
    writer = canvas.Canvas(str(pdf), pagesize=(420, 594.96), invariant=1, pdfVersion=(1, 4))
    writer.setTitle(metadata_title)
    writer.setSubject(subject)
    writer.drawString(30, 540, "Test Handbook")
    writer.drawString(30, 520, f"{date} | Version {version}")
    writer.showPage()

    def chapter_page(key: str) -> None:
        if outline is not None:
            writer.bookmarkPage(key)
            writer.addOutlineEntry(outline, key, level=0)
            if duplicate_outline:
                writer.addOutlineEntry("Duplicate destination", key, level=0)
        text = writer.beginText(30, 540)
        for line in marker.splitlines():
            text.textLine(line)
        writer.drawText(text)
        writer.drawString(30, 520, "A measured opener")
        for index in range(paints):
            writer.drawImage(str(image), 30 + index * 80, 300, width=72, height=72, mask="auto" if mask else None)
        writer.showPage()

    chapter_page("chapter-1")
    if duplicate_chapter:
        chapter_page("chapter-duplicate")
    if changelog:
        writer.bookmarkPage("changelog")
        writer.addOutlineEntry("Changelog", "changelog", level=0)
        writer.drawString(30, 540, "Changelog")
        writer.showPage()
        writer.drawString(30, 540, "The second changelog page")
        writer.showPage()
    writer.save()
    return pdf


class MeasuredPageMapTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = fixture_directory()
        # macOS commonly exposes its temporary directory through /var, a system
        # symlink. Resolve the newly allocated fixture directory so the actual
        # PDF input retains the mapper's strict no-symlink path contract.
        self.root = Path(self.temporary.name).resolve()

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def measure(self, **fixture: object) -> dict:
        pdf = fixture_pdf(self.root, **fixture)
        return MAP.measure_page_map(pdf, IDENTITY, chapter_count=1, artifact_profile="candidate-fixture")

    def test_fixture_directory_honors_portable_runtime_temp_location(self) -> None:
        alternate = self.root / "runtime-temp"
        alternate.mkdir()
        with patch.object(tempfile, "tempdir", str(alternate)):
            with fixture_directory() as directory:
                self.assertEqual(Path(directory).parent, alternate)

    def test_positive_schema_hash_edition_and_measured_bindings(self) -> None:
        result = self.measure()
        self.assertEqual(result["artifactProfile"], "candidate-fixture")
        self.assertEqual(result["sha256"], MAP.sha256_file(self.root / "fixture.pdf"))
        self.assertEqual(result["pdfSha256"], result["sha256"])
        self.assertEqual(result["edition"], IDENTITY)
        self.assertEqual(len(result["pages"]), 2)
        cover, opener = result["pages"]
        self.assertNotIn("requiredRasterIllustration", cover)
        self.assertEqual(opener["requiredRasterIllustration"], {"paintCount": 1, "minimumEffectivePpi": 240, "requireOpaque": True})
        self.assertEqual(opener["chapter"], 1)
        self.assertEqual(opener["role"], "chapter-opener")
        self.assertEqual(opener["rasterImagePaints"][0]["width"], 300)
        self.assertEqual(opener["rasterImagePaints"][0]["xPpi"], 300)
        self.assertTrue(opener["rasterImagePaints"][0]["opaque"])
        self.assertTrue(opener["rasterImagePaints"][0]["object"])
        self.assertEqual(result["measurement"]["requiredRasterIllustrationPages"], 1)
        gates, errors = MAP.VALIDATOR.required_raster_illustration_report(result["pages"], MAP.VALIDATOR.raster_image_paints(PdfReader(self.root / "fixture.pdf")), 240)
        self.assertEqual(errors, [])
        self.assertEqual(gates[0]["status"], "passed")

    def test_missing_image_fails_not_omits_gate(self) -> None:
        with self.assertRaisesRegex(ValueError, "found 0"):
            self.measure(paints=0)

    def test_duplicate_paint_of_same_xobject_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "found 2"):
            self.measure(paints=2)

    def test_low_ppi_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "below 240"):
            self.measure(image_size=239)

    def test_mask_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "non-opaque"):
            self.measure(mask=True)

    def test_missing_chapter_marker_fails_even_with_image(self) -> None:
        with self.assertRaisesRegex(ValueError, "Expected chapter markers"):
            self.measure(marker="OPENER 01")

    def test_duplicate_chapter_marker_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate chapter markers"):
            self.measure(marker="CHAPTER 01\nCHAPTER 01")

    def test_duplicate_chapter_page_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "duplicate opener pages"):
            self.measure(duplicate_chapter=True)

    def test_noncontiguous_chapter_number_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "Expected chapter markers"):
            self.measure(marker="CHAPTER 02")

    def test_missing_outline_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "exactly one outline destination; found 0"):
            self.measure(outline=None)

    def test_duplicate_outline_destination_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "exactly one outline destination; found 2"):
            self.measure(duplicate_outline=True)

    def test_wrong_outline_title_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "outline title does not match"):
            self.measure(outline="1. Different chapter")

    def test_wrong_cover_version_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "cover version differs"):
            self.measure(version="1.0.0")

    def test_space_candidate_suffix_is_not_a_full_version(self) -> None:
        with self.assertRaisesRegex(ValueError, "cover version differs"):
            self.measure(version="1.0.0 candidate")

    def test_stale_metadata_edition_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "metadata content edition differs"):
            self.measure(subject="Content edition 0.9.0 · 2026-10-12 · PDF appearance revision 1")

    def test_wrong_metadata_title_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "metadata title differs"):
            self.measure(metadata_title="Different Handbook")

    def test_appearance_title_is_accepted(self) -> None:
        self.assertEqual(self.measure(metadata_title="Test Handbook · Late night version")["measurement"]["identity"]["coverVersion"], IDENTITY["version"])

    def test_wrong_cover_date_fails(self) -> None:
        with self.assertRaisesRegex(ValueError, "cover date differs"):
            self.measure(date="October 11, 2026")

    def test_month_precision_is_disclosed(self) -> None:
        self.assertEqual(self.measure(date="October 2026")["measurement"]["identity"]["coverDatePrecision"], "month")

    def test_multipage_changelog_roles_follow_outline_section(self) -> None:
        result = self.measure(changelog=True)
        self.assertEqual([page["role"] for page in result["pages"]], ["cover", "chapter-opener", "changelog", "changelog"])
        self.assertTrue(all("requiredRasterIllustration" not in page for page in result["pages"][2:]))

    def test_rejects_bad_identity_and_weakened_contract(self) -> None:
        pdf = fixture_pdf(self.root)
        for field, invalid in [("id", "../test"), ("version", "20261012.153750"), ("date", "2026-02-31"), ("title", "")]:
            with self.subTest(field=field):
                identity = {**IDENTITY, field: invalid}
                with self.assertRaises(ValueError):
                    MAP.measure_page_map(pdf, identity, chapter_count=1)
        for invalid in [True, 0, -1]:
            with self.subTest(chapters=invalid), self.assertRaises(ValueError):
                MAP.measure_page_map(pdf, IDENTITY, chapter_count=invalid)
        for invalid in [True, 239, 120]:
            with self.subTest(ppi=invalid), self.assertRaises(ValueError):
                MAP.measure_page_map(pdf, IDENTITY, chapter_count=1, minimum_ppi=invalid)
        with self.assertRaisesRegex(ValueError, "profile"):
            MAP.measure_page_map(pdf, IDENTITY, chapter_count=1, artifact_profile="design-specimen")

    def test_expected_pdf_hash_is_enforced(self) -> None:
        pdf = fixture_pdf(self.root)
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            MAP.measure_page_map(pdf, IDENTITY, chapter_count=1, expected_sha256="a" * 64)
        result = MAP.measure_page_map(pdf, IDENTITY, chapter_count=1, expected_sha256=MAP.sha256_file(pdf))
        self.assertEqual(result["sha256"], MAP.sha256_file(pdf))

    def test_verification_rejects_boolean_schema_stale_hash_edition_and_paint(self) -> None:
        pdf = fixture_pdf(self.root)
        result = MAP.measure_page_map(pdf, IDENTITY, chapter_count=1)
        self.assertEqual(MAP.verify_page_map(result, pdf, IDENTITY, chapter_count=1)["status"], "passed")
        mutations = [
            lambda value: value.update(sha256="a" * 64),
            lambda value: value["edition"].update(version="1.0.2"),
            lambda value: value["pages"][1].update(requiredRasterIllustration=True),
            lambda value: value["pages"][0].update(requiredRasterIllustration=False),
            lambda value: value["pages"][1]["rasterImagePaints"][0].update(width=1),
            lambda value: value["pages"].pop(),
        ]
        for mutate in mutations:
            damaged = copy.deepcopy(result)
            mutate(damaged)
            with self.assertRaisesRegex(ValueError, "binding differs"):
                MAP.verify_page_map(damaged, pdf, IDENTITY, chapter_count=1)

    def test_symlink_input_rejected(self) -> None:
        pdf = fixture_pdf(self.root)
        linked = self.root / "linked.pdf"
        linked.symlink_to(pdf)
        with self.assertRaisesRegex(ValueError, "symlink"):
            MAP.measure_page_map(linked, IDENTITY, chapter_count=1)

    def test_cli_fresh_output_verify_no_overwrite_and_failed_output_absent(self) -> None:
        pdf = fixture_pdf(self.root)
        identity = self.root / "identity.json"
        identity.write_text(json.dumps(IDENTITY), encoding="utf-8")
        output = self.root / "map.json"
        base = [sys.executable, str(SCRIPTS_DIR / "measure-page-map.py"), "--pdf", str(pdf), "--identity", str(identity), "--chapters", "1"]
        first = subprocess.run([*base, "--output", str(output)], capture_output=True, text=True)
        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        original = output.read_bytes()
        verify = subprocess.run([*base, "--verify", str(output)], capture_output=True, text=True)
        self.assertEqual(verify.returncode, 0, verify.stdout + verify.stderr)
        overwrite = subprocess.run([*base, "--output", str(output)], capture_output=True, text=True)
        self.assertEqual(overwrite.returncode, 1)
        self.assertIn("already exists", overwrite.stdout)
        self.assertEqual(output.read_bytes(), original)
        failed = self.root / "must-not-exist.json"
        rejected = subprocess.run([*base, "--expected-sha256", "a" * 64, "--output", str(failed)], capture_output=True, text=True)
        self.assertEqual(rejected.returncode, 1)
        self.assertFalse(failed.exists())

    def test_cli_corrupt_pdf_fails_with_machine_readable_receipt(self) -> None:
        pdf = self.root / "invalid.pdf"
        pdf.write_bytes(b"not a PDF")
        identity = self.root / "identity.json"
        identity.write_text(json.dumps(IDENTITY), encoding="utf-8")
        output = self.root / "map.json"
        result = subprocess.run([sys.executable, str(SCRIPTS_DIR / "measure-page-map.py"), "--pdf", str(pdf), "--identity", str(identity), "--chapters", "1", "--output", str(output)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(json.loads(result.stdout)["status"], "failed")
        self.assertFalse(output.exists())


def measure_collection(root: Path, output: Path | None) -> list[dict]:
    catalog = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
    selected = {"production-ai-engineering", "ai-evaluation", "ai-consulting", "claude-design"}
    reports = []
    for book in catalog["books"]:
        if book["id"] not in selected:
            continue
        book_root = root / book["directory"]
        manifest = json.loads((book_root / "release-manifest.json").read_text(encoding="utf-8"))
        assert manifest["pdf"] == book["pdf"], f"Catalog/release PDF mismatch for {book['id']}"
        assert manifest["version"] == book["version"], f"Catalog/release version mismatch for {book['id']}"
        assert manifest["sha256"] == book["pdfSha256"], f"Catalog/release hash mismatch for {book['id']}"
        artwork = json.loads((book_root / "artwork-pairs.json").read_text(encoding="utf-8"))["artwork"]
        chapters = [item["chapter"] for item in artwork]
        assert sorted(chapters) == list(range(1, len(chapters) + 1)), "Artwork chapter contract is not contiguous"
        pdf = book_root / manifest["pdf"]
        before = MAP.sha256_file(pdf)
        measured = MAP.measure_page_map(pdf, manifest, book_id=book["id"], chapter_count=len(chapters), expected_sha256=manifest["sha256"])
        assert len(measured["pages"]) == manifest["pages"] == book["pages"], "Measured page count mismatch"
        assert MAP.sha256_file(pdf) == before, "Approved PDF changed during read-only measurement"
        verification = MAP.verify_page_map(measured, pdf, manifest, book_id=book["id"], chapter_count=len(chapters), expected_sha256=manifest["sha256"])
        if output:
            (output / f"{book['id']}-page-map.json").write_text(json.dumps(measured, indent=2) + "\n", encoding="utf-8")
        reports.append({"book": book["id"], "version": manifest["version"], "sha256": before, "pages": len(measured["pages"]), "chapterOpeners": len(chapters), "coverDatePrecision": measured["measurement"]["identity"]["coverDatePrecision"], "status": verification["status"]})
    assert {item["book"] for item in reports} == selected, "Four current catalog editions were not all measured"
    return reports


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--collection-root", type=Path)
    parser.add_argument("--output", type=Path, help="Fresh evidence directory; never overwrites")
    args = parser.parse_args()
    output = None
    if args.output:
        output = args.output.expanduser().absolute()
        if output.exists() or any(component.is_symlink() for component in (output, *output.parents)):
            parser.error("Evidence output must be a fresh, nonsymlink directory")
        output.mkdir(parents=True)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(MeasuredPageMapTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    evidence = {"status": "passed" if result.wasSuccessful() else "failed", "testsRun": result.testsRun, "failures": len(result.failures), "errors": len(result.errors), "collection": []}
    if result.wasSuccessful() and args.collection_root:
        try:
            evidence["collection"] = measure_collection(args.collection_root.resolve(), output)
        except (ValueError, OSError, KeyError, AssertionError) as error:
            evidence["status"] = "failed"
            evidence["collectionError"] = str(error)
    if output:
        (output / "results.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2))
    return int(evidence["status"] != "passed")


if __name__ == "__main__":
    raise SystemExit(main())
