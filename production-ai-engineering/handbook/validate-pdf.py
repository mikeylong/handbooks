#!/usr/bin/env python3
"""Validate the finished Production AI Engineering PDF edition."""

from __future__ import annotations

import argparse
import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

import pdfplumber
from pypdf import PdfReader


BOOK_TITLE = "Production AI Engineering"
AUTHOR = "Michael Long"
AUTHOR_CREDIT = "Michael Long, surfaces.systems"
AUTHOR_URL = "https://surfaces.systems"
SUBTITLE = "A Handbook for Building Reliable LLM Systems"
UNCHANGED_CHANGELOG_SUMMARY = "The handbook's reader-facing content is unchanged."
CHAPTERS = [
    "Build the System Around the Model",
    "Treat Context as a Budget",
    "Prefill and Decode Are Different Jobs",
    "Choose the Optimization That Fits",
    "Turn Model Output into a Contract",
    "Put Clear Limits on Agents",
    "Keep Retrieval Grounded",
    "Make Evals the Release Gate",
    "Trace the Whole User Journey",
    "Build Safety into the Architecture",
    "Choose What to Change",
    "Design for Production Failure",
]
SECTIONS = [
    "The full system",
    "Prompt engineering is one part of the harness",
    "Context engineering, not long prompts",
    "Four caches that must not be confused",
    "Prefill and decode optimize differently",
    "KV cache management and memory pressure",
    "Continuous batching, paged attention, and goodput",
    "Speculative decoding, quantization, and distillation",
    "Quantization: formats, methods, and quality risk",
    "Structured outputs: syntax is only the first gate",
    "Reliable function and tool calling",
    "Agent guardrails, budgets, and termination",
    "Model routing and degraded mode",
    "RAG architecture",
    "Retrieval and answer evals",
    "Evals as the release contract",
    "LLM observability as a first-class discipline",
    "Attribute cost to the whole workflow",
    "Safety engineering and permission boundaries",
    "Multi-tenant isolation and cache safety",
    "In-context learning, RAG, fine-tuning, and distillation",
    "Diagnosing the four-way tradeoff",
    "Production failure matrix",
    "Production readiness checklist",
    "Recommended learning order",
]
SECTION_DISPLAY_NUMBERS = [
    "1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1",
    "5.2", "6.1", "6.2", "7.1", "7.2", "8.1", "9.1", "9.2", "10.1", "10.2",
    "11.1", "11.2", "12.1", "12.2", "12.3",
]

COVER_TITLE_FONT_PT = 42.0
FOREWORD_BODY_FONT_PT = 10.0
FONT_SIZE_TOLERANCE_PT = 0.1


def _matched_font_sizes(page, pattern: str, label: str) -> list[float]:
    matches = page.search(pattern, regex=True, return_chars=True)
    assert len(matches) == 1, f"Expected one {label} scale anchor, found {len(matches)}"
    sizes = [
        float(char["size"])
        for char in matches[0]["chars"]
        if str(char.get("text", "")).strip()
    ]
    assert sizes, f"The {label} scale anchor has no measurable characters"
    return sizes


def validate_print_scale(pdf) -> None:
    """Reject whole-document shrinkage caused by an unbreakable print element."""
    anchors = [
        (
            pdf.pages[0],
            r"Production\s+AI\s+Engineering",
            "cover title",
            COVER_TITLE_FONT_PT,
        ),
        (
            pdf.pages[1],
            r"This\s+handbook\s+lays\s+out\s+an\s+operating\s+model",
            "foreword body",
            FOREWORD_BODY_FONT_PT,
        ),
    ]
    for page, pattern, label, expected in anchors:
        sizes = _matched_font_sizes(page, pattern, label)
        measured = sum(sizes) / len(sizes)
        assert abs(measured - expected) <= FONT_SIZE_TOLERANCE_PT, (
            f"Print scale changed: {label} is {measured:.2f} pt; expected {expected:.2f} pt"
        )


def canonical(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def flatten_outline(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten_outline(item)
        else:
            yield item


def load_changelog(
    ledger_path: Path | None = None, *, cover_text: str = "",
) -> tuple[dict, bool]:
    if ledger_path is None:
        handbook_dir = Path(__file__).parent
        ledger_path = handbook_dir / "changelog.json"
        # Published PDFs retain their edition history after the working ledger
        # resets. Candidate suffixes deliberately do not match a saved release.
        version = re.search(r" · Version (\d+\.\d+(?:\.\d+)?)$", " ".join(cover_text.split()))
        if version:
            published_ledger = handbook_dir / "releases" / f"version-{version[1]}.json"
            if published_ledger.is_file():
                ledger_path = published_ledger
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    summary = ledger.get("summary")
    if not isinstance(summary, str):
        raise AssertionError("Changelog summary is missing")
    return ledger, summary.strip() != UNCHANGED_CHANGELOG_SUMMARY


def validate_structure(
    page_texts: list[str],
    chapter_opener_pages: list[int],
    destination_pages: dict[str, int],
    require_changelog: bool,
    section_titles: list[str] | None = None,
) -> tuple[int, int]:
    """Check content boundaries and destinations independently of edition length."""
    section_titles = SECTIONS if section_titles is None else section_titles
    assert len(chapter_opener_pages) == len(CHAPTERS), "Missing chapter openers"
    assert chapter_opener_pages[0] == 4, "Chapter 1 must follow the three front-matter pages"
    assert all(
        left < right for left, right in zip(chapter_opener_pages, chapter_opener_pages[1:])
    ), "Chapter openers are duplicated or out of order"
    for name, page_index in destination_pages.items():
        assert isinstance(page_index, int) and 0 <= page_index < len(page_texts), (
            f"Named destination points outside the PDF: {name} -> {page_index}"
        )

    def destination(name: str) -> int:
        assert name in destination_pages, f"Missing required destination: {name}"
        return destination_pages[name]

    def family_page(prefix: str) -> int:
        matches = [name for name in destination_pages if name.startswith(prefix)]
        assert len(matches) == 1, f"Expected one destination for {prefix}, found {matches}"
        return destination_pages[matches[0]]

    appendix_start = destination("appendix-citations")
    index_start = destination("term-index")
    assert chapter_opener_pages[-1] - 1 < appendix_start < index_start, (
        "Appendix and Index must follow all chapters on separate pages"
    )
    assert "APPENDIX A" in page_texts[appendix_start].upper(), "Appendix opener is missing"
    assert "NOTES AND SOURCES" in page_texts[appendix_start].upper(), "Appendix title is missing"
    assert "INDEX OF TERMS" in page_texts[index_start].upper(), "Index opener is missing"

    chapter_starts = [page - 1 for page in chapter_opener_pages]
    for number, (title, page_index) in enumerate(zip(CHAPTERS, chapter_starts), start=1):
        assert family_page(f"chapter-{number:02d}-") == page_index, (
            f"Chapter {number} destination does not match its opener"
        )
        assert canonical(title) in canonical(page_texts[page_index]), (
            f"Chapter {number} opener has the wrong title"
        )
    section_pages = []
    for number, (display_number, title) in enumerate(zip(SECTION_DISPLAY_NUMBERS, section_titles), start=1):
        page_index = family_page(f"section-{number:02d}-")
        chapter_index = int(display_number.split(".")[0]) - 1
        chapter_end = (chapter_starts + [appendix_start])[chapter_index + 1]
        assert chapter_starts[chapter_index] <= page_index < chapter_end, (
            f"Section {display_number} destination is outside its chapter"
        )
        assert canonical(f"{display_number} {title}") in canonical(page_texts[page_index]), (
            f"Section {display_number} heading is missing at its destination"
        )
        section_pages.append(page_index)
    assert section_pages == sorted(section_pages), "Sections are out of order"

    terminal_start = len(page_texts)
    if require_changelog:
        terminal_start = destination("changelog")
        assert index_start < terminal_start, "Changelog must start after the Index"
        # Chromium may omit the empty end anchor. The page-map extractor then
        # derives the end from the PDF; the complete ledger is checked below.
        if "changelog-end" in destination_pages:
            assert destination_pages["changelog-end"] == len(page_texts) - 1, (
                "Changelog end destination must be on the final PDF page"
            )
    else:
        assert not {"changelog", "changelog-end"} & destination_pages.keys(), (
            "Unexpected changelog destination for unchanged content"
        )
    for start, end, running_head in [
        (appendix_start, index_start, "NOTES AND SOURCES"),
        (index_start, terminal_start, "INDEX OF TERMS"),
    ]:
        assert all(running_head in text.upper() for text in page_texts[start:end]), (
            f"Missing {running_head} content or running head inside its page range"
        )
    return appendix_start, index_start


def validate_fonts(path: Path) -> int:
    executable = shutil.which("pdffonts")
    if not executable:
        raise AssertionError("pdffonts is required for the font-embedding check")
    result = subprocess.run(
        [executable, str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    rows = [line.split() for line in result.stdout.splitlines()[2:] if line.strip()]
    assert rows, "No fonts were found"
    unembedded = [row[0] for row in rows if len(row) >= 5 and row[-5] != "yes"]
    assert not unembedded, f"Unembedded fonts: {', '.join(unembedded)}"
    return len(rows)


def validate_chapter_art_compatibility(
    path: Path,
    chapter_opener_pages: list[int],
) -> None:
    """Reject PDF image structures that Apple PDFKit renders unreliably."""
    executable = shutil.which("pdfimages")
    if not executable:
        raise AssertionError("pdfimages is required for the chapter-art compatibility check")
    result = subprocess.run(
        [executable, "-list", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    rows: list[tuple[int, str]] = []
    for line in result.stdout.splitlines():
        match = re.match(r"^\s*(\d+)\s+\d+\s+(image|smask|mask)\s+", line)
        if match:
            rows.append((int(match.group(1)), match.group(2)))

    expected_pages = set(chapter_opener_pages)
    image_rows = [page for page, kind in rows if kind == "image"]
    mask_rows = [(page, kind) for page, kind in rows if kind in {"smask", "mask"}]
    assert not mask_rows, (
        "Chapter art must be opaque; found PDF soft-mask or mask rows: "
        f"{mask_rows}"
    )
    assert len(image_rows) == len(CHAPTERS), (
        f"Expected {len(CHAPTERS)} image paints, found {image_rows}"
    )
    assert set(image_rows) == expected_pages, (
        "Illustrations are not confined to the chapter opener pages: "
        f"expected {sorted(expected_pages)}, found {image_rows}"
    )
    assert len(set(image_rows)) == len(image_rows), (
        f"A chapter illustration is painted more than once: {image_rows}"
    )


def validate(path: Path, changelog_path: Path | None = None) -> None:
    if not __debug__:
        raise RuntimeError("PDF validation must not run with Python assertions disabled")
    assert path.is_file(), f"Missing PDF: {path}"
    reader = PdfReader(path, strict=True)
    version_match = re.fullmatch(r"%PDF-(\d+)\.(\d+)", reader.pdf_header)
    assert version_match, f"Malformed PDF header: {reader.pdf_header}"
    pdf_version = tuple(int(part) for part in version_match.groups())
    assert pdf_version >= (1, 4), (
        f"PDF 1.4 or newer is required; found {reader.pdf_header}"
    )
    assert reader.pages, "PDF has no pages"

    metadata = reader.metadata
    assert metadata.title == BOOK_TITLE
    assert metadata.author == AUTHOR
    assert metadata.subject == SUBTITLE
    assert reader.page_mode == "/UseOutlines"
    expected_labels = ["Cover", "ii", "iii"] + [str(page) for page in range(1, len(reader.pages) - 2)]
    assert reader.page_labels == expected_labels, "Missing or nonsequential page labels"

    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        assert abs(width - 420.0) < 0.1 and abs(height - 594.96) < 0.1, (
            f"Non-A5 page found: {width:.2f} x {height:.2f} pt"
        )

    page_texts = [page.extract_text() or "" for page in reader.pages]
    section_titles = list(SECTIONS)
    cover_version = re.search(r"Version (\d+)\.(\d+)(?:\.(\d+))?", page_texts[0])
    if cover_version and tuple(int(part or 0) for part in cover_version.groups()) < (1, 4, 0):
        section_titles[1] = "Harness engineering, not just prompt engineering"
    changelog, require_changelog = load_changelog(changelog_path, cover_text=page_texts[0])
    chapter_opener_pages: list[int] = []
    for number in range(1, len(CHAPTERS) + 1):
        matching_pages = [
            index
            for index, page_text in enumerate(page_texts, start=1)
            if f"CHAPTER {number:02d}" in page_text.upper()
        ]
        assert len(matching_pages) == 1, (
            f"Expected one opener for chapter {number:02d}, found {matching_pages}"
        )
        chapter_opener_pages.append(matching_pages[0])
    destination_pages = {
        str(name).lstrip("/"): reader.get_destination_page_number(destination)
        for name, destination in reader.named_destinations.items()
    }
    appendix_start, index_start = validate_structure(
        page_texts, chapter_opener_pages, destination_pages, require_changelog, section_titles,
    )
    text = "\n".join(page_texts)
    canonical_text = canonical(text)
    cover_text = " ".join(page_texts[0].split())
    cover_title_pattern = r"\s*".join(
        re.escape(token) for token in BOOK_TITLE.split()
    )
    cover_pattern = re.compile(
        rf"{cover_title_pattern} {re.escape(SUBTITLE)} {re.escape(AUTHOR_CREDIT)} "
        r"[A-Z][a-z]+ \d{1,2}, \d{4} · Version \d+\.\d+(?:\.\d+)?"
        r"(?:-candidate\.\d{8}\.\d{6})?"
    )
    assert cover_pattern.fullmatch(cover_text), (
        "The cover contains missing, unexpected, or malformed reader-facing text"
    )
    assert "EVIDENCE REVIEWED" not in text.upper(), "Removed review label remains"
    assert not re.search(r"(?im)^\s*premise\s*$", page_texts[1]), (
        "Premise label remains on the foreword"
    )
    assert canonical("This handbook lays out an operating model") in canonical(page_texts[1]), (
        "Foreword does not use the approved handbook self-reference"
    )
    assert canonical("The field guide lays out an operating model") not in canonical_text, (
        "Legacy field-guide self-reference remains"
    )
    approved_premise = (
        "A model can propose an answer or action. The surrounding system decides "
        "whether and how it should proceed, and remains responsible for the outcome."
    )
    assert canonical(approved_premise) in canonical(page_texts[1]), (
        "Foreword does not use the approved system-accountability premise"
    )
    assert canonical("measure outcomes, and stop safely") not in canonical_text, (
        "Legacy termination language remains in the central premise"
    )
    defined_slo = (
        "successful, policy-compliant user outcome that meets service-level "
        "objectives (SLOs) for latency and cost"
    )
    assert canonical(defined_slo) in canonical(page_texts[1]), (
        "SLO is not defined on first use in the foreword"
    )
    assert "\ufffd" not in text, "Replacement glyph found in extracted text"
    expected_text = [
        BOOK_TITLE,
        SUBTITLE,
        "Notes and Sources",
        "Index of Terms",
        *CHAPTERS,
        *section_titles,
    ]
    if require_changelog:
        expected_text.append("Changelog")
    for expected in expected_text:
        assert canonical(expected) in canonical_text, f"Missing text: {expected}"
    assert len(SECTION_DISPLAY_NUMBERS) == len(SECTIONS)
    for old_number, (display_number, title) in enumerate(
        zip(SECTION_DISPLAY_NUMBERS, section_titles), start=1
    ):
        hierarchical_heading = canonical(f"{display_number} {title}")
        assert hierarchical_heading in canonical_text, (
            f"Missing hierarchical section heading: {display_number} {title}"
        )
        legacy_heading = re.compile(
            rf"(?m)^\s*{old_number}\.\s+{re.escape(title)}"
        )
        assert not legacy_heading.search(text), (
            f"Legacy global section heading remains: {old_number}. {title}"
        )
    assert "adaptedinfull" not in canonical_text
    assert "beyondtheprompt" not in canonical_text
    assert "SOURCE SECTIONS" not in page_texts[2].upper(), (
        "Source-section metadata remains in the table of contents"
    )
    assert "CITED REFERENCES" not in page_texts[2].upper()
    assert "PAGE REFERENCES" not in page_texts[2].upper()
    assert not re.search(r"\bPLATE\s+\d{2}\b", text.upper()), (
        "Production plate captions remain in the PDF"
    )
    assert "FLOWCHART LR" not in text.upper(), "Raw Mermaid source remains in the PDF"
    assert "FLOWCHART TD" not in text.upper(), "Raw Mermaid source remains in the PDF"
    assert "TEXT CODE EXAMPLE" not in text.upper(), (
        "Plain-text material is still presented as a code example"
    )
    assert "JSON CODE EXAMPLE" not in text.upper(), "JSON code label remains"
    assert "JSON RESPONSE ENVELOPE" not in text.upper(), "JSON code label remains"
    for cache_key_group in [
        "Request scope", "Runtime contract", "Policy", "Retrieval context"
    ]:
        assert canonical(cache_key_group) in canonical_text, (
            f"Missing cache-key group: {cache_key_group}"
        )
    for latency_group in ["End-to-end latency", "Before generation", "Generation and execution"]:
        assert canonical(latency_group) in canonical_text, (
            f"Missing latency-budget group: {latency_group}"
        )
    for semantic_block_text in [
        "KV bytes",
        "keys and values",
        "Response or degraded UX",
        "Authorize and execute",
        "Model response",
        "continue only if usable",
        "Verify the postcondition",
        "eligible failure; contract preserved",
        "eligible failure; degraded mode disclosed",
        "Terminal options",
        "Shared index",
        "lexical and vector indexes",
        "Query + identity",
        "Tenant + document ACL filters",
        "Lexical/dense candidates",
        "Authorized query + shared index",
        "Fusion and reranking",
        "Deduplicate and context-pack",
        "Answer with claim-level citations",
        "Abstain",
        "Evidence and attribution",
        "Coverage and risk",
        "Journey cost",
        "Reliability and review",
    ]:
        assert canonical(semantic_block_text) in canonical_text, (
            f"Missing semantic block content: {semantic_block_text}"
        )
    # A longer edition can move the end of this list to the next physical page.
    # Check the complete bounded block rather than only its opening page.
    tool_contract_block = text.split("A strong tool contract includes:", 1)[1].split(
        "The harness then enforces the contract:", 1
    )[0]
    tool_contract_items = [
        "one clear purpose",
        "typed, unambiguous arguments",
        "a strict input schema",
        "explicit read/write",
        "bounded pagination",
        "stable error codes",
        "timeouts, rate limits",
        "a contract version",
    ]
    item_positions = []
    for number, item in enumerate(tool_contract_items, start=1):
        match = re.search(
            rf"\b{number}\.\s+{re.escape(item)}",
            tool_contract_block,
            flags=re.IGNORECASE,
        )
        assert match, f"Tool-contract item {number} is not rendered as an ordered-list item"
        item_positions.append(match.start())
    assert item_positions == sorted(item_positions), "Tool-contract list order has changed"
    assert not re.search(r"\b000\b", text), "Unresolved page-number placeholder found"
    for label in [
        "CTX-01", "CTX-02", "AGT-01", "TOOL-01", "CACHE-01", "CACHE-02",
        "OUT-01", "OUT-02", "TOOL-02", "TOOL-03", "AUTH-01", "AUTH-02",
        "SERV-01", "SERV-02", "SERV-03", "SERV-04", "SERV-05", "SPEC-01",
        "QUANT-01", "QUANT-02", "QUANT-03", "QUANT-04", "DIST-01", "RAG-01",
        "RAG-02", "RAG-03", "RETR-01", "RETR-02", "RETR-03", "RETR-04",
        "RETR-05", "EVAL-01", "EVAL-02", "EVAL-03", "OBS-01", "OBS-02",
        "COST-01", "COST-02", "SAFE-01", "SAFE-02", "SAFE-03", "TEN-01", "OPT-01",
    ]:
        assert canonical(label) in canonical_text, f"Missing citation label: {label}"

    outline = list(flatten_outline(reader.outline))
    outline_title_list = [str(item.get("/Title", "")) for item in outline]
    outline_titles = canonical(" ".join(outline_title_list))
    assert len(outline) >= 70, f"Expected a rich outline, found {len(outline)} entries"
    for chapter in CHAPTERS:
        assert canonical(chapter) in outline_titles, f"Missing chapter bookmark: {chapter}"
    expected_back_matter = ["Notes and Sources", "Index of Terms"]
    if require_changelog:
        expected_back_matter.append("Changelog")
    for back_matter in expected_back_matter:
        assert canonical(back_matter) in outline_titles, f"Missing bookmark: {back_matter}"
    changelog_outline_count = sum(
        canonical(title) == canonical("Changelog")
        for title in outline_title_list
    )
    assert changelog_outline_count == (1 if require_changelog else 0), (
        f"Unexpected changelog bookmark count: {changelog_outline_count}"
    )
    for display_number, title in zip(SECTION_DISPLAY_NUMBERS, section_titles):
        section_outline_title = next(
            (
                outline_title
                for outline_title in outline_title_list
                if canonical(outline_title) == canonical(f"{display_number} {title}")
            ),
            None,
        )
        assert section_outline_title is not None, (
            f"Missing section bookmark: {display_number} {title}"
        )
        separator_index = len(display_number)
        assert (
            len(section_outline_title) > separator_index
            and section_outline_title.startswith(display_number)
            and section_outline_title[separator_index].isspace()
        ), (
            f"Section bookmark lacks a number/title separator: {section_outline_title}"
        )

    destination_names = set(destination_pages)
    changelog_start: int | None = None
    changelog_end: int | None = None
    if require_changelog:
        assert changelog.get("schemaVersion") == 2, (
            "A changed edition requires the detailed changelog schema"
        )
        assert "changelog" in destination_names, (
            "Required changelog destination is missing"
        )
        assert canonical("Changelog") in canonical(page_texts[2]), (
            "Required changelog contents entry is missing"
        )
        changelog_start = next(
            index
            for index, page_text in enumerate(page_texts)
            if index > index_start
            and "VERSION HISTORY" in page_text.upper()
            and "CHANGELOG" in page_text.upper()
        )
        changelog_end = len(page_texts) - 1
        assert destination_pages["changelog"] == changelog_start, (
            "Changelog destination does not match the visible opening page"
        )
        assert changelog_start <= changelog_end == len(page_texts) - 1, (
            "Changelog is not a contiguous terminal PDF range"
        )
        changelog_text = "\n".join(page_texts[changelog_start : changelog_end + 1])
        expected_changelog_texts = [
            (
                f"Compared with {changelog['previousVersion']}, "
                f"published {changelog['previousPublicationDate']}."
            ),
            changelog["summary"],
            *(
                value
                for item in changelog["items"]
                for value in (
                    item["changeId"],
                    item["classificationLabel"],
                    item["section"],
                    item["title"],
                    item["whatChanged"],
                    item["why"],
                    *(
                        source_value
                        for source in item["sources"]
                        for source_value in (
                            source["sourceId"],
                            source["authority"],
                            source["title"],
                            source["publicationDate"],
                        )
                    ),
                )
            ),
        ]
        for expected_changelog_text in expected_changelog_texts:
            assert canonical(expected_changelog_text) in canonical(changelog_text), (
                f"Missing changelog text: {expected_changelog_text}"
            )
        assert canonical(changelog["previousPdfSha256"]) not in canonical(changelog_text), (
            "The audit-only previous-PDF hash was printed in the reader changelog"
        )
        assert "INDEX OF TERMS" not in page_texts[changelog_start].upper(), (
            "Index content appears on the changelog opening page"
        )
        for page_text in page_texts[changelog_start + 1 : changelog_end + 1]:
            assert "CHANGELOG" in page_text.upper(), (
                "A changelog continuation page is missing its running head"
            )
            assert "INDEX OF TERMS" not in page_text.upper(), (
                "Index content appears inside the changelog range"
            )
    else:
        assert changelog.get("items") == [], (
            "Unchanged content must not carry changelog items"
        )
        assert all(
            not (
                "VERSION HISTORY" in page_text.upper()
                and "CHANGELOG" in page_text.upper()
            )
            for page_text in page_texts
        ), "Unexpected changelog page for unchanged content"
        assert canonical("Changelog") not in canonical(page_texts[2]), (
            "Unexpected changelog contents entry for unchanged content"
        )
        assert "changelog" not in destination_names, (
            "Unexpected changelog destination for unchanged content"
        )
        assert canonical(changelog["previousPdfSha256"]) not in canonical_text, (
            "Previous-PDF hash was printed despite the omitted changelog"
        )
    external_urls: list[str] = []
    changelog_external_urls: list[str] = []
    internal_links = 0
    broken_links = 0
    for page_index, page in enumerate(reader.pages):
        for annotation_ref in page.get("/Annots", []) or []:
            annotation = annotation_ref.get_object()
            action = annotation.get("/A")
            destination = annotation.get("/Dest")
            if action and str(action.get("/S")) == "/URI":
                external_url = str(action.get("/URI"))
                external_urls.append(external_url)
                if (
                    require_changelog
                    and changelog_start is not None
                    and changelog_end is not None
                    and changelog_start <= page_index <= changelog_end
                ):
                    rectangle = [float(value) for value in annotation.get("/Rect", [])]
                    assert len(rectangle) == 4, "Changelog source link has no rectangle"
                    x0, y0, x1, y1 = rectangle
                    assert x1 > x0 and y1 > y0, "Changelog source link has an empty rectangle"
                    assert (
                        0 <= x0 < x1 <= float(page.mediabox.width)
                        and 0 <= y0 < y1 <= float(page.mediabox.height)
                    ), "Changelog source link extends outside its page"
                    changelog_external_urls.append(external_url)
            elif destination is not None or (
                action and str(action.get("/S")) == "/GoTo"
            ):
                internal_links += 1
            else:
                broken_links += 1

    assert len(external_urls) >= 70
    assert len(set(external_urls)) >= 40
    assert any(url.rstrip("/") == AUTHOR_URL for url in external_urls), (
        "Author site link is missing from the PDF"
    )
    assert internal_links >= 250
    assert broken_links == 0
    invalid_urls = [
        url
        for url in external_urls
        if urlparse(url).scheme not in {"http", "https"}
    ]
    assert not invalid_urls, f"Invalid external URLs: {invalid_urls}"
    if require_changelog:
        expected_changelog_urls = {
            source["url"]
            for item in changelog["items"]
            for source in item["sources"]
        }
        assert set(changelog_external_urls) == expected_changelog_urls, (
            "Changelog source-link annotations do not match the structured primary evidence: "
            f"expected {sorted(expected_changelog_urls)}, found {sorted(set(changelog_external_urls))}"
        )

    logging.disable(logging.WARNING)
    blank_pages: list[int] = []
    sparse_pages: list[tuple[int, int]] = []
    overflow_pages: list[int] = []
    image_pages: list[int] = []
    image_paints_by_page: dict[int, int] = {}
    with pdfplumber.open(path) as pdf:
        validate_print_scale(pdf)
        for page_number, page in enumerate(pdf.pages, start=1):
            body_words = [
                word
                for word in page.extract_words(use_text_flow=True)
                if float(word["top"]) > 30
                and float(word["bottom"]) < page.height - 35
            ]
            body_chars = [
                char
                for char in page.chars
                if float(char["top"]) > 30 and float(char["bottom"]) < page.height - 35
            ]
            if require_changelog and page_number - 1 == changelog_start:
                assert body_words, "Changelog page has no body text"
                first_body_top = min(float(word["top"]) for word in body_words)
                first_body_line = " ".join(
                    str(word["text"])
                    for word in sorted(
                        (
                            word
                            for word in body_words
                            if abs(float(word["top"]) - first_body_top) < 2
                        ),
                        key=lambda word: float(word["x0"]),
                    )
                )
                assert canonical(first_body_line) == canonical("Version History"), (
                    "Changelog does not begin on a dedicated page; "
                    f"found body content first: {first_body_line}"
                )
            if not body_chars:
                blank_pages.append(page_number)
            if len(body_chars) < 80:
                sparse_pages.append((page_number, len(body_chars)))
            if page.images:
                image_pages.append(page_number)
                image_paints_by_page[page_number] = len(page.images)
            for char in page.chars:
                if (
                    float(char["x0"]) < -0.1
                    or float(char["x1"]) > page.width + 0.1
                    or float(char["top"]) < -0.1
                    or float(char["bottom"]) > page.height + 0.1
                ):
                    overflow_pages.append(page_number)
                    break

    assert not blank_pages, f"Blank pages: {blank_pages}"
    assert not overflow_pages, f"Text outside page bounds: {overflow_pages}"
    assert image_pages == chapter_opener_pages, (
        "Illustrated pages do not match the chapter openers: "
        f"expected {chapter_opener_pages}, found {image_pages}"
    )
    duplicate_image_paints = {
        page: count for page, count in image_paints_by_page.items() if count != 1
    }
    assert not duplicate_image_paints, (
        "Each chapter opener must paint exactly one illustration; found "
        f"{duplicate_image_paints}"
    )
    validate_chapter_art_compatibility(path, chapter_opener_pages)

    font_count = validate_fonts(path)
    print(
        "PASS — "
        f"{len(reader.pages)} A5 pages, {len(outline)} outline entries, "
        f"{internal_links} internal links, {len(external_urls)} external links, "
        f"12 opaque single-paint illustrations, {font_count} embedded font subsets, "
        f"and no blank body pages. Sparse body pages: {sparse_pages}."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--changelog", type=Path, help="Override the ledger (defaults to the saved cover-version ledger, or the working ledger for candidates and unsaved editions)")
    args = parser.parse_args()
    validate(args.pdf, args.changelog)


if __name__ == "__main__":
    main()
