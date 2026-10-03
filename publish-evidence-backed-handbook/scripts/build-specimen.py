#!/usr/bin/env python3
"""Build and finalize the canonical handbook design-system specimen."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlencode

from pypdf import PdfReader, PdfWriter
from pypdf.constants import PageLabelStyle

from runtime_support import (
    atomic_write_text,
    display_path,
    find_browser,
    safe_output_file,
)


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SOURCE = PACKAGE_ROOT / "references/specimen/source/specimen.html"
DEFAULT_PAGE_MAP = PACKAGE_ROOT / "references/specimen/canonical-page-map.json"
CANONICAL_OUTPUT = PACKAGE_ROOT / "references/specimen/canonical-handbook-specimen.pdf"


def regular_file(path: Path, label: str) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise SystemExit(f"{label} cannot be a symlink: {expanded}")
    resolved = expanded.resolve()
    if not resolved.is_file():
        raise SystemExit(f"{label} must be a regular, non-symlink file: {resolved}")
    return resolved


def render_html(
    browser: str,
    source: Path,
    destination: Path,
    disable_browser_sandbox: bool,
    changelog_mode: str,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    module = os.environ.get('HANDBOOK_PLAYWRIGHT_MODULE')
    if not module: raise SystemExit('Set HANDBOOK_PLAYWRIGHT_MODULE to a pinned Playwright installation')
    from pdf_theme import theme_tokens
    from PIL import Image, ImageOps
    theme = os.environ.get('HANDBOOK_SPECIMEN_THEME','light')
    html = source.read_text()
    import re
    html = re.sub(r'(href|src)="([^":#]+)"',lambda m:m[1]+'="'+(source.parent/m[2]).resolve().as_uri()+'"',html)
    if theme == 'dark':
        art = PACKAGE_ROOT/'assets/design-system/dark-illustration-foreground.png'
        image = Image.open(art).convert('RGBA')
        frame = Image.open(PACKAGE_ROOT/'assets/design-system/illustration-reference.webp').size
        image = ImageOps.contain(image,frame,Image.Resampling.LANCZOS)
        plate=Image.new('RGBA',frame,theme_tokens(theme)['paper'])
        plate.alpha_composite(image,((frame[0]-image.width)//2,(frame[1]-image.height)//2))
        derivative=destination.parent/'dark-reference.png';plate.convert('RGB').save(derivative)
        html=html.replace((PACKAGE_ROOT/'assets/design-system/illustration-reference.webp').as_uri(),derivative.as_uri())
    isolated=destination.parent/'specimen.html';isolated.write_text(html)
    css=destination.parent/'theme.css'
    result=subprocess.run(['node','--input-type=module','-e',"import {pdfThemeCss} from './scripts/pdf-css.mjs';process.stdout.write(pdfThemeCss(process.argv[1]));",theme],cwd=PACKAGE_ROOT,capture_output=True,text=True,check=True)
    css.write_text(result.stdout)
    command=['node',str(PACKAGE_ROOT/'scripts/render-chromium-pdf.mjs'),'--browser',browser,'--html',str(isolated),'--output',str(destination),'--theme',theme,'--theme-css',str(css),'--playwright-module',module,'--query',urlencode({'changelog':changelog_mode})]
    subprocess.run(command,check=True)


def effective_page_map(page_map_path: Path, changelog_mode: str) -> dict:
    page_map = json.loads(page_map_path.read_text(encoding="utf-8"))
    pages = page_map.get("pages")
    if not isinstance(pages, list) or not pages:
        raise SystemExit("The canonical page map has no pages")
    if changelog_mode == "omit":
        pages = [page for page in pages if not page.get("conditional")]
    result = dict(page_map)
    result["pages"] = pages
    result["changelogMode"] = changelog_mode
    result["artifactProfile"] = (
        "design-specimen" if changelog_mode == "include" else "candidate-fixture"
    )
    return result


def finalize(raw_pdf: Path, output: Path, page_map: dict) -> None:
    pages = page_map["pages"]

    reader = PdfReader(raw_pdf, strict=True)
    if len(reader.pages) != len(pages):
        raise SystemExit(
            f"Rendered page count {len(reader.pages)} does not match page map {len(pages)}"
        )

    writer = PdfWriter(clone_from=reader)
    # The governed page map supplies specimen outlines, as in the retained baseline.
    writer._root_object.pop("/Outlines", None)
    writer.pdf_header = reader.pdf_header
    writer.add_metadata(
        {
            "/Title": "Canonical Handbook Design System Specimen · "+ __import__('pdf_theme').theme_tokens(os.environ.get('HANDBOOK_SPECIMEN_THEME','light'))['displayName'],
            "/Author": "Reusable handbook production system",
            "/Subject": "Editorial technical handbook design-system reference",
            "/Keywords": "handbook, editorial design, PDF, evidence, publishing",
            "/Creator": "Reusable HTML and PDF toolchain",
            "/DesignSystemVersion": str(page_map["designSystemVersion"]),
            "/CreationDate": "D:20260827000000Z",
            "/ModDate": "D:20260827000000Z",
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

    for index, page in enumerate(pages):
        role = str(page.get("role", f"page-{index + 1}"))
        title = role.replace("-", " ").title()
        writer.add_outline_item(title, index)

    # Discard the browser's time-varying file identifier. pypdf will derive a
    # fresh identifier from the normalized document structure while writing.
    writer._ID = None

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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--page-map", type=Path, default=DEFAULT_PAGE_MAP)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--theme",choices=("light","dark"),default="light")
    parser.add_argument("--playwright-module")
    parser.add_argument("--browser", help="Path to a Chromium-family browser executable")
    parser.add_argument(
        "--disable-browser-sandbox",
        action="store_true",
        help="Disable the browser sandbox only inside an already isolated runner",
    )
    parser.add_argument(
        "--update-canonical",
        action="store_true",
        help="Allow writing the package's canonical specimen path",
    )
    parser.add_argument(
        "--changelog-mode",
        choices=("include", "omit"),
        default="include",
        help="Build the conditional changelog specimen or a compliant unchanged-edition fixture",
    )
    parser.add_argument(
        "--page-map-output",
        type=Path,
        help="Write the candidate-specific page map used for this build",
    )
    args = parser.parse_args()

    os.environ['HANDBOOK_SPECIMEN_THEME']=args.theme
    if args.playwright_module: os.environ['HANDBOOK_PLAYWRIGHT_MODULE']=args.playwright_module
    source = regular_file(args.source, "Specimen source")
    page_map = regular_file(args.page_map, "Page map")
    output = safe_output_file(args.output, "Output")
    if output == CANONICAL_OUTPUT.resolve() and not args.update_canonical:
        raise SystemExit(
            "Refusing to update the canonical specimen without --update-canonical"
        )
    if output.exists() and not args.update_canonical: raise SystemExit('Refusing to overwrite an existing specimen')
    if args.theme=='dark' and output==CANONICAL_OUTPUT.resolve():raise SystemExit('Canonical Light specimen is frozen')
    browser = find_browser(args.browser)
    page_map_data = effective_page_map(page_map, args.changelog_mode)
    if output == CANONICAL_OUTPUT.resolve() and args.changelog_mode != "include":
        raise SystemExit("The canonical specimen must include the conditional design example")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="handbook-specimen-") as temp_dir:
        raw_pdf = Path(temp_dir) / "raw.pdf"
        render_html(
            browser,
            source,
            raw_pdf,
            args.disable_browser_sandbox,
            args.changelog_mode,
        )
        finalize(raw_pdf, output, page_map_data)

    page_map_output = None
    if args.page_map_output:
        page_map_output = safe_output_file(args.page_map_output, "Page-map output")
        atomic_write_text(
            page_map_output,
            json.dumps(page_map_data, indent=2) + "\n",
            label="Page-map output",
        )

    print(
        json.dumps(
            {
                "output": display_path(output, bases=(Path.cwd(),)),
                "pages": len(PdfReader(output).pages),
                "changelogMode": args.changelog_mode,
                "pageMap": (
                    display_path(page_map_output, bases=(Path.cwd(),))
                    if page_map_output
                    else None
                ),
            }
        )
    )


if __name__ == "__main__":
    main()
