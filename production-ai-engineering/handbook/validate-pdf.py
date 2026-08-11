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
    "Harness engineering, not just prompt engineering",
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


def canonical(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def flatten_outline(items):
    for item in items:
        if isinstance(item, list):
            yield from flatten_outline(item)
        else:
            yield item


def load_changelog() -> tuple[dict, bool]:
    ledger_path = Path(__file__).with_name("changelog.json")
    ledger = json.loads(ledger_path.read_text(encoding="utf-8"))
    summary = ledger.get("summary")
    if not isinstance(summary, str):
        raise AssertionError("Changelog summary is missing")
    return ledger, summary.strip() != UNCHANGED_CHANGELOG_SUMMARY


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


def validate(path: Path) -> None:
    assert path.is_file(), f"Missing PDF: {path}"
    changelog, require_changelog = load_changelog()
    reader = PdfReader(path, strict=True)
    minimum_pages = 75 if require_changelog else 74
    assert minimum_pages <= len(reader.pages) <= 90, (
        f"Unexpected page count: {len(reader.pages)}"
    )

    metadata = reader.metadata
    assert metadata.title == BOOK_TITLE
    assert metadata.author == AUTHOR
    assert metadata.subject == SUBTITLE
    assert reader.page_mode == "/UseOutlines"
    assert reader.page_labels[:4] == ["Cover", "ii", "iii", "1"]
    assert reader.page_labels[-1] == str(len(reader.pages) - 3)

    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        assert abs(width - 420.0) < 0.1 and abs(height - 594.96) < 0.1, (
            f"Non-A5 page found: {width:.2f} x {height:.2f} pt"
        )

    page_texts = [page.extract_text() or "" for page in reader.pages]
    text = "\n".join(page_texts)
    canonical_text = canonical(text)
    assert canonical(AUTHOR_CREDIT) in canonical(page_texts[0]), (
        "Approved linked author line is missing from the cover"
    )
    assert canonical("Bainbridge Island") not in canonical(text), (
        "Removed author location remains"
    )
    assert "WRITTEN BY" not in page_texts[0].upper(), "Removed cover label remains"
    assert "EVIDENCE REVIEWED" not in text.upper(), "Removed review label remains"
    assert "FIRST EDITION" not in page_texts[0].upper(), "Edition label remains on the cover"
    assert "JULY 2026" not in page_texts[0].upper(), "Edition date remains on the cover"
    assert canonical("Dedication") not in canonical(page_texts[0]), "Removed dedication label remains"
    assert canonical("For Corban, Luca, and Lela") not in canonical(page_texts[0]), (
        "Removed cover dedication remains"
    )
    assert "PREMISE" not in page_texts[1].upper(), "Premise label remains on the foreword"
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
        *SECTIONS,
    ]
    if require_changelog:
        expected_text.append("Changelog")
    for expected in expected_text:
        assert canonical(expected) in canonical_text, f"Missing text: {expected}"
    assert len(SECTION_DISPLAY_NUMBERS) == len(SECTIONS)
    for old_number, (display_number, title) in enumerate(
        zip(SECTION_DISPLAY_NUMBERS, SECTIONS), start=1
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
    tool_contract_page = next(
        page_text for page_text in page_texts
        if "A strong tool contract includes:" in page_text
    )
    tool_contract_block = tool_contract_page.split(
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
    for display_number, title in zip(SECTION_DISPLAY_NUMBERS, SECTIONS):
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

    appendix_start = next(
        index
        for index, page_text in enumerate(page_texts)
        if "APPENDIX A" in page_text.upper() and "NOTES AND SOURCES" in page_text.upper()
    )
    index_start = next(
        index
        for index, page_text in enumerate(page_texts)
        if index > appendix_start and "INDEX OF TERMS" in page_text.upper()
    )
    destination_names = {
        str(name).lstrip("/") for name in reader.named_destinations
    }
    if require_changelog:
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
        assert changelog_start == len(page_texts) - 1, (
            "Changelog is not the final PDF page"
        )
        changelog_text = page_texts[changelog_start]
        expected_changelog_texts = [
            (
                f"Compared with {changelog['previousVersion']}, "
                f"published {changelog['previousPublicationDate']}."
            ),
            changelog["summary"],
            changelog["previousPdfSha256"],
            *(
                value
                for item in changelog["items"]
                for value in (item["category"], item["text"])
            ),
        ]
        for expected_changelog_text in expected_changelog_texts:
            assert canonical(expected_changelog_text) in canonical(changelog_text), (
                f"Missing changelog text: {expected_changelog_text}"
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
    assert "NOTES AND SOURCES" in page_texts[appendix_start + 1].upper(), (
        "Appendix running head is missing from the page after the opener"
    )
    assert "INDEX OF TERMS" in page_texts[index_start + 1].upper(), (
        "Index running head is missing from the page after the opener"
    )

    external_urls: list[str] = []
    internal_links = 0
    broken_links = 0
    for page in reader.pages:
        for annotation_ref in page.get("/Annots", []) or []:
            annotation = annotation_ref.get_object()
            action = annotation.get("/A")
            destination = annotation.get("/Dest")
            if action and str(action.get("/S")) == "/URI":
                external_urls.append(str(action.get("/URI")))
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

    logging.disable(logging.WARNING)
    blank_pages: list[int] = []
    sparse_pages: list[tuple[int, int]] = []
    overflow_pages: list[int] = []
    image_pages: list[int] = []
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            body_chars = [
                char
                for char in page.chars
                if float(char["top"]) > 30 and float(char["bottom"]) < page.height - 35
            ]
            if not body_chars:
                blank_pages.append(page_number)
            if len(body_chars) < 80:
                sparse_pages.append((page_number, len(body_chars)))
            if page.images:
                image_pages.append(page_number)
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
    assert len(image_pages) == 12, f"Expected 12 illustrated pages, found {image_pages}"

    font_count = validate_fonts(path)
    print(
        "PASS — "
        f"{len(reader.pages)} A5 pages, {len(outline)} outline entries, "
        f"{internal_links} internal links, {len(external_urls)} external links, "
        f"12 illustrations, {font_count} embedded font subsets, "
        f"and no blank body pages. Sparse body pages: {sparse_pages}."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    args = parser.parse_args()
    validate(args.pdf)


if __name__ == "__main__":
    main()
