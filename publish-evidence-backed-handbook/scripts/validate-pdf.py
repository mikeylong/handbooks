#!/usr/bin/env python3
"""Validate portable handbook PDF structure and print-safety invariants."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlparse

from pypdf import PdfReader

from runtime_support import (
    atomic_write_text,
    display_path,
    find_program,
    safe_output_file,
    sha256_file,
)


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SPEC = PACKAGE_ROOT / "handbook-spec.json"
SPECIMEN_PAGE_MAP = PACKAGE_ROOT / "references/specimen/canonical-page-map.json"
CHANGELOG_WORDS = ("changelog", "version history")
NAVIGATION_ROLE_WORDS = ("contents", "index", "navigation")


def flatten_outline(items: Iterable[Any]) -> Iterable[Any]:
    for item in items:
        if isinstance(item, list):
            yield from flatten_outline(item)
        else:
            yield item


def version_tuple(header: str) -> tuple[int, int]:
    match = re.fullmatch(r"%PDF-(\d+)\.(\d+)", header)
    if not match:
        raise ValueError(f"Malformed PDF header: {header}")
    return tuple(int(part) for part in match.groups())  # type: ignore[return-value]


def dereference(value: Any) -> Any:
    return value.get_object() if hasattr(value, "get_object") else value


def image_objects(reader: PdfReader) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    seen: set[tuple[int, int] | int] = set()

    def walk(value: Any, page_number: int) -> None:
        key: tuple[int, int] | int
        if hasattr(value, "idnum"):
            key = (int(value.idnum), int(value.generation))
        else:
            key = id(value)
        if key in seen:
            return
        seen.add(key)
        obj = dereference(value)
        if not hasattr(obj, "get"):
            return
        subtype = str(obj.get("/Subtype", ""))
        if subtype == "/Image":
            found.append(
                {
                    "page": page_number,
                    "hasSMask": obj.get("/SMask") is not None,
                    "hasMask": obj.get("/Mask") is not None,
                    "width": int(obj.get("/Width", 0)),
                    "height": int(obj.get("/Height", 0)),
                }
            )
        resources = obj.get("/Resources")
        if resources:
            xobjects = dereference(resources).get("/XObject")
            if xobjects:
                for child in dereference(xobjects).values():
                    walk(child, page_number)

    for page_number, page in enumerate(reader.pages, start=1):
        resources = page.get("/Resources")
        if not resources:
            continue
        xobjects = dereference(resources).get("/XObject")
        if not xobjects:
            continue
        for value in dereference(xobjects).values():
            walk(value, page_number)
    return found


def font_report(path: Path) -> dict[str, Any]:
    executable = find_program("pdffonts", required=False)
    if not executable:
        return {"available": False, "count": 0, "unembedded": []}
    result = subprocess.run(
        [executable, str(path)], capture_output=True, text=True, check=True
    )
    rows = [line.split() for line in result.stdout.splitlines()[2:] if line.strip()]
    unembedded = [row[0] for row in rows if len(row) >= 5 and row[-5] != "yes"]
    return {"available": True, "count": len(rows), "unembedded": unembedded}


def raster_report(path: Path) -> dict[str, Any]:
    executable = find_program("pdfimages", required=False)
    if not executable:
        return {"available": False, "images": [], "masks": []}
    result = subprocess.run(
        [executable, "-list", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    images: list[dict[str, Any]] = []
    masks: list[dict[str, Any]] = []
    for line in result.stdout.splitlines()[2:]:
        row = line.split()
        if len(row) < 14 or not row[0].isdigit():
            continue
        kind = row[2]
        record = {
            "page": int(row[0]),
            "kind": kind,
            "width": int(row[3]),
            "height": int(row[4]),
            "xPpi": int(row[12]),
            "yPpi": int(row[13]),
        }
        if kind in {"mask", "smask"}:
            masks.append(record)
        elif kind == "image":
            images.append(record)
    return {"available": True, "images": images, "masks": masks}


def link_report(reader: PdfReader) -> dict[str, Any]:
    external: list[str] = []
    internal = 0
    invalid: list[str] = []
    for page in reader.pages:
        annotations = page.get("/Annots") or []
        for annotation_ref in annotations:
            annotation = dereference(annotation_ref)
            if str(annotation.get("/Subtype", "")) != "/Link":
                continue
            action = dereference(annotation.get("/A")) if annotation.get("/A") else None
            if action and str(action.get("/S", "")) == "/URI":
                uri = str(action.get("/URI", ""))
                external.append(uri)
                parsed = urlparse(uri)
                valid = parsed.scheme in {"http", "https"} and bool(parsed.netloc)
                valid = valid or (parsed.scheme == "mailto" and bool(parsed.path))
                if not valid:
                    invalid.append(uri)
            elif annotation.get("/Dest") is not None or (
                action and str(action.get("/S", "")) == "/GoTo"
            ):
                internal += 1
    return {
        "externalCount": len(external),
        "internalCount": internal,
        "invalidExternal": invalid,
    }


def contains_javascript(reader: PdfReader) -> bool:
    root = dereference(reader.trailer["/Root"])
    open_action = dereference(root.get("/OpenAction")) if root.get("/OpenAction") else None
    if open_action and str(open_action.get("/S", "")) == "/JavaScript":
        return True
    names = dereference(root.get("/Names")) if root.get("/Names") else None
    return bool(names and names.get("/JavaScript"))


def normalized_lines(text: str) -> list[str]:
    return [" ".join(line.split()).lower() for line in text.splitlines() if line.strip()]


def changelog_page(text: str, role: str) -> bool:
    if any(word in role for word in CHANGELOG_WORDS):
        return True
    return "changelog" in normalized_lines(text)[:8]


def external_uris_on_pages(reader: PdfReader, page_numbers: set[int]) -> set[str]:
    urls: set[str] = set()
    for number, page in enumerate(reader.pages, start=1):
        if number not in page_numbers:
            continue
        for annotation_ref in page.get("/Annots") or []:
            annotation = dereference(annotation_ref)
            if str(annotation.get("/Subtype", "")) != "/Link":
                continue
            action = dereference(annotation.get("/A")) if annotation.get("/A") else None
            if action and str(action.get("/S", "")) == "/URI":
                urls.add(str(action.get("/URI", "")))
    return urls


def changelog_contract(
    reader: PdfReader,
    page_texts: list[str],
    roles: dict[int, str],
    decision: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    failures: list[str] = []
    if decision.get("status") != "passed":
        failures.append("Changelog decision status is not passed")
    include = bool(decision.get("includeChangelog"))
    required = decision.get("requiredPdfState")
    if not isinstance(required, dict):
        failures.append("Changelog decision is missing requiredPdfState")
        required = {}
    expected_pages = 1 if include else 0
    if required.get("changelogPages") != expected_pages:
        failures.append("Changelog decision requiredPdfState disagrees with includeChangelog")
    expected_entries = decision.get("expectedEntries")
    if not isinstance(expected_entries, list):
        failures.append("Changelog decision expectedEntries must be an array")
        expected_entries = []
    if len(expected_entries) != int(decision.get("entryCount", 0)):
        failures.append("Changelog decision expectedEntries and entryCount disagree")

    changelog_pages = [
        number
        for number, text in enumerate(page_texts, start=1)
        if changelog_page(text, roles.get(number, ""))
    ]
    outline_titles = [
        str(item.get("/Title", "")) for item in flatten_outline(reader.outline)
    ]
    outline_hits = [
        title
        for title in outline_titles
        if any(word in " ".join(title.split()).lower() for word in CHANGELOG_WORDS)
    ]
    navigation_hits: list[dict[str, Any]] = []
    for number, text in enumerate(page_texts, start=1):
        role = roles.get(number, "")
        if not any(word in role for word in NAVIGATION_ROLE_WORDS):
            continue
        hits = [
            line
            for line in normalized_lines(text)
            if any(word in line for word in CHANGELOG_WORDS)
        ]
        if hits:
            navigation_hits.append({"page": number, "role": role, "lines": hits})

    if include:
        if len(changelog_pages) != 1:
            failures.append(f"Decision requires one changelog page; found {changelog_pages}")
        elif changelog_pages[0] != len(page_texts):
            failures.append("Changelog is not the final PDF page")
        if not outline_hits:
            failures.append("Decision requires a changelog outline entry")
        if not navigation_hits:
            failures.append("Decision requires a changelog contents or index entry")
        changelog_text = " ".join(
            " ".join(page_texts[number - 1].split()).lower()
            for number in changelog_pages
        )
        actual_sources = external_uris_on_pages(reader, set(changelog_pages))
        expected_sources: set[str] = set()
        for index, entry in enumerate(expected_entries, start=1):
            if not isinstance(entry, dict):
                failures.append(f"Expected changelog entry {index} is not an object")
                continue
            for field in ("category", "text", "rationale"):
                phrase = entry.get(field)
                if not isinstance(phrase, str) or not phrase.strip():
                    failures.append(f"Expected changelog entry {index} is missing {field}")
                    continue
                if " ".join(phrase.split()).lower() not in changelog_text:
                    failures.append(
                        f"Final changelog is missing entry {index} {field}: {phrase}"
                    )
            sources = entry.get("sources")
            if not isinstance(sources, list) or not sources:
                failures.append(f"Expected changelog entry {index} has no source URLs")
            else:
                expected_sources.update(str(source) for source in sources)
        missing_sources = sorted(expected_sources - actual_sources)
        if missing_sources:
            failures.append(
                f"Final changelog is missing direct source links: {missing_sources}"
            )
    else:
        summary = decision.get("summary")
        expected_summary = "The handbook's reader-facing content is unchanged."
        if summary != expected_summary:
            failures.append(f"Unchanged decision summary must be exactly: {expected_summary}")
        if changelog_pages:
            failures.append(f"Decision forbids changelog pages; found {changelog_pages}")
        if outline_hits:
            failures.append(f"Decision forbids changelog outline entries: {outline_hits}")
        if navigation_hits:
            failures.append(
                f"Decision forbids changelog contents or index entries: {navigation_hits}"
            )
        if expected_entries:
            failures.append("Unchanged decision cannot contain expected changelog entries")

    return (
        {
            "includeChangelog": include,
            "changelogPages": changelog_pages,
            "outlineEntries": outline_hits,
            "navigationEntries": navigation_hits,
            "expectedEntryCount": len(expected_entries),
            "directSourceLinks": sorted(
                external_uris_on_pages(reader, set(changelog_pages))
            ),
        },
        failures,
    )


def write_report(report: dict[str, Any], output: Path | None) -> None:
    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if output:
        output = safe_output_file(output, "Report output")
        atomic_write_text(output, text, label="Report output")
    print(text, end="")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--spec", type=Path, default=DEFAULT_SPEC)
    parser.add_argument("--page-map", type=Path)
    parser.add_argument(
        "--profile", choices=("candidate", "specimen"), default="candidate"
    )
    parser.add_argument("--changelog-decision", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    pdf_input = args.pdf.expanduser()
    if pdf_input.is_symlink():
        raise SystemExit(f"PDF cannot be a symlink: {pdf_input}")
    pdf = pdf_input.resolve()
    if not pdf.is_file():
        raise SystemExit(f"Missing PDF: {pdf}")
    spec = json.loads(args.spec.expanduser().resolve().read_text(encoding="utf-8"))
    pdf_spec = spec["pdf"]
    page_spec = spec["page"]
    illustration_spec = spec["illustration"]

    failures: list[str] = []
    reader = PdfReader(pdf, strict=True)
    page_map_count = None
    roles: dict[int, str] = {}
    if args.page_map:
        page_map_path = args.page_map.expanduser()
        if page_map_path.is_symlink():
            failures.append(f"Page map cannot be a symlink: {page_map_path}")
        else:
            page_map_path = page_map_path.resolve()
            page_map = json.loads(page_map_path.read_text(encoding="utf-8"))
            pages = page_map.get("pages")
            artifact_profile = page_map.get("artifactProfile")
            page_map_count = len(pages) if isinstance(pages, list) else None
            if page_map_count != len(reader.pages):
                failures.append(
                    f"Page map has {page_map_count} pages; PDF has {len(reader.pages)}"
                )
            if isinstance(pages, list):
                roles = {
                    index: str(page.get("role", "")).strip().lower()
                    for index, page in enumerate(pages, start=1)
                }
            if args.profile == "candidate" and page_map_path == SPECIMEN_PAGE_MAP.resolve():
                failures.append("Candidate validation cannot use the canonical specimen page map")
            if args.profile == "candidate" and artifact_profile not in {
                "candidate",
                "candidate-fixture",
            }:
                failures.append(
                    "Candidate page map must declare artifactProfile as candidate or candidate-fixture"
                )
    elif args.profile == "candidate":
        failures.append("Candidate validation requires a candidate-specific page map")
    try:
        actual_version = version_tuple(reader.pdf_header)
        minimum_version = tuple(int(part) for part in pdf_spec["minimumVersion"].split("."))
        if actual_version < minimum_version:
            failures.append(
                f"PDF version {reader.pdf_header} is below {pdf_spec['minimumVersion']}"
            )
    except ValueError as error:
        failures.append(str(error))
        actual_version = (0, 0)

    if pdf_spec.get("forbidEncryption") and reader.is_encrypted:
        failures.append("PDF is encrypted")

    target_width = float(page_spec["widthPoints"])
    target_height = float(page_spec["heightPoints"])
    tolerance = float(page_spec["tolerancePoints"])
    page_dimensions: list[dict[str, float | int]] = []
    blank_pages: list[int] = []
    replacement_glyph_pages: list[int] = []
    page_texts: list[str] = []
    for number, page in enumerate(reader.pages, start=1):
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        page_dimensions.append({"page": number, "width": width, "height": height})
        if abs(width - target_width) > tolerance or abs(height - target_height) > tolerance:
            failures.append(
                f"Page {number} is not {page_spec['standard']}: {width:.2f} x {height:.2f} pt"
            )
        text = page.extract_text() or ""
        page_texts.append(text)
        resources = dereference(page.get("/Resources")) if page.get("/Resources") else {}
        has_xobjects = bool(resources.get("/XObject"))
        contents = page.get_contents()
        content_bytes = contents.get_data() if contents is not None else b""
        if not text.strip() and not has_xobjects and not content_bytes.strip():
            blank_pages.append(number)
        if "\ufffd" in text:
            replacement_glyph_pages.append(number)

    if pdf_spec.get("requireNonblankPages") and blank_pages:
        failures.append(f"Blank pages found: {blank_pages}")
    if replacement_glyph_pages:
        failures.append(f"Replacement glyphs found on pages: {replacement_glyph_pages}")

    metadata = reader.metadata
    if not metadata or not metadata.title:
        failures.append("PDF title metadata is missing")

    outline_count = len(list(flatten_outline(reader.outline)))
    if pdf_spec.get("requireOutline") and outline_count == 0:
        failures.append("PDF outline is required")

    if pdf_spec.get("forbidJavaScript") and contains_javascript(reader):
        failures.append("PDF contains JavaScript")

    fonts = font_report(pdf)
    if pdf_spec.get("requireEmbeddedFonts"):
        if not fonts["available"]:
            failures.append("pdffonts is required to verify embedded fonts")
        elif fonts["unembedded"]:
            failures.append(f"Unembedded fonts: {fonts['unembedded']}")

    rasters = raster_report(pdf)
    minimum_ppi = int(illustration_spec["minimumEffectivePpi"])
    low_resolution = [
        image
        for image in rasters["images"]
        if min(image["xPpi"], image["yPpi"]) < minimum_ppi
    ]
    if pdf_spec.get("forbidImageMasks"):
        if not rasters["available"]:
            failures.append("pdfimages is required to verify image masks")
        elif rasters["masks"]:
            failures.append(f"Image masks or soft masks found: {rasters['masks']}")
        object_masks = [
            item for item in image_objects(reader) if item["hasSMask"] or item["hasMask"]
        ]
        if object_masks:
            failures.append(f"Image objects contain masks: {object_masks}")
    if low_resolution:
        failures.append(
            f"Raster images below {minimum_ppi} effective PPI: {low_resolution}"
        )

    links = link_report(reader)
    if links["invalidExternal"]:
        failures.append(f"Invalid external URLs: {links['invalidExternal']}")

    changelog_validation = None
    if args.profile == "candidate":
        if not args.changelog_decision:
            failures.append("Candidate validation requires a changelog decision")
        else:
            decision_path = args.changelog_decision.expanduser()
            if decision_path.is_symlink():
                failures.append(f"Changelog decision cannot be a symlink: {decision_path}")
            else:
                decision_path = decision_path.resolve()
                decision = json.loads(decision_path.read_text(encoding="utf-8"))
                changelog_validation, changelog_failures = changelog_contract(
                    reader, page_texts, roles, decision
                )
                failures.extend(changelog_failures)

    report = {
        "schemaVersion": 1,
        "pdf": display_path(pdf, bases=(Path.cwd(),)),
        "artifactSha256": sha256_file(pdf),
        "profile": args.profile,
        "status": "passed" if not failures else "failed",
        "failures": failures,
        "changelogDecision": changelog_validation,
        "stats": {
            "pages": len(reader.pages),
            "pdfVersion": f"{actual_version[0]}.{actual_version[1]}",
            "outlineEntries": outline_count,
            "fonts": fonts["count"],
            "rasterImages": len(rasters["images"]),
            "imageMasks": len(rasters["masks"]),
            "internalLinks": links["internalCount"],
            "externalLinks": links["externalCount"],
            "blankPages": blank_pages,
            "pageMapEntries": page_map_count,
        },
        "limitations": [
            "This structural validator does not establish visual quality.",
            "Apple PDFKit compatibility remains unverified unless an Apple-native render was inspected.",
        ],
    }
    write_report(report, args.output)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
