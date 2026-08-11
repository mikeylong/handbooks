#!/usr/bin/env python3
"""Extract printed page numbers from Chromium PDF named destinations."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from pypdf import PdfReader


CONTENT_START_INDEX = 3
UNCHANGED_CHANGELOG_SUMMARY = "The handbook's reader-facing content is unchanged."


def printed_page(physical_index: int) -> int:
    return physical_index - CONTENT_START_INDEX + 1


def changelog_required() -> bool:
    ledger_path = Path(__file__).with_name("changelog.json")
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    summary = ledger.get("summary")
    if not isinstance(summary, str):
        raise AssertionError("Changelog summary is missing")
    return summary.strip() != UNCHANGED_CHANGELOG_SUMMARY


def extract(pdf_path: Path, require_changelog: bool) -> dict[str, int]:
    reader = PdfReader(pdf_path, strict=True)
    page_map: dict[str, int] = {}
    for raw_name, destination in reader.named_destinations.items():
        name = str(raw_name).lstrip("/")
        physical_index = reader.get_destination_page_number(destination)
        if physical_index < CONTENT_START_INDEX:
            continue
        page_map[name] = printed_page(physical_index)

    required = {
        *(f"chapter-{number:02d}" for number in range(1, 13)),
        *(f"section-{number:02d}" for number in range(1, 26)),
    }
    simplified_names = {
        "-".join(name.split("-")[:2])
        for name in page_map
        if name.startswith(("chapter-", "section-"))
    }
    missing = sorted(required - simplified_names)
    if missing:
        raise AssertionError(f"Missing named destination families: {missing}")
    if "appendix-citations" not in page_map or "term-index" not in page_map:
        raise AssertionError("Missing appendix or index destination")
    has_changelog = "changelog" in page_map
    if require_changelog and not has_changelog:
        raise AssertionError("Missing required changelog destination")
    if not require_changelog and has_changelog:
        raise AssertionError("Unexpected changelog destination for unchanged content")
    return dict(sorted(page_map.items()))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    require_changelog = changelog_required()
    page_map = extract(args.pdf, require_changelog)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(page_map, indent=2) + "\n", encoding="utf-8")
    print(
        f"Mapped {len(page_map)} destinations; "
        f"appendix page {page_map['appendix-citations']}, "
        f"index page {page_map['term-index']}, "
        + (
            f"changelog page {page_map['changelog']}."
            if require_changelog
            else "changelog omitted; reader-facing content unchanged."
        )
    )


if __name__ == "__main__":
    main()
