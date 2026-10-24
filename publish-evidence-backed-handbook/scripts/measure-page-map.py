#!/usr/bin/env python3
"""Measure an exact-PDF candidate page map; never infer illustration gates from images.

Usage::

    python measure-page-map.py --pdf candidate.pdf --identity pdf-config.json \
        --chapters 12 --output page-map.json
    python measure-page-map.py --pdf candidate.pdf --identity pdf-config.json \
        --chapters 12 --verify page-map.json

``identity`` supplies id (or --book-id), title, full version and ISO date. Chapter
openers must have an authored, standalone ``CHAPTER NN`` text marker and exactly
one matching outline destination. The count is an explicit book contract, not a
measurement inferred from the raster images. Raster measurement and required-
illustration validation come directly from the shared PDF validator.

This measures identity, roles and illustration gates only. It is not a substitute
for candidate PDF validation, exact edition comparison or perceptual review.
"""

from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import re
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader
from pypdf.errors import PyPdfError

from runtime_support import sha256_file


SCRIPTS_DIR = Path(__file__).resolve().parent
VERSION = re.compile(r"\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?")
CHAPTER_MARKER = re.compile(r"(?im)^\s*CHAPTER\s+(\d+)\s*$")


def _validator() -> Any:
    spec = importlib.util.spec_from_file_location(
        "handbook_page_map_pdf_validator", SCRIPTS_DIR / "validate-pdf.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load shared PDF validator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


VALIDATOR = _validator()


def regular_file(path: Path | str, label: str) -> Path:
    path = Path(path).expanduser().absolute()
    if any(component.is_symlink() for component in (path, *path.parents)):
        raise ValueError(f"{label} cannot use a symlink: {path}")
    if not path.is_file():
        raise ValueError(f"Missing {label}: {path}")
    return path.resolve()


def normalized_title(value: str) -> str:
    # Chromium concatenates adjacent title spans in extracted text. Matching
    # letters/numbers ignores only layout whitespace/punctuation, not wording.
    return "".join(character.casefold() for character in value if character.isalnum())


def edition_identity(value: dict[str, Any], book_id: str | None = None) -> dict[str, str]:
    if not isinstance(value, dict):
        raise ValueError("Edition identity must be an object")
    result = {
        "id": book_id or value.get("id") or value.get("book"),
        "title": value.get("title"),
        "version": value.get("version"),
        "date": value.get("date"),
    }
    if not isinstance(result["id"], str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", result["id"]):
        raise ValueError("Edition identity requires a safe book id")
    if not isinstance(result["title"], str) or not result["title"].strip():
        raise ValueError("Edition identity requires a title")
    if not isinstance(result["version"], str) or not VERSION.fullmatch(result["version"]):
        raise ValueError("Edition identity requires a full semantic version")
    if not isinstance(result["date"], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", result["date"]):
        raise ValueError("Edition identity requires an ISO date")
    try:
        dt.date.fromisoformat(result["date"])
    except ValueError as error:
        raise ValueError("Edition identity requires a valid ISO date") from error
    return result


def _outline(reader: PdfReader) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []

    def walk(items: Iterable[Any], depth: int = 0) -> None:
        for item in items:
            if isinstance(item, list):
                walk(item, depth + 1)
            else:
                page = reader.get_destination_page_number(item)
                if not isinstance(page, int) or not 0 <= page < len(reader.pages):
                    raise ValueError(f"Outline destination outside PDF: {item.title!r}")
                found.append({"title": str(item.title), "pdfPage": page + 1, "depth": depth})

    walk(reader.outline)
    return found


def _cover_identity(reader: PdfReader, identity: dict[str, str], text: str) -> dict[str, str]:
    title = str((reader.metadata or {}).get("/Title", ""))
    allowed_titles = [identity["title"], *(f"{identity['title']} · {name}" for name in ("Daytime version", "Late night version"))]
    if normalized_title(title) not in {normalized_title(item) for item in allowed_titles}:
        raise ValueError(f"PDF metadata title differs from edition identity: {title!r}")
    if normalized_title(identity["title"]) not in normalized_title(text):
        raise ValueError("PDF cover title differs from edition identity")
    versions = re.findall(r"(?i)\bVersion\s+(\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?)(?![a-z0-9.-])", text)
    if versions != [identity["version"]]:
        raise ValueError(f"PDF cover version differs from edition identity: {versions!r}")
    expected_date = dt.date.fromisoformat(identity["date"])
    full_date = f"{expected_date.strftime('%B')} {expected_date.day}, {expected_date.year}"
    month_date = expected_date.strftime("%B %Y")
    compact = " ".join(text.split())
    # The approved Evaluation 1.0.0 cover intentionally records month precision.
    # Record that limitation, rather than claiming an exact day was measured.
    if full_date in compact or identity["date"] in compact:
        date_precision = "day"
    elif month_date in compact:
        date_precision = "month"
    else:
        raise ValueError("PDF cover date differs from edition identity")
    subject = str((reader.metadata or {}).get("/Subject", ""))
    subject_edition = re.search(r"Content edition\s+(\S+)\s*[·|]\s*(\d{4}-\d{2}-\d{2})", subject)
    if subject_edition and subject_edition.groups() != (identity["version"], identity["date"]):
        raise ValueError("PDF metadata content edition differs from edition identity")
    return {"title": title, "coverVersion": versions[0], "coverDatePrecision": date_precision, "subject": subject}


def _surface_role(title: str) -> str | None:
    title = " ".join(title.casefold().split())
    if title in {"changelog", "version history"}:
        return "changelog"
    if title in {"contents", "table of contents"}:
        return "contents"
    if title in {"index", "index of terms"}:
        return "index"
    if title in {"notes and sources", "further reading", "further reading and source notes"}:
        return "references"
    return None


def measure_page_map(
    pdf: Path | str,
    identity: dict[str, Any],
    *,
    chapter_count: int,
    book_id: str | None = None,
    minimum_ppi: int = 240,
    expected_sha256: str | None = None,
    artifact_profile: str = "candidate",
) -> dict[str, Any]:
    """Return a deterministic measured map, failing before output on any ambiguity."""
    pdf = regular_file(pdf, "PDF")
    identity = edition_identity(identity, book_id)
    if isinstance(chapter_count, bool) or not isinstance(chapter_count, int) or chapter_count < 1:
        raise ValueError("Chapter count must be a positive explicit integer")
    if isinstance(minimum_ppi, bool) or not isinstance(minimum_ppi, int) or minimum_ppi < 240:
        raise ValueError("Minimum illustration PPI must be an integer at least 240")
    if artifact_profile not in {"candidate", "candidate-fixture"}:
        raise ValueError("Measured page map requires candidate or candidate-fixture profile")
    digest = sha256_file(pdf)
    if expected_sha256 is not None and (
        not re.fullmatch(r"[a-f0-9]{64}", expected_sha256) or expected_sha256 != digest
    ):
        raise ValueError("PDF SHA-256 differs from expected artifact hash")
    reader = PdfReader(pdf, strict=True)
    if reader.is_encrypted or not reader.pages:
        raise ValueError("PDF must be nonempty and unencrypted")
    texts = [page.extract_text() or "" for page in reader.pages]
    cover = _cover_identity(reader, identity, texts[0])
    outlines = _outline(reader)
    paints = VALIDATOR.raster_image_paints(reader)
    openers: dict[int, int] = {}
    for number, text in enumerate(texts, 1):
        markers = CHAPTER_MARKER.findall(text)
        if len(markers) > 1:
            raise ValueError(f"Page {number} contains duplicate chapter markers")
        if markers:
            chapter = int(markers[0])
            if chapter in openers:
                raise ValueError(f"Chapter {chapter} has duplicate opener pages")
            openers[chapter] = number
    if set(openers) != set(range(1, chapter_count + 1)):
        raise ValueError(f"Expected chapter markers 1..{chapter_count}; measured {sorted(openers)}")
    if [openers[index] for index in range(1, chapter_count + 1)] != sorted(openers.values()):
        raise ValueError("Chapter opener order differs from authored numbering")
    opener_outlines: dict[int, dict[str, Any]] = {}
    for chapter, page_number in openers.items():
        destinations = [item for item in outlines if item["pdfPage"] == page_number]
        if len(destinations) != 1:
            raise ValueError(f"Chapter {chapter} opener needs exactly one outline destination; found {len(destinations)}")
        destination = destinations[0]
        outline_title = re.sub(r"^\s*\d+[.:]\s*", "", destination["title"])
        marker = CHAPTER_MARKER.search(texts[page_number - 1])
        after_marker = texts[page_number - 1][marker.end():]  # type: ignore[union-attr]
        if not normalized_title(after_marker).startswith(normalized_title(outline_title)):
            raise ValueError(f"Chapter {chapter} outline title does not match its opener heading")
        opener_outlines[page_number] = destination
    roles = {1: "cover"}
    for index, item in enumerate(outlines):
        role = _surface_role(item["title"])
        if role is None:
            continue
        end = len(reader.pages) + 1
        for following in outlines[index + 1:]:
            if following["depth"] <= item["depth"] and following["pdfPage"] > item["pdfPage"]:
                end = following["pdfPage"]
                break
        for number in range(item["pdfPage"], end):
            roles[number] = role
    # Some existing books intentionally omit Contents from the outline.
    for number, text in enumerate(texts, 1):
        headings = [" ".join(line.split()) for line in text.splitlines() if line.strip()][:8]
        if any(line.casefold() in {"contents", "table of contents"} for line in headings):
            roles[number] = "contents"
    labels = reader.page_labels
    pages: list[dict[str, Any]] = []
    for number, page in enumerate(reader.pages, 1):
        entry: dict[str, Any] = {
            "pdfPage": number,
            "page": number,
            "folio": labels[number - 1],
            "role": "chapter-opener" if number in opener_outlines else roles.get(number, "body"),
            "mediaBox": [float(value) for value in page.mediabox],
            "cropBox": [float(value) for value in page.cropbox],
            "textCharacters": len(texts[number - 1]),
            "rasterImagePaints": [paint for paint in paints if paint["page"] == number],
            "outlineDestinations": [item for item in outlines if item["pdfPage"] == number],
        }
        if number in opener_outlines:
            entry["chapter"] = next(chapter for chapter, page_number in openers.items() if page_number == number)
            entry["section"] = opener_outlines[number]["title"]
            entry["requiredRasterIllustration"] = {
                "paintCount": 1,
                "minimumEffectivePpi": minimum_ppi,
                "requireOpaque": True,
            }
        pages.append(entry)
    gates, failures = VALIDATOR.required_raster_illustration_report(pages, paints, minimum_ppi)
    if failures:
        raise ValueError("Required illustration gate failed: " + "; ".join(failures))
    if len(gates) != chapter_count:
        raise ValueError("Required illustration gate count differs from chapter contract")
    if sha256_file(pdf) != digest:
        raise ValueError("PDF changed during measurement; no page map was accepted")
    return {
        "schemaVersion": 1,
        "artifactProfile": artifact_profile,
        "book": identity["id"],
        "edition": identity,
        "sha256": digest,
        "pdfSha256": digest,
        "bytes": pdf.stat().st_size,
        "pageNumbering": "pdfPage and page are one-based; folio is the measured PDF page label",
        "measurement": {
            "runtime": "pypdf; shared validate-pdf.py raster_image_paints and required_raster_illustration_report",
            "identity": cover,
            "chapterCount": chapter_count,
            "requiredRasterIllustrationPages": len(gates),
            "rasterImagePaints": len(paints),
            "limitations": "Measured structural/edition/illustration evidence only; not candidate validation or visual approval.",
        },
        "pages": pages,
    }


def verify_page_map(
    page_map: dict[str, Any], pdf: Path | str, identity: dict[str, Any], **kwargs: Any
) -> dict[str, Any]:
    """Reject a stale, malformed or tampered map against the exact PDF bytes."""
    if not isinstance(page_map, dict):
        raise ValueError("Measured page map must be an object")
    measured = measure_page_map(pdf, identity, **kwargs)
    if page_map != measured:
        differences = [key for key in set(page_map) | set(measured) if page_map.get(key) != measured.get(key)]
        raise ValueError("Measured page-map binding differs: " + ", ".join(sorted(differences)))
    return {"status": "passed", "sha256": measured["sha256"], "pages": len(measured["pages"])}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--identity", type=Path, required=True, help="PDF config or explicit edition JSON")
    parser.add_argument("--book-id", help="Required when identity JSON omits id/book")
    parser.add_argument("--chapters", type=int, required=True, help="Explicit authored chapter count")
    parser.add_argument("--minimum-ppi", type=int, default=240)
    parser.add_argument("--expected-sha256")
    parser.add_argument("--artifact-profile", choices=("candidate", "candidate-fixture"), default="candidate")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--output", type=Path, help="New output only; existing files are never overwritten")
    action.add_argument("--verify", type=Path, help="Read-only verification of an existing measured map")
    args = parser.parse_args()
    try:
        identity = json.loads(regular_file(args.identity, "Edition identity").read_text(encoding="utf-8"))
        kwargs = dict(chapter_count=args.chapters, book_id=args.book_id, minimum_ppi=args.minimum_ppi,
                      expected_sha256=args.expected_sha256, artifact_profile=args.artifact_profile)
        if args.verify:
            page_map = json.loads(regular_file(args.verify, "Measured page map").read_text(encoding="utf-8"))
            report = verify_page_map(page_map, args.pdf, identity, **kwargs)
        else:
            output = args.output.expanduser().absolute()
            if any(component.is_symlink() for component in (output, *output.parents)):
                raise ValueError(f"Page-map output cannot use a symlink: {output}")
            if output.exists():
                raise ValueError(f"Page-map output already exists: {output}")
            page_map = measure_page_map(args.pdf, identity, **kwargs)
            output.parent.mkdir(parents=True, exist_ok=True)
            with output.open("x", encoding="utf-8") as stream:
                stream.write(json.dumps(page_map, indent=2) + "\n")
            report = {"status": "passed", "output": str(output), "sha256": page_map["sha256"],
                      "pages": len(page_map["pages"]), "chapterOpeners": args.chapters}
    except (ValueError, OSError, KeyError, TypeError, PyPdfError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}))
        return 1
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
