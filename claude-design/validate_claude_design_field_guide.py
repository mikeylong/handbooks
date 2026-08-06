from __future__ import annotations

import re
import sys
from pathlib import Path

import pdfplumber
from PIL import Image
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent
PDF_PATH = ROOT / "Claude_Design_End_to_End_Field_Guide.pdf"
ART_DIR = ROOT / "assets" / "chapter-art" / "pdf"
ORIGINAL_ART_DIR = ROOT / "assets" / "chapter-art" / "original"
EXPECTED_SIZE = (419.528, 595.276)
EXPECTED_PAGES = 109
EXPECTED_PROMPT_PANELS = 28
EXPECTED_PROMPT_HEADER_INSTANCES = 31
DARK_PROMPT_COLOR = (0.14902, 0.14902, 0.141176)
PALE_PROMPT_COLOR = (0.956863, 0.956863, 0.945098)
CHAPTERS = {
    7: ("01", "Decide what is authoritative"),
    14: ("02", "Prepare Simple Design System"),
    21: ("03", "Validate the imported system"),
    27: ("04", "Extend the existing screen"),
    34: ("05", "Design the adjacent surfaces"),
    41: ("06", "Specify states and transitions"),
    48: ("07", "Prove responsive and accessible behavior"),
    54: ("08", "Run the design evidence gate"),
    60: ("09", "Hand off to Claude Code and developers"),
    68: ("10", "Implement, verify, and reconcile"),
    75: ("11", "Guided capstone"),
}


def fail(message: str) -> None:
    raise AssertionError(message)


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def outline_titles(items: list[object]) -> list[str]:
    titles: list[str] = []
    for item in items:
        if isinstance(item, list):
            titles.extend(outline_titles(item))
        else:
            title = getattr(item, "title", None)
            if title is None and isinstance(item, dict):
                title = item.get("/Title")
            if title:
                titles.append(str(title))
    return titles


def page_images(page: object) -> list[dict[str, object]]:
    resources = page.get("/Resources", {}).get_object()
    xobjects = resources.get("/XObject")
    if not xobjects:
        return []
    images: list[dict[str, object]] = []
    for name, reference in xobjects.get_object().items():
        obj = reference.get_object()
        if obj.get("/Subtype") == "/Image":
            images.append(
                {
                    "name": str(name),
                    "width": int(obj["/Width"]),
                    "height": int(obj["/Height"]),
                    "bits": int(obj.get("/BitsPerComponent", 0)),
                    "color": str(obj.get("/ColorSpace")),
                }
            )
    return images


def _color_matches(value: object, expected: tuple[float, float, float], tolerance: float = 0.002) -> bool:
    if not isinstance(value, (tuple, list)) or len(value) != 3:
        return False
    return all(abs(float(actual) - target) <= tolerance for actual, target in zip(value, expected))


def _intersection(a: dict[str, object], b: dict[str, object]) -> tuple[float, float]:
    return (
        min(float(a["x1"]), float(b["x1"])) - max(float(a["x0"]), float(b["x0"])),
        min(float(a["bottom"]), float(b["bottom"])) - max(float(a["top"]), float(b["top"])),
    )


def validate_geometry() -> dict[str, int]:
    source_prompt_panels = len(re.findall(r"^::: prompt ", (ROOT / "Claude_Design_Field_Guide_Source.md").read_text(encoding="utf-8"), flags=re.MULTILINE))
    require(source_prompt_panels == EXPECTED_PROMPT_PANELS, f"Expected {EXPECTED_PROMPT_PANELS} source prompt panels, found {source_prompt_panels}")
    prompt_header_instances = 0
    checked_objects = 0
    checked_words = 0

    with pdfplumber.open(PDF_PATH) as document:
        require(len(document.pages) == EXPECTED_PAGES, f"Geometry reader found {len(document.pages)} pages")
        for page_number, page in enumerate(document.pages, start=1):
            width = float(page.width)
            height = float(page.height)

            for object_kind in ("chars", "lines", "rects", "curves", "images"):
                for item in getattr(page, object_kind):
                    checked_objects += 1
                    require(float(item["x0"]) >= -0.05, f"Page {page_number} {object_kind} extends past the left edge")
                    require(float(item["x1"]) <= width + 0.05, f"Page {page_number} {object_kind} extends past the right edge")
                    require(float(item["top"]) >= -0.05, f"Page {page_number} {object_kind} extends past the top edge")
                    require(float(item["bottom"]) <= height + 0.05, f"Page {page_number} {object_kind} extends past the bottom edge")

            words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
            checked_words += len(words)
            for index, first in enumerate(words):
                for second in words[index + 1:]:
                    overlap_x, overlap_y = _intersection(first, second)
                    require(
                        not (overlap_x > 0.5 and overlap_y > 0.5),
                        f"Page {page_number} overlapping words: {first['text']!r} and {second['text']!r}",
                    )

            for image in page.images:
                for word in words:
                    overlap_x, overlap_y = _intersection(image, word)
                    require(
                        not (overlap_x > 0.5 and overlap_y > 0.5),
                        f"Page {page_number} image overlaps word {word['text']!r}",
                    )

            for line in page.lines:
                # ReportLab link underlines are zero-width text decoration, not layout rules.
                if float(line.get("linewidth", 0)) <= 0.05:
                    continue
                line_top = float(line["top"])
                line_bottom = float(line["bottom"])
                line_x0 = float(line["x0"])
                line_x1 = float(line["x1"])
                for word in words:
                    word_x0 = float(word["x0"])
                    word_x1 = float(word["x1"])
                    word_top = float(word["top"])
                    word_bottom = float(word["bottom"])
                    if abs(line_top - line_bottom) <= 0.2:
                        crosses = min(line_x1, word_x1) - max(line_x0, word_x0) > 1 and word_top + 0.5 < line_top < word_bottom - 0.5
                    elif abs(line_x1 - line_x0) <= 0.2:
                        crosses = min(line_bottom, word_bottom) - max(line_top, word_top) > 1 and word_x0 + 0.5 < line_x0 < word_x1 - 0.5
                    else:
                        crosses = False
                    require(not crosses, f"Page {page_number} rule crosses word {word['text']!r}")

            filled_rects = [rectangle for rectangle in page.rects if rectangle.get("fill")]
            for rectangle in filled_rects:
                for word in words:
                    overlap_x, _ = _intersection(rectangle, word)
                    if overlap_x <= 1:
                        continue
                    for boundary in (float(rectangle["top"]), float(rectangle["bottom"])):
                        require(
                            not (float(word["top"]) + 0.5 < boundary < float(word["bottom"]) - 0.5),
                            f"Page {page_number} filled-panel boundary crosses word {word['text']!r}",
                        )

            dark_panels = [
                rectangle for rectangle in filled_rects
                if float(rectangle["width"]) > 300 and _color_matches(rectangle.get("non_stroking_color"), DARK_PROMPT_COLOR)
            ]
            pale_panels = [
                rectangle for rectangle in filled_rects
                if float(rectangle["width"]) > 300 and _color_matches(rectangle.get("non_stroking_color"), PALE_PROMPT_COLOR)
            ]
            for dark_panel in dark_panels:
                white_heading_chars = [
                    character for character in page.chars
                    if float(character["x0"]) >= float(dark_panel["x0"])
                    and float(character["x1"]) <= float(dark_panel["x1"])
                    and float(character["top"]) >= float(dark_panel["top"])
                    and float(character["bottom"]) <= float(dark_panel["bottom"])
                    and _color_matches(character.get("non_stroking_color"), (1.0, 1.0, 1.0))
                ]
                if not white_heading_chars:
                    # A split-in-row continuation can paint a dark body underlay with no label.
                    continue
                matches = [
                    pale_panel for pale_panel in pale_panels
                    if abs(float(dark_panel["x0"]) - float(pale_panel["x0"])) <= 0.05
                    and abs(float(dark_panel["x1"]) - float(pale_panel["x1"])) <= 0.05
                    and (
                        (
                            abs(float(dark_panel["bottom"]) - float(pale_panel["bottom"])) <= 0.05
                            and float(dark_panel["top"]) < float(pale_panel["top"])
                        )
                        or abs(float(dark_panel["bottom"]) - float(pale_panel["top"])) <= 0.05
                    )
                ]
                require(len(matches) == 1, f"Page {page_number} prompt panel has no unique pale body")
                pale_panel = matches[0]
                seam = float(pale_panel["top"])
                require(16 <= seam - float(dark_panel["top"]) <= 22, f"Page {page_number} prompt header height is invalid")

                panel_chars = [
                    character for character in page.chars
                    if float(character["x0"]) >= float(dark_panel["x0"])
                    and float(character["x1"]) <= float(dark_panel["x1"])
                    and float(character["top"]) >= float(dark_panel["top"])
                    and float(character["bottom"]) <= float(pale_panel["bottom"])
                ]
                heading_chars = [character for character in panel_chars if float(character["bottom"]) <= seam]
                body_chars = [character for character in panel_chars if float(character["top"]) >= seam]
                require(heading_chars and body_chars, f"Page {page_number} prompt panel is missing heading or body text")
                require(max(float(character["bottom"]) for character in heading_chars) <= seam - 3, f"Page {page_number} prompt body collides with heading")
                require(min(float(character["top"]) for character in body_chars) >= seam + 3, f"Page {page_number} prompt heading collides with body")
                prompt_header_instances += 1

    require(
        prompt_header_instances == EXPECTED_PROMPT_HEADER_INSTANCES,
        f"Expected {EXPECTED_PROMPT_HEADER_INSTANCES} rendered prompt headers, found {prompt_header_instances}",
    )
    return {
        "objects": checked_objects,
        "words": checked_words,
        "prompt_panels": source_prompt_panels,
        "prompt_headers": prompt_header_instances,
    }


def validate_pdf() -> dict[str, object]:
    require(PDF_PATH.exists(), f"Missing PDF: {PDF_PATH}")
    reader = PdfReader(PDF_PATH)
    require(len(reader.pages) == EXPECTED_PAGES, f"Expected {EXPECTED_PAGES} pages, found {len(reader.pages)}")

    page_texts: list[str] = []
    raster_images: list[tuple[int, dict[str, object]]] = []
    uri_links: set[str] = set()
    internal_links = 0

    for page_number, page in enumerate(reader.pages, start=1):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        require(abs(width - EXPECTED_SIZE[0]) < 0.02, f"Page {page_number} width is {width}")
        require(abs(height - EXPECTED_SIZE[1]) < 0.02, f"Page {page_number} height is {height}")
        require(int(page.get("/Rotate", 0)) == 0, f"Page {page_number} is rotated")

        text = normalized(page.extract_text() or "")
        require(len(text) >= 35, f"Page {page_number} appears blank or extraction-poor: {len(text)} chars")
        require("\x00" not in text and "\ufffd" not in text, f"Page {page_number} contains a missing-glyph marker")
        require("<!--" not in text and "DIAGRAM" not in text, f"Page {page_number} exposes a source marker")
        page_texts.append(text)

        for image in page_images(page):
            raster_images.append((page_number, image))

        for annotation_ref in page.get("/Annots", []):
            annotation = annotation_ref.get_object()
            if annotation.get("/Subtype") != "/Link":
                continue
            action = annotation.get("/A")
            if action and action.get("/URI"):
                uri_links.add(str(action["/URI"]))
            elif annotation.get("/Dest") or action:
                internal_links += 1

    for page_number, (chapter_number, title) in CHAPTERS.items():
        text = page_texts[page_number - 1]
        require(f"CHAPTER {chapter_number}" in text, f"Chapter marker missing on page {page_number}")
        require(title in text, f"Chapter title missing on page {page_number}: {title}")

    required_document_text = (
        "The workflow at a glance",
        "Keep the product surfaces on one state spine",
        "Appendix A - Prompt sequence",
        "Appendix B - Handoff README template",
        "Appendix C - Final validation checklist",
        "Appendix D - Simple Design System reference",
        "Appendix E - Product boundaries and operating risks",
    )
    all_text = " ".join(page_texts)
    for phrase in required_document_text:
        require(phrase in all_text, f"Required section missing: {phrase}")
    require("Export -> Hand off to Claude Code" in all_text, "The export handoff instruction is missing or has a bad arrow glyph")

    expected_image_pages = list(CHAPTERS)
    actual_image_pages = [page_number for page_number, _ in raster_images]
    require(actual_image_pages == expected_image_pages, f"Unexpected raster-image pages: {actual_image_pages}")
    for page_number, image in raster_images:
        require((image["width"], image["height"]) == (1200, 686), f"Page {page_number} image size: {image}")
        require(image["bits"] == 8, f"Page {page_number} image bit depth: {image}")
        require(image["color"] == "/DeviceGray", f"Page {page_number} image color space: {image}")

    titles = outline_titles(reader.outline)
    for _, (chapter_number, title) in CHAPTERS.items():
        require(f"{chapter_number}. {title}" in titles, f"Bookmark missing: {chapter_number}. {title}")
    require(len(titles) >= 90, f"Expected a detailed outline, found {len(titles)} entries")
    require(len(uri_links) >= 10, f"Expected at least 10 external source links, found {len(uri_links)}")

    return {
        "pages": len(reader.pages),
        "outline_entries": len(titles),
        "external_links": len(uri_links),
        "internal_links": internal_links,
        "image_pages": actual_image_pages,
    }


def validate_assets() -> dict[str, object]:
    expected = [ART_DIR / f"chapter-{number:02d}.png" for number in range(1, 12)]
    actual = sorted(ART_DIR.glob("chapter-*.png"))
    require(actual == expected, "The PDF art directory must contain exactly chapter-01.png through chapter-11.png")

    expected_originals = [ORIGINAL_ART_DIR / f"chapter-{number:02d}.png" for number in range(1, 12)]
    actual_originals = sorted(ORIGINAL_ART_DIR.glob("chapter-*.png"))
    require(actual_originals == expected_originals, "The original art directory must contain exactly chapter-01.png through chapter-11.png")
    for path in actual_originals:
        with Image.open(path) as image:
            require(image.mode == "RGB", f"{path.name} original must be RGB, found {image.mode}")
            require(image.width >= 1600 and image.height >= 900, f"{path.name} original is unexpectedly small: {image.size}")
        require(b"c2pa" in path.read_bytes(), f"{path.name} original does not contain its C2PA manifest")

    for path in actual:
        with Image.open(path) as image:
            require(image.mode == "L", f"{path.name} must be grayscale, found {image.mode}")
            require(image.size == (1200, 686), f"{path.name} has size {image.size}")
            dpi = image.info.get("dpi", (0, 0))
            require(min(dpi) >= 279.5, f"{path.name} has insufficient DPI metadata: {dpi}")
            border = (
                list(image.crop((0, 0, image.width, 1)).get_flattened_data())
                + list(image.crop((0, image.height - 1, image.width, image.height)).get_flattened_data())
                + list(image.crop((0, 0, 1, image.height)).get_flattened_data())
                + list(image.crop((image.width - 1, 0, image.width, image.height)).get_flattened_data())
            )
            require(min(border) == 255, f"{path.name} does not have a pure-white outer edge")

    record = ROOT / "assets" / "chapter-art" / "GENERATION_RECORD.md"
    require(record.exists(), "Missing exact ImageGen generation record")
    record_text = record.read_text(encoding="utf-8")
    for number in range(1, 12):
        require(f"### Chapter {number}" in record_text, f"Generation record is missing Chapter {number}")

    return {"assets": len(actual), "originals": len(actual_originals), "size": "1200x686", "mode": "grayscale", "dpi": 280}


def main() -> None:
    try:
        pdf = validate_pdf()
        geometry = validate_geometry()
        assets = validate_assets()
    except (AssertionError, OSError, ValueError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print("PASS: Claude Design Field Guide validation")
    print(f"  pages: {pdf['pages']} A5 pages")
    print(f"  outline: {pdf['outline_entries']} entries")
    print(f"  links: {pdf['external_links']} external, {pdf['internal_links']} internal")
    print(
        f"  geometry: {geometry['objects']} objects and {geometry['words']} words checked; "
        f"{geometry['prompt_panels']} logical prompts / {geometry['prompt_headers']} rendered headers clean"
    )
    print(f"  chapter images: {assets['assets']} derivatives from {assets['originals']} C2PA originals on pages {pdf['image_pages']}")
    print(f"  image spec: {assets['size']} {assets['mode']} at {assets['dpi']} ppi")


if __name__ == "__main__":
    main()
