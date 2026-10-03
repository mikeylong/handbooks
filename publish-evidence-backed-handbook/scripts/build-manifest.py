#!/usr/bin/env python3
"""Build a reproducibility manifest for the canonical design-system specimen."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import subprocess
from pathlib import Path

import pypdf
from pypdf import PdfReader

from runtime_support import (
    atomic_write_text,
    display_path,
    find_browser,
    safe_output_file,
)


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_MANIFEST = PACKAGE_ROOT / "references/specimen/manifest.json"


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative(path: Path) -> str:
    return path.resolve().relative_to(PACKAGE_ROOT).as_posix()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf",
        type=Path,
        default=PACKAGE_ROOT / "references/specimen/canonical-handbook-specimen.pdf",
    )
    parser.add_argument("--browser", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--update-canonical", action="store_true")
    args = parser.parse_args()

    pdf = args.pdf.expanduser().resolve()
    if not pdf.is_file():
        raise SystemExit(f"Missing specimen PDF: {pdf}")
    output = safe_output_file(args.output, "Manifest output")
    if output == CANONICAL_MANIFEST.resolve() and not args.update_canonical:
        raise SystemExit("Refusing to update canonical manifest without --update-canonical")

    page_map_path = PACKAGE_ROOT / "references/specimen/canonical-page-map.json"
    page_map = json.loads(page_map_path.read_text(encoding="utf-8"))
    spec = json.loads((PACKAGE_ROOT / "handbook-spec.json").read_text(encoding="utf-8"))
    tracked = [
        PACKAGE_ROOT / ".gitattributes",
        PACKAGE_ROOT / ".gitignore",
        PACKAGE_ROOT / "README.md",
        PACKAGE_ROOT / "SKILL.md",
        PACKAGE_ROOT / "handbook-spec.json",
        PACKAGE_ROOT / "requirements.txt",
        *sorted((PACKAGE_ROOT / "references").glob("*.md")),
        PACKAGE_ROOT / "references/specimen/source/specimen.html",
        page_map_path,
        PACKAGE_ROOT / "references/specimen/validation.json",
        PACKAGE_ROOT / "references/specimen/compatibility-matrix.json",
        PACKAGE_ROOT / "references/specimen/workflow-regression.json",
        *sorted((PACKAGE_ROOT / "scripts").rglob("*")),
        *sorted((PACKAGE_ROOT / "assets/reader").rglob("*")),
        PACKAGE_ROOT / "assets/design-system/dark-illustration-reference.png",
        PACKAGE_ROOT / "assets/design-system/dark-illustration-foreground.png",
        PACKAGE_ROOT / "assets/design-system/dark-illustration-foreground.json",
        PACKAGE_ROOT / "assets/design-system/tokens.json",
        PACKAGE_ROOT / "assets/design-system/pdf-appearance.json",
        PACKAGE_ROOT / "assets/design-system/print.css",
        PACKAGE_ROOT / "assets/design-system/illustration-reference.webp",
        *sorted((PACKAGE_ROOT / "assets/design-system/templates").glob("*")),
        *sorted((PACKAGE_ROOT / "assets/design-system/diagrams").glob("*")),
        *sorted((PACKAGE_ROOT / "assets/design-system/fonts").glob("*")),
    ]
    tracked = [path for path in tracked if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc"]

    browser = find_browser(str(args.browser) if args.browser else None)
    result = subprocess.run(
        [browser, "--version"], capture_output=True, text=True, check=True
    )
    browser_version = (result.stdout or result.stderr).strip()

    reader = PdfReader(pdf, strict=True)
    dimensions = sorted(
        {
            (round(float(page.mediabox.width), 2), round(float(page.mediabox.height), 2))
            for page in reader.pages
        }
    )
    manifest = {
        "schemaVersion": 1,
        "designSystemVersion": spec["designSystemVersion"],
        "artifact": {
            "path": relative(pdf),
            "sha256": hash_file(pdf),
            "pages": len(reader.pages),
            "pageDimensionsPoints": [list(pair) for pair in dimensions],
            "pdfHeader": reader.pdf_header,
            "roles": [page["role"] for page in page_map["pages"]],
        },
        "inputs": {relative(path): hash_file(path) for path in tracked},
        "toolchain": {
            "python": platform.python_version(),
            "pypdf": pypdf.__version__,
            "browser": browser_version or "not recorded",
        },
        "build": {
            "preflight": "python3 scripts/preflight.py",
            "command": "python3 scripts/build-specimen.py --changelog-mode include --output references/specimen/canonical-handbook-specimen.pdf --update-canonical",
            "workflowRegression": "python3 scripts/test-edition-workflow.py --output <report.json>",
            "package": "python3 scripts/package-skill.py --output <archive.zip>",
            "ordinaryRunsMayUpdateCanonical": False,
        },
        "visualLineage": {
            "reference": "canonical design-system specimen",
            "note": "The specimen uses neutral content while preserving the approved A5 editorial grammar and PDFKit-safe illustration contract."
        },
    }
    atomic_write_text(
        output,
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        label="Manifest output",
    )
    print(
        json.dumps(
            {"output": display_path(output), "sha256": hash_file(pdf)}, indent=2
        )
    )


if __name__ == "__main__":
    main()
