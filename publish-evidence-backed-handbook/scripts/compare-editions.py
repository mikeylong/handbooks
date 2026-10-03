#!/usr/bin/env python3
"""Create exact edition diffs and a changelog-stable content decision."""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

from pypdf import PdfReader

from runtime_support import atomic_write_text, display_path, safe_output_dir


UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged."
NAVIGATION_ROLE_WORDS = ("contents", "index", "navigation")
CHANGELOG_WORDS = ("changelog", "version history")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized(value: str) -> str:
    return " ".join(value.split())


def flatten_outline(items: Iterable[Any]) -> Iterable[Any]:
    for item in items:
        if isinstance(item, list):
            yield from flatten_outline(item)
        else:
            yield item


def dereference(value: Any) -> Any:
    return value.get_object() if hasattr(value, "get_object") else value


def safe_input(path: Path, label: str) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise SystemExit(f"{label} cannot be a symlink: {expanded}")
    resolved = expanded.resolve()
    if not resolved.is_file():
        raise SystemExit(f"Missing {label}: {resolved}")
    return resolved


def page_roles(path: Path | None, page_count: int, label: str) -> dict[int, str]:
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    pages = payload.get("pages")
    if not isinstance(pages, list) or len(pages) != page_count:
        actual = len(pages) if isinstance(pages, list) else "invalid"
        raise SystemExit(f"{label} has {actual} pages; PDF has {page_count}")
    return {
        index: str(page.get("role", "")).strip().lower()
        for index, page in enumerate(pages, start=1)
    }


def heading_lines(text: str) -> list[str]:
    return [normalized(line).lower() for line in text.splitlines() if normalized(line)][:8]


def is_changelog_surface(text: str, role: str) -> bool:
    if any(word in role for word in CHANGELOG_WORDS):
        return True
    headings = heading_lines(text)
    return "changelog" in headings or (
        "version history" in headings and "changelog" in headings
    )


def is_navigation_surface(text: str, role: str) -> bool:
    if any(word in role for word in NAVIGATION_ROLE_WORDS):
        return True
    headings = heading_lines(text)
    return "contents" in headings or "index of terms" in headings


def page_surfaces(
    reader: PdfReader, roles: dict[int, str]
) -> tuple[list[tuple[int, str]], list[tuple[int, str]], list[int], list[int]]:
    all_pages: list[tuple[int, str]] = []
    substantive: list[tuple[int, str]] = []
    changelog: list[int] = []
    navigation: list[int] = []
    for number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        role = roles.get(number, "")
        all_pages.append((number, text))
        if is_changelog_surface(text, role):
            changelog.append(number)
        elif is_navigation_surface(text, role):
            navigation.append(number)
        else:
            substantive.append((number, text))
    return all_pages, substantive, changelog, navigation


def outline_titles(reader: PdfReader, include_changelog: bool) -> list[str]:
    titles = [str(item.get("/Title", "")) for item in flatten_outline(reader.outline)]
    if include_changelog:
        return titles
    return [
        title
        for title in titles
        if not any(word in normalized(title).lower() for word in CHANGELOG_WORDS)
    ]


def page_reference_map(reader: PdfReader) -> dict[tuple[int, int], int]:
    result: dict[tuple[int, int], int] = {}
    for number, page in enumerate(reader.pages, start=1):
        reference = getattr(page, "indirect_reference", None)
        if reference is not None:
            result[(int(reference.idnum), int(reference.generation))] = number
    return result


def destination_label(
    reader: PdfReader,
    destination: Any,
    references: dict[tuple[int, int], int],
) -> str:
    value = dereference(destination)
    if isinstance(value, str):
        named = reader.named_destinations.get(value)
        if named is not None:
            try:
                return f"page:{reader.get_destination_page_number(named) + 1}"
            except Exception:
                return f"named:{value}"
        return f"named:{value}"
    if isinstance(value, (list, tuple)) and value:
        first = value[0]
        if hasattr(first, "idnum"):
            number = references.get((int(first.idnum), int(first.generation)))
            if number is not None:
                return f"page:{number}"
    return f"destination:{normalized(str(value))}"


def link_targets(
    reader: PdfReader,
    ignored_source_pages: set[int],
    ignored_target_pages: set[int],
) -> list[str]:
    targets: list[str] = []
    references = page_reference_map(reader)
    for page_number, page in enumerate(reader.pages, start=1):
        if page_number in ignored_source_pages:
            continue
        for annotation_ref in page.get("/Annots") or []:
            annotation = dereference(annotation_ref)
            if str(annotation.get("/Subtype", "")) != "/Link":
                continue
            action = dereference(annotation.get("/A")) if annotation.get("/A") else None
            if action and str(action.get("/S", "")) == "/URI":
                targets.append(f"URI:{action.get('/URI', '')}")
                continue
            destination = annotation.get("/Dest")
            if destination is None and action and str(action.get("/S", "")) == "/GoTo":
                destination = action.get("/D")
            if destination is None:
                continue
            label = destination_label(reader, destination, references)
            if label.startswith("page:"):
                try:
                    target_page = int(label.split(":", 1)[1])
                except ValueError:
                    target_page = -1
                if target_page in ignored_target_pages:
                    continue
            targets.append(f"GOTO:{label}")
    return targets


def metadata_view(reader: PdfReader) -> dict[str, str]:
    metadata = reader.metadata
    return {
        "title": metadata.title or "",
        "author": metadata.author or "",
        "subject": metadata.subject or "",
    }


def text_lines(pages: list[tuple[int, str]]) -> list[str]:
    lines: list[str] = []
    for page_number, text in pages:
        lines.append(f"--- PDF page {page_number} ---\n")
        source_lines = text.splitlines() or [""]
        lines.extend(line.rstrip() + "\n" for line in source_lines)
    return lines


def exact_diff(previous: list[str], candidate: list[str], previous_name: str, candidate_name: str) -> str:
    return "".join(
        difflib.unified_diff(
            previous,
            candidate,
            fromfile=previous_name,
            tofile=candidate_name,
            lineterm="\n",
        )
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--previous-pdf", type=Path, required=True)
    parser.add_argument("--candidate-pdf", type=Path, required=True)
    parser.add_argument("--previous-source", type=Path)
    parser.add_argument("--candidate-source", type=Path)
    parser.add_argument("--previous-page-map", type=Path)
    parser.add_argument("--candidate-page-map", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    previous_pdf = safe_input(args.previous_pdf, "previous PDF")
    candidate_pdf = safe_input(args.candidate_pdf, "candidate PDF")
    if bool(args.previous_source) != bool(args.candidate_source):
        raise SystemExit("Pass both --previous-source and --candidate-source, or neither")
    if bool(args.previous_page_map) != bool(args.candidate_page_map):
        raise SystemExit("Pass both --previous-page-map and --candidate-page-map, or neither")
    previous_source = safe_input(args.previous_source, "previous source") if args.previous_source else None
    candidate_source = safe_input(args.candidate_source, "candidate source") if args.candidate_source else None
    previous_map = safe_input(args.previous_page_map, "previous page map") if args.previous_page_map else None
    candidate_map = safe_input(args.candidate_page_map, "candidate page map") if args.candidate_page_map else None

    output_dir = safe_output_dir(args.output_dir, "Output directory")

    previous_reader = PdfReader(previous_pdf, strict=True)
    candidate_reader = PdfReader(candidate_pdf, strict=True)
    previous_roles = page_roles(previous_map, len(previous_reader.pages), "previous page map")
    candidate_roles = page_roles(candidate_map, len(candidate_reader.pages), "candidate page map")
    previous_all, previous_substantive, previous_changelog, previous_navigation = page_surfaces(previous_reader, previous_roles)
    candidate_all, candidate_substantive, candidate_changelog, candidate_navigation = page_surfaces(candidate_reader, candidate_roles)

    previous_text = normalized("\n".join(text for _, text in previous_substantive))
    candidate_text = normalized("\n".join(text for _, text in candidate_substantive))
    substantive_text_changed = previous_text != candidate_text
    previous_navigation_text = normalized("\n".join(text for number, text in previous_all if number in previous_navigation))
    candidate_navigation_text = normalized("\n".join(text for number, text in candidate_all if number in candidate_navigation))
    navigation_changed = previous_navigation_text != candidate_navigation_text

    previous_outline_all = outline_titles(previous_reader, include_changelog=True)
    candidate_outline_all = outline_titles(candidate_reader, include_changelog=True)
    previous_outline = outline_titles(previous_reader, include_changelog=False)
    candidate_outline = outline_titles(candidate_reader, include_changelog=False)
    outline_changed = previous_outline != candidate_outline
    outline_navigation_changed = previous_outline_all != candidate_outline_all

    previous_ignored = set(previous_changelog + previous_navigation)
    candidate_ignored = set(candidate_changelog + candidate_navigation)
    previous_links = link_targets(previous_reader, previous_ignored, previous_ignored)
    candidate_links = link_targets(candidate_reader, candidate_ignored, candidate_ignored)
    links_changed = previous_links != candidate_links
    previous_metadata = metadata_view(previous_reader)
    candidate_metadata = metadata_view(candidate_reader)
    metadata_changed = previous_metadata != candidate_metadata
    def content_metadata(value):
        result = dict(value)
        for suffix in (" · Daytime version", " · Late night version"):
            if result["title"].endswith(suffix):
                result["title"] = result["title"][:-len(suffix)]
                break
        return result
    content_metadata_changed = content_metadata(previous_metadata) != content_metadata(candidate_metadata)

    reader_facing_changed = any((substantive_text_changed, outline_changed, links_changed, content_metadata_changed))
    summary = (
        "The candidate contains reader-facing changes that require semantic classification."
        if reader_facing_changed
        else UNCHANGED_SUMMARY
    )

    previous_pdf_label = f"previous/{previous_pdf.name}"
    candidate_pdf_label = f"candidate/{candidate_pdf.name}"
    raw_pdf_patch = exact_diff(
        text_lines(previous_all),
        text_lines(candidate_all),
        previous_pdf_label,
        candidate_pdf_label,
    )
    substantive_patch = exact_diff(
        text_lines(previous_substantive),
        text_lines(candidate_substantive),
        previous_pdf_label,
        candidate_pdf_label,
    )
    atomic_write_text(
        output_dir / "exact-pdf-text.patch", raw_pdf_patch, label="PDF-text patch"
    )
    atomic_write_text(
        output_dir / "reader-facing-content.patch",
        substantive_patch,
        label="Reader-facing patch",
    )

    source_changed = None
    source_hashes = None
    if previous_source and candidate_source:
        source_patch = exact_diff(
            previous_source.read_text(encoding="utf-8").splitlines(True),
            candidate_source.read_text(encoding="utf-8").splitlines(True),
            f"previous/{previous_source.name}",
            f"candidate/{candidate_source.name}",
        )
        source_changed = bool(source_patch)
        source_hashes = {"previous": sha256(previous_source), "candidate": sha256(candidate_source)}
        atomic_write_text(
            output_dir / "exact-source.patch", source_patch, label="Source patch"
        )

    report = {
        "schemaVersion": 2,
        "previous": {
            "pdf": previous_pdf_label,
            "pdfSha256": sha256(previous_pdf),
            "pages": len(previous_reader.pages),
            "ignoredChangelogPages": previous_changelog,
            "ignoredNavigationPages": previous_navigation,
            "metadata": previous_metadata,
        },
        "candidate": {
            "pdf": candidate_pdf_label,
            "pdfSha256": sha256(candidate_pdf),
            "pages": len(candidate_reader.pages),
            "ignoredChangelogPages": candidate_changelog,
            "ignoredNavigationPages": candidate_navigation,
            "metadata": candidate_metadata,
        },
        "readerFacingContentChanged": reader_facing_changed,
        "summary": summary,
        "comparisons": {
            "rawPdfTextChanged": bool(raw_pdf_patch),
            "normalizedSubstantiveTextChanged": substantive_text_changed,
            "navigationTextChanged": navigation_changed,
            "substantiveOutlineChanged": outline_changed,
            "outlineIncludingChangelogChanged": outline_navigation_changed,
            "substantiveLinksChanged": links_changed,
            "metadataChanged": metadata_changed,
            "contentMetadataChanged": content_metadata_changed,
            "sourceChanged": source_changed,
        },
        "sourceSha256": source_hashes,
        "artifacts": {
            "pdfTextPatch": "exact-pdf-text.patch",
            "readerFacingContentPatch": "reader-facing-content.patch",
            "sourcePatch": "exact-source.patch" if source_hashes else None,
        },
        "decisionProjection": {
            "excludedSurfaces": ["changelog pages", "contents and index pages", "changelog outline entries", "exact PDF appearance title suffixes"],
            "reason": "Derivative edition navigation and prior changelog history cannot determine whether substantive reader-facing content changed.",
        },
        "limitations": [
            "Rendering-only differences require visual comparison.",
            "Semantic change categories and rationales must be authored from accepted exact diffs.",
            "Pass page maps to avoid relying on heading heuristics for surface roles.",
        ],
    }
    atomic_write_text(
        output_dir / "edition-diff.json",
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        label="Edition-diff report",
    )

    flags = report["comparisons"]
    markdown = [
        "# Edition comparison\n",
        f"\n**Result:** {summary}\n",
        f"\n- Previous PDF SHA-256: `{report['previous']['pdfSha256']}`\n",
        f"- Candidate PDF SHA-256: `{report['candidate']['pdfSha256']}`\n",
        f"- Raw extracted PDF text changed: `{str(flags['rawPdfTextChanged']).lower()}`\n",
        f"- Substantive PDF text changed: `{str(flags['normalizedSubstantiveTextChanged']).lower()}`\n",
        f"- Derivative navigation changed: `{str(flags['navigationTextChanged']).lower()}`\n",
        f"- Substantive outline changed: `{str(flags['substantiveOutlineChanged']).lower()}`\n",
        f"- Substantive links changed: `{str(flags['substantiveLinksChanged']).lower()}`\n",
        f"- Reader-visible metadata changed: `{str(flags['metadataChanged']).lower()}`\n",
    ]
    if source_changed is not None:
        markdown.append(f"- Canonical source changed: `{str(source_changed).lower()}`\n")
    markdown.extend(
        [
            "\n## Exact artifacts\n",
            "\n- `exact-pdf-text.patch` (all extracted surfaces)\n",
            "- `reader-facing-content.patch` (decision projection)\n",
            *(["- `exact-source.patch`\n"] if source_hashes else []),
            "\nSemantic additions, deprecations or removals, and corrections or clarifications must be recorded separately and map to the exact artifacts.\n",
        ]
    )
    atomic_write_text(
        output_dir / "edition-diff.md",
        "".join(markdown),
        label="Edition-diff Markdown",
    )

    print(
        json.dumps(
            {
                "outputDirectory": display_path(output_dir, bases=(Path.cwd(),)),
                "readerFacingContentChanged": reader_facing_changed,
                "summary": summary,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
