#!/usr/bin/env python3
"""Exercise the real copied-book PDF path without a weekly run or publication.

Both fixtures preserve the canonical source, toolkit, and released PDF. The
changed fixture deliberately has several changelog pages and a legitimate
"Evidence reviewed" heading outside the cover. Synthetic fixture ledgers are
test inputs, never release recommendations or publication approval.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

from pypdf import PdfReader, PdfWriter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


BOOK = Path(__file__).resolve().parents[1]
TOOLKIT = Path(os.environ.get(
    "HANDBOOK_PUBLISHING_TOOLKIT", BOOK.parent / "publish-evidence-backed-handbook",
)).resolve()
UNCHANGED = "The handbook's reader-facing content is unchanged."
FIXTURE_DATE = "2026-10-05"
FIXTURE_SUFFIX = "-candidate.20261005.120000"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def protected_hashes() -> dict[str, str]:
    paths = {
        BOOK / name for name in [
            "AI_ENGINEERING_FIELD_GUIDE.md", "publication.json", "pdf-config.json",
            "reader-edition.json", "release-manifest.json",
            "automation/automation.toml", "automation/release-policy.json",
        ]
    }
    paths.update(path for path in (BOOK / "handbook").rglob("*")
                 if path.is_file() and "__pycache__" not in path.parts)
    paths.update((BOOK / "output/pdf").glob("*.pdf"))
    manifest_path = TOOLKIT / "references/specimen/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    paths.add(manifest_path)
    paths.update(TOOLKIT / relative for relative in manifest["inputs"])
    return {str(path): sha256(path) for path in sorted(paths)}


def run(command: list[str], env: dict[str, str], log: Path,
        *, succeeds: bool = True, expected_error: str | None = None) -> None:
    try:
        result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=300)
    except subprocess.TimeoutExpired as exception:
        output = "".join(value.decode() if isinstance(value, bytes) else value or ""
                         for value in [exception.stdout, exception.stderr])
        log.write_text(f"Timed out after 300 seconds: {command}\n{output}", encoding="utf-8")
        raise AssertionError(f"Command timed out: {log}") from exception
    output = result.stdout + result.stderr
    log.write_text(output, encoding="utf-8")
    if (result.returncode == 0) != succeeds:
        raise AssertionError(f"Unexpected exit {result.returncode}: {command}\n{log}\n{output}")
    if expected_error and not re.search(expected_error, output, re.IGNORECASE):
        raise AssertionError(f"Expected {expected_error!r} rejection: {log}\n{output}")


def synthetic_history() -> list[dict]:
    """Make pagination independent of how many changes the latest release has."""
    representative = None
    for release in sorted((BOOK / "handbook/releases").glob("version-*.json"), reverse=True):
        saved = json.loads(release.read_text(encoding="utf-8"))
        representative = next((item for item in saved.get("items", [])
                               if isinstance(item, dict) and item.get("sources")), None)
        if representative is not None:
            break
    assert representative is not None, "Need one retained primary-evidence entry for the fixture"
    classifications = [
        ("correction", "Correction"), ("addition", "Addition"),
        ("deprecation", "Deprecation"), ("clarification", "Clarification"),
    ]
    records = []
    for number in range(1, 13):
        classification, label = classifications[(number - 1) % len(classifications)]
        records.append({
            "changeId": f"CHG-{number:03d}", "classification": classification,
            "classificationLabel": label, "section": "24. Production readiness checklist",
            "title": "Evidence reviewed on 5 October 2026" if number == 1 else
                     f"Synthetic {classification} regression entry {number}",
            "whatChanged": (
                "This synthetic ledger entry accompanies the integration fixture paragraph. "
                "It exercises the what-changed block, section link, entry identifier, "
                "classification label, and primary-evidence link in a copied handbook. "
                "It does not propose a change to production guidance."
            ),
            "why": (
                "The PDF regression needs a multi-page terminal history to check "
                "dedicated-page placement, continuation furniture, searchable text, "
                "clickable evidence, and complete validation after the Index. "
                "The fixture tests rendering rather than the cited source's current claims."
            ),
            "sources": deepcopy(representative["sources"]),
        })
    return records


def copied_book(root: Path, changed: bool) -> tuple[Path, dict, dict[str, str]]:
    build = root / "build-source"
    shutil.copytree(BOOK / "handbook", build / "handbook",
                    ignore=shutil.ignore_patterns("__pycache__"))
    for relative in ["AI_ENGINEERING_FIELD_GUIDE.md", "publication.json", "pdf-config.json"]:
        shutil.copyfile(BOOK / relative, build / relative)
    config = json.loads((build / "pdf-config.json").read_text(encoding="utf-8"))
    baseline = build / config["releasedPdf"]
    baseline.parent.mkdir(parents=True)
    shutil.copyfile(BOOK / config["releasedPdf"], baseline)
    config["runningFont"] = str(TOOLKIT / "assets/design-system/fonts/NotoSans-Regular.ttf")
    config["baselineMode"] = "content-edition"
    (build / "pdf-config.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")

    source_path = build / "AI_ENGINEERING_FIELD_GUIDE.md"
    working = json.loads((BOOK / "handbook/changelog.json").read_text(encoding="utf-8"))
    assert working["summary"] == UNCHANGED and working["items"] == [], "Expected a released baseline ledger"
    ledger = deepcopy(working)
    if changed:
        source = source_path.read_text(encoding="utf-8")
        heading = re.search(r"(?m)^## 24\. Production readiness checklist\s*$", source)
        assert heading, "The regression fixture needs the production readiness section"
        source = source[:heading.end()] + (
            "\n\nIntegration fixture: validate the generated PDF before approving a content edition."
        ) + source[heading.end():]
        source_path.write_text(source, encoding="utf-8")
        ledger["items"] = synthetic_history()
        ledger["summary"] = (
            "Synthetic changed-edition regression fixture. These entries test "
            "pagination and are not a proposed publication."
        )
        ledger["entryDate"] = "October 5, 2026"
    ledger["currentSourceSha256"] = sha256(source_path)
    (build / "handbook/changelog.json").write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")
    env = {
        **os.environ,
        "PYTHONDONTWRITEBYTECODE": "1",
        "HANDBOOK_PUBLISHING_TOOLKIT": str(TOOLKIT),
        "HANDBOOK_AUTOMATION_PATH": str(BOOK / "automation/automation.toml"),
        "HANDBOOK_RELEASE_POLICY_PATH": str(BOOK / "automation/release-policy.json"),
        "HANDBOOK_CANDIDATE_DATE": FIXTURE_DATE,
        "HANDBOOK_VERSION_SUFFIX": FIXTURE_SUFFIX,
    }
    # A caller's release override must not defeat candidate ledger selection.
    env.pop("HANDBOOK_VERSION", None)
    return build, config, env


def integration(root: Path, changed: bool, browser: Path, playwright: Path) -> dict:
    root.mkdir()
    build, config, env = copied_book(root, changed)
    handbook = build / "handbook"
    renderer = TOOLKIT / "scripts/render-chromium-pdf.mjs"
    map_first = root / "page-map-pass-1.json"
    for number in [1, 2]:
        run(["node", str(handbook / "build-handbook.mjs")], env, root / f"html-build-pass-{number}.log")
        run(["node", str(handbook / "validate-handbook.mjs")], env, root / f"html-validation-pass-{number}.log")
        raw = root / f"raw-pass-{number}.pdf"
        run(["node", str(renderer), "--browser", str(browser),
             "--playwright-module", str(playwright), "--html", str(handbook / "index.html"),
             "--theme", "light", "--output", str(raw)], env, root / f"pdf-render-pass-{number}.log")
        if number == 1:
            run([sys.executable, str(handbook / "extract-page-map.py"), "--pdf", str(raw),
                 "--output", str(map_first)], env, root / "page-map-pass-1.log")
            shutil.copyfile(map_first, handbook / "page-map.json")
    final = root / "daytime.pdf"
    run([sys.executable, str(handbook / "finalize-pdf.py"), "--input", str(raw),
         "--output", str(final), "--config", str(build / "pdf-config.json"),
         "--book", str(build), "--baseline-mode", "content-edition", "--theme", "light"],
        env, root / "pdf-finalize.log")
    validator = [sys.executable, str(handbook / "validate-pdf.py")]
    run([*validator, str(final), "--theme", "light"], env, root / "pdf-validation.log")
    map_final = root / "page-map.json"
    run([sys.executable, str(handbook / "extract-page-map.py"), "--pdf", str(final),
         "--output", str(map_final)], env, root / "page-map.log")
    page_map = json.loads(map_final.read_text(encoding="utf-8"))
    assert page_map == json.loads(map_first.read_text(encoding="utf-8")), "The two-pass page map changed after finalization"
    reader = PdfReader(final, strict=True)
    assert reader.metadata.title == config["title"] + " · Daytime version"
    texts = [page.extract_text() or "" for page in reader.pages]
    if changed:
        start, end = page_map["changelog"] + 2, page_map["changelog-end"] + 2
        assert end == len(reader.pages) - 1 and end > start, "Need a multi-page terminal changelog"
        assert page_map["term-index"] < page_map["changelog"]
        assert "Evidence reviewed on 5 October 2026" in " ".join(" ".join(texts[start:]).split())
        # Mutate new test copies only. These negative fixtures prove the full
        # validator still rejects wrong identity and removed cover credits.
        bad_metadata = root / "negative-title.pdf"
        writer = PdfWriter(clone_from=reader)
        writer.pdf_header = reader.pdf_header
        writer.add_metadata({"/Title": config["title"]})
        with bad_metadata.open("wb") as stream:
            writer.write(stream)
        run([*validator, str(bad_metadata), "--theme", "light"], env,
            root / "negative-title.log", succeeds=False, expected_error="title")

        bad_cover = root / "negative-cover.pdf"
        buffer = BytesIO()
        pdfmetrics.registerFont(TTFont("IntegrationCover", config["runningFont"]))
        overlay = Canvas(buffer, pagesize=(420, 594.96), initialFontName="IntegrationCover")
        overlay.setFont("IntegrationCover", 9)
        overlay.drawString(40, 40, "Written by the regression fixture")
        overlay.save()
        buffer.seek(0)
        writer = PdfWriter(clone_from=reader)
        writer.pdf_header = reader.pdf_header
        writer.pages[0].merge_page(PdfReader(buffer).pages[0])
        with bad_cover.open("wb") as stream:
            writer.write(stream)
        run([*validator, str(bad_cover), "--theme", "light"], env,
            root / "negative-cover.log", succeeds=False, expected_error="cover")
    else:
        assert not {"changelog", "changelog-end"} & page_map.keys()
        assert not any("VERSION HISTORY" in text.upper() and "CHANGELOG" in text.upper() for text in texts)
    return {
        "status": "passed", "fixture": "changed" if changed else "unchanged",
        "pdf": str(final), "sha256": sha256(final), "pages": len(reader.pages),
        "title": reader.metadata.title, "changelogRequired": changed,
        "changelogPages": page_map.get("changelog-end", 0) - page_map.get("changelog", 0) + 1 if changed else 0,
        "pageMapStable": True, "negativeCases": ["bare legacy title with explicit theme", "removed cover credit"] if changed else [],
    }


def output_root(value: Path | None) -> Path:
    if value is None:
        return Path(tempfile.mkdtemp(prefix="weekly-pdf-integration-"))
    root = value.resolve()
    protected = [BOOK, TOOLKIT, Path("/Users/mike/Documents"), Path("/Users/mike/Desktop"),
                 Path("/Users/mike/Library/Mobile Documents")]
    assert not any(root == path or path in root.parents for path in protected), "Integration output must be isolated from production, frozen runs, toolkit, and iCloud"
    root.mkdir(parents=True, exist_ok=False)
    return root


def main() -> None:
    if not __debug__:
        raise RuntimeError("Integration assertions must not be disabled")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", required=True, type=Path)
    parser.add_argument("--playwright-module", required=True, type=Path)
    parser.add_argument("--output", type=Path, help="New isolated evidence directory; defaults to a temporary directory")
    args = parser.parse_args()
    browser, playwright = args.browser.resolve(), args.playwright_module.resolve()
    assert browser.is_file() and (playwright / "index.mjs").is_file(), "Missing browser or Playwright module"
    before = protected_hashes()
    root = output_root(args.output)
    records = []
    error = None
    try:
        for changed in [False, True]:
            records.append(integration(root / ("changed" if changed else "unchanged"), changed, browser, playwright))
    except Exception as exception:
        error = f"{type(exception).__name__}: {exception}"
    after = protected_hashes()
    preserved = before == after
    report = {"status": "passed" if error is None and preserved else "failed", "fixtures": records,
              "protectedInputsUnchanged": preserved, "protectedInputHashes": before,
              "evidence": str(root), "publicationApproved": False, "error": error}
    (root / "integration-results.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "protectedInputHashes"}, indent=2))
    if report["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
