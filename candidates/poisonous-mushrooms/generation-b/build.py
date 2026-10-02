#!/usr/bin/env python3
"""Build and finalize the poisonous-mushroom safety handbook candidate."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.constants import PageLabelStyle


PACKAGE_ROOT = Path(
    os.environ.get(
        "HANDBOOK_PUBLISHING_TOOLKIT",
        str(Path(__file__).resolve().parents[3] / "publish-evidence-backed-handbook"),
    )
).expanduser().resolve()
CANDIDATE_ROOT = Path(__file__).resolve().parent
SOURCE = CANDIDATE_ROOT / "source" / "handbook.html"
PAGE_MAP = CANDIDATE_ROOT / "candidate-page-map.json"
OUTPUT = (
    CANDIDATE_ROOT
    / "output"
    / "pdf"
    / "poisonous-mushroom-identification-handbook-generation-b.pdf"
)
sys.path.insert(0, str(PACKAGE_ROOT / "scripts"))

from runtime_support import find_browser, sha256_file  # noqa: E402


OUTLINES = [
    ("Premise", 1),
    ("Contents", 2),
    ("1. Draw the Safety Boundary", 3),
    ("2. Build an Evidence Packet", 6),
    ("3. Recognize High-Risk Patterns", 9),
    ("4. Treat Time as a Triage Signal", 13),
    ("Notes and Sources", 17),
    ("Index of Terms", 19),
]


def render_html(source: Path, destination: Path) -> None:
    browser = find_browser()
    command = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--allow-file-access-from-files",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=5000",
        "--no-pdf-header-footer",
        f"--print-to-pdf={destination}",
        source.as_uri(),
    ]
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0 or not destination.is_file():
        message = (result.stderr or result.stdout).strip()
        raise SystemExit(f"Browser PDF rendering failed: {message}")


def finalize(raw_pdf: Path, output: Path) -> None:
    page_map = json.loads(PAGE_MAP.read_text(encoding="utf-8"))
    expected_pages = len(page_map["pages"])
    reader = PdfReader(raw_pdf, strict=True)
    if len(reader.pages) != expected_pages:
        raise SystemExit(
            f"Rendered page count {len(reader.pages)} does not match page map {expected_pages}"
        )

    writer = PdfWriter(clone_from=reader)
    writer.pdf_header = reader.pdf_header
    writer.add_metadata(
        {
            "/Title": "Poisonous Mushrooms: A Safety-First Field Handbook",
            "/Author": "Evidence-backed research candidate",
            "/Subject": "Recognizing mushroom risk, documenting specimens, and responding to exposure",
            "/Keywords": "mushrooms, poison safety, identification, foraging, poison control",
            "/Creator": "Publish Evidence-Backed Handbook workflow",
            "/DesignSystemVersion": "1.0.0",
            "/Variant": "Generation B - open-image fallback",
            "/CreationDate": "D:20260828000000-07'00'",
            "/ModDate": "D:20260828000000-07'00'",
        }
    )
    writer.set_page_label(0, 0, prefix="Cover")
    writer.set_page_label(1, 2, style=PageLabelStyle.LOWERCASE_ROMAN, start=2)
    writer.set_page_label(3, len(writer.pages) - 1, style=PageLabelStyle.DECIMAL, start=1)
    writer.page_mode = "/UseOutlines"
    writer.create_viewer_preferences().display_doctitle = True
    for title, page_index in OUTLINES:
        writer.add_outline_item(title, page_index)
    writer._ID = None

    output.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(
        prefix=f".{output.name}.", suffix=".tmp", dir=output.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(handle, "wb") as stream:
            writer.write(stream)
        os.replace(temporary, output)
    finally:
        if temporary.exists():
            temporary.unlink()


def main() -> None:
    if SOURCE.is_symlink() or PAGE_MAP.is_symlink():
        raise SystemExit("Candidate source and page map must not be symlinks")
    if not SOURCE.is_file() or not PAGE_MAP.is_file():
        raise SystemExit("Candidate source or page map is missing")
    with tempfile.TemporaryDirectory(prefix="poisonous-mushroom-handbook-") as temp_dir:
        raw_pdf = Path(temp_dir) / "raw.pdf"
        render_html(SOURCE, raw_pdf)
        finalize(raw_pdf, OUTPUT)
    print(
        json.dumps(
            {
                "status": "built",
                "output": str(OUTPUT),
                "pages": len(PdfReader(OUTPUT, strict=True).pages),
                "sha256": sha256_file(OUTPUT),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
