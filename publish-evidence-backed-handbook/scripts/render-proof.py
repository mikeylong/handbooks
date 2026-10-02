#!/usr/bin/env python3
"""Render every PDF page and optionally create a contact sheet."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from runtime_support import display_path, find_program, safe_output_dir

PACKAGE_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--dpi", type=int, default=144)
    parser.add_argument("--contact-sheet", action="store_true")
    args = parser.parse_args()

    pdf_input = args.pdf.expanduser()
    if pdf_input.is_symlink():
        raise SystemExit(f"PDF cannot be a symlink: {pdf_input}")
    pdf = pdf_input.resolve()
    if not pdf.is_file():
        raise SystemExit(f"PDF must be a regular, non-symlink file: {pdf}")
    if args.dpi < 72 or args.dpi > 600:
        raise SystemExit("--dpi must be between 72 and 600")

    output_dir = safe_output_dir(args.output_dir, "Output directory")
    for stale in output_dir.glob("page-*.png"):
        if stale.is_symlink():
            raise SystemExit(f"Refusing to replace symlinked proof image: {stale}")
        stale.unlink()
    stale_contact_sheet = output_dir / "contact-sheet.png"
    if stale_contact_sheet.exists():
        if stale_contact_sheet.is_symlink():
            raise SystemExit(
                f"Refusing to replace symlinked contact sheet: {stale_contact_sheet}"
            )
        stale_contact_sheet.unlink()

    pdftoppm = find_program("pdftoppm")
    assert pdftoppm is not None
    prefix = output_dir / "page"
    subprocess.run(
        [pdftoppm, "-png", "-r", str(args.dpi), str(pdf), str(prefix)],
        check=True,
    )
    images = sorted(output_dir.glob("page-*.png"))
    if not images:
        raise SystemExit("Renderer produced no page images")

    contact_sheet = None
    if args.contact_sheet:
        magick = find_program("magick")
        assert magick is not None
        contact_sheet = output_dir / "contact-sheet.png"
        subprocess.run(
            [
                magick,
                "montage",
                "-font",
                str(PACKAGE_ROOT / "assets/design-system/fonts/NotoSans-Regular.ttf"),
                *[str(path) for path in images],
                "-thumbnail",
                "300x420",
                "-tile",
                "4x",
                "-geometry",
                "+14+18",
                "-background",
                "#d8d8d8",
                "-depth",
                "8",
                str(contact_sheet),
            ],
            check=True,
        )

    print(
        json.dumps(
            {
                "pdf": display_path(pdf, bases=(Path.cwd(),)),
                "dpi": args.dpi,
                "pages": len(images),
                "outputDirectory": display_path(output_dir, bases=(Path.cwd(),)),
                "contactSheet": contact_sheet.name if contact_sheet else None,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
