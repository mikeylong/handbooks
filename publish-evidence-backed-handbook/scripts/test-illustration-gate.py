#!/usr/bin/env python3
"""Focused regression tests for required raster illustration validation."""

from __future__ import annotations

import importlib.util
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
    NumberObject,
)


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = PACKAGE_ROOT / "scripts"
VALIDATOR_PATH = SCRIPTS_DIR / "validate-pdf.py"
SPECIMEN_PATH = PACKAGE_ROOT / "references/specimen/canonical-handbook-specimen.pdf"
sys.path.insert(0, str(SCRIPTS_DIR))


def load_validator():
    spec = importlib.util.spec_from_file_location("handbook_validate_pdf", VALIDATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load validator: {VALIDATOR_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


VALIDATOR = load_validator()


def paint(*, page: int = 1, ppi: float = 300.0, opaque: bool = True):
    return {
        "page": page,
        "name": "/Im0",
        "object": "fixture",
        "width": 100,
        "height": 100,
        "xPpi": ppi,
        "yPpi": ppi,
        "hasSMask": not opaque,
        "hasMask": False,
        "isImageMask": False,
        "opaque": opaque,
    }


def required_page(*, minimum_ppi: int = 240):
    return {
        "pdfPage": 1,
        "role": "chapter-opener",
        "requiredRasterIllustration": {
            "paintCount": 1,
            "minimumEffectivePpi": minimum_ppi,
            "requireOpaque": True,
        },
    }


def reader_with_repeated_image_paints(
    paint_count: int, *, with_soft_mask: bool = False
) -> PdfReader:
    writer = PdfWriter()
    page = writer.add_blank_page(width=144, height=144)

    image = DecodedStreamObject()
    image.set_data(bytes(100 * 100))
    image.update(
        {
            NameObject("/Type"): NameObject("/XObject"),
            NameObject("/Subtype"): NameObject("/Image"),
            NameObject("/Width"): NumberObject(100),
            NameObject("/Height"): NumberObject(100),
            NameObject("/ColorSpace"): NameObject("/DeviceGray"),
            NameObject("/BitsPerComponent"): NumberObject(8),
        }
    )
    if with_soft_mask:
        soft_mask = DecodedStreamObject()
        soft_mask.set_data(bytes([255]))
        soft_mask.update(
            {
                NameObject("/Type"): NameObject("/XObject"),
                NameObject("/Subtype"): NameObject("/Image"),
                NameObject("/Width"): NumberObject(1),
                NameObject("/Height"): NumberObject(1),
                NameObject("/ColorSpace"): NameObject("/DeviceGray"),
                NameObject("/BitsPerComponent"): NumberObject(8),
            }
        )
        image[NameObject("/SMask")] = writer._add_object(soft_mask)
    image_reference = writer._add_object(image)
    page[NameObject("/Resources")] = DictionaryObject(
        {
            NameObject("/XObject"): DictionaryObject(
                {NameObject("/Im0"): image_reference}
            )
        }
    )
    content = DecodedStreamObject()
    content.set_data(
        b"\n".join(
            b"q 24 0 0 24 12 12 cm /Im0 Do Q" for _ in range(paint_count)
        )
    )
    page[NameObject("/Contents")] = writer._add_object(content)

    stream = io.BytesIO()
    writer.write(stream)
    stream.seek(0)
    return PdfReader(stream, strict=True)


class RequiredRasterIllustrationContractTests(unittest.TestCase):
    def test_pages_without_opt_in_remain_backward_compatible(self):
        results, failures = VALIDATOR.required_raster_illustration_report(
            [{"pdfPage": 1, "role": "chapter-opener"}], [], 240
        )
        self.assertEqual(results, [])
        self.assertEqual(failures, [])

    def test_required_page_passes_with_one_opaque_adequate_paint(self):
        results, failures = VALIDATOR.required_raster_illustration_report(
            [required_page()], [paint()], 240
        )
        self.assertEqual(failures, [])
        self.assertEqual(results[0]["status"], "passed")
        self.assertEqual(results[0]["actualPaintCount"], 1)

    def test_required_page_fails_when_no_raster_exists(self):
        results, failures = VALIDATOR.required_raster_illustration_report(
            [required_page()], [], 240
        )
        self.assertEqual(results[0]["status"], "failed")
        self.assertTrue(any("found 0" in failure for failure in failures))

    def test_required_page_fails_duplicate_paint_low_ppi_and_mask(self):
        results, failures = VALIDATOR.required_raster_illustration_report(
            [required_page()],
            [paint(ppi=239, opaque=False), paint(ppi=300)],
            240,
        )
        self.assertEqual(results[0]["status"], "failed")
        self.assertTrue(any("found 2" in failure for failure in failures))
        self.assertTrue(any("non-opaque" in failure for failure in failures))
        self.assertTrue(any("below 240" in failure for failure in failures))

    def test_gate_configuration_cannot_weaken_global_minimum_or_opacity(self):
        page = required_page(minimum_ppi=239)
        page["requiredRasterIllustration"]["requireOpaque"] = False
        results, failures = VALIDATOR.required_raster_illustration_report(
            [page], [paint()], 240
        )
        self.assertEqual(results, [])
        self.assertTrue(any("at least 240" in failure for failure in failures))
        self.assertTrue(any("requireOpaque must be true" in failure for failure in failures))

    def test_cli_rejects_opted_in_page_with_no_raster_paint(self):
        page_map = json.loads(
            (PACKAGE_ROOT / "references/specimen/canonical-page-map.json").read_text(
                encoding="utf-8"
            )
        )
        page_map["pages"][0]["requiredRasterIllustration"] = {
            "paintCount": 1,
            "minimumEffectivePpi": 240,
            "requireOpaque": True,
        }
        with tempfile.TemporaryDirectory(prefix="illustration-gate-") as directory:
            page_map_path = Path(directory) / "page-map.json"
            page_map_path.write_text(json.dumps(page_map), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(VALIDATOR_PATH),
                    "--pdf",
                    str(SPECIMEN_PATH),
                    "--page-map",
                    str(page_map_path),
                    "--profile",
                    "specimen",
                ],
                cwd=PACKAGE_ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
        report = json.loads(result.stdout)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["stats"]["requiredRasterIllustrationPages"], 1)
        self.assertTrue(any("found 0" in failure for failure in report["failures"]))


class RasterPaintExtractionTests(unittest.TestCase):
    def test_repeated_do_operations_count_as_distinct_paints(self):
        paints = VALIDATOR.raster_image_paints(reader_with_repeated_image_paints(2))
        self.assertEqual(len(paints), 2)
        self.assertEqual({entry["xPpi"] for entry in paints}, {300.0})
        self.assertEqual({entry["yPpi"] for entry in paints}, {300.0})

    def test_canonical_specimen_has_one_opaque_opener_paint(self):
        paints = [
            entry
            for entry in VALIDATOR.raster_image_paints(
                PdfReader(SPECIMEN_PATH, strict=True)
            )
            if entry["page"] == 4
        ]
        self.assertEqual(len(paints), 1)
        self.assertTrue(paints[0]["opaque"])
        self.assertGreaterEqual(min(paints[0]["xPpi"], paints[0]["yPpi"]), 300)

    def test_soft_mask_is_detected_on_a_painted_image(self):
        paints = VALIDATOR.raster_image_paints(
            reader_with_repeated_image_paints(1, with_soft_mask=True)
        )
        self.assertEqual(len(paints), 1)
        self.assertTrue(paints[0]["hasSMask"])
        self.assertFalse(paints[0]["opaque"])


if __name__ == "__main__":
    unittest.main()
