#!/usr/bin/env python3
"""Run the conditional-changelog workflow regression suite end to end."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

from runtime_support import atomic_write_text, safe_output_file


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = PACKAGE_ROOT / "scripts"
SOURCE = PACKAGE_ROOT / "references/specimen/source/specimen.html"
SPECIMEN = PACKAGE_ROOT / "references/specimen/canonical-handbook-specimen.pdf"
SPECIMEN_MAP = PACKAGE_ROOT / "references/specimen/canonical-page-map.json"
UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged."


def run(command: list[str], expected_success: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if expected_success and result.returncode != 0:
        raise SystemExit(
            f"Command failed ({result.returncode}): {' '.join(command)}\n"
            f"{result.stdout}\n{result.stderr}"
        )
    if not expected_success and result.returncode == 0:
        raise SystemExit(f"Command unexpectedly passed: {' '.join(command)}")
    return result


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser")
    parser.add_argument("--disable-browser-sandbox", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    output = safe_output_file(args.output, "Output") if args.output else None

    build_base = [
        sys.executable,
        str(SCRIPTS / "build-specimen.py"),
        "--changelog-mode",
        "omit",
    ]
    if args.browser:
        build_base[2:2] = ["--browser", args.browser]
    if args.disable_browser_sandbox:
        build_base.append("--disable-browser-sandbox")

    with tempfile.TemporaryDirectory(prefix="handbook-edition-test-") as temp_name:
        temp = Path(temp_name)
        previous_pdf = temp / "previous.pdf"
        candidate_pdf = temp / "candidate.pdf"
        previous_map = temp / "previous-page-map.json"
        candidate_map = temp / "candidate-page-map.json"
        for pdf, page_map in ((previous_pdf, previous_map), (candidate_pdf, candidate_map)):
            run(build_base + ["--output", str(pdf), "--page-map-output", str(page_map)])

        comparison = temp / "comparison"
        run(
            [
                sys.executable,
                str(SCRIPTS / "compare-editions.py"),
                "--previous-pdf",
                str(previous_pdf),
                "--candidate-pdf",
                str(candidate_pdf),
                "--previous-source",
                str(SOURCE),
                "--candidate-source",
                str(SOURCE),
                "--previous-page-map",
                str(previous_map),
                "--candidate-page-map",
                str(candidate_map),
                "--output-dir",
                str(comparison),
            ]
        )
        identical_diff = load(comparison / "edition-diff.json")
        if identical_diff["summary"] != UNCHANGED_SUMMARY:
            raise SystemExit("Identical unchanged fixtures were classified as changed")

        ledger = temp / "unchanged-ledger.json"
        shutil.copyfile(PACKAGE_ROOT / "assets/design-system/templates/change-ledger.json", ledger)
        unchanged_decision_path = temp / "unchanged-decision.json"
        changelog_markdown = temp / "changelog.md"
        run(
            [
                sys.executable,
                str(SCRIPTS / "decide-changelog.py"),
                "--edition-diff",
                str(comparison / "edition-diff.json"),
                "--change-ledger",
                str(ledger),
                "--output",
                str(unchanged_decision_path),
                "--markdown-output",
                str(changelog_markdown),
            ]
        )
        if changelog_markdown.exists():
            raise SystemExit("Unchanged decision emitted a changelog Markdown artifact")

        changelog_markdown.write_text("# Stale changelog\n", encoding="utf-8")
        stale_decision_path = temp / "stale-decision.json"
        run(
            [
                sys.executable,
                str(SCRIPTS / "decide-changelog.py"),
                "--edition-diff",
                str(comparison / "edition-diff.json"),
                "--change-ledger",
                str(ledger),
                "--output",
                str(stale_decision_path),
                "--markdown-output",
                str(changelog_markdown),
            ],
            expected_success=False,
        )
        stale_decision = load(stale_decision_path)
        if not any("Refusing to leave" in item for item in stale_decision["failures"]):
            raise SystemExit("Unchanged workflow did not reject a stale changelog artifact")
        changelog_markdown.unlink()

        unchanged_validation_path = temp / "unchanged-validation.json"
        run(
            [
                sys.executable,
                str(SCRIPTS / "validate-pdf.py"),
                "--profile",
                "candidate",
                "--pdf",
                str(candidate_pdf),
                "--page-map",
                str(candidate_map),
                "--changelog-decision",
                str(unchanged_decision_path),
                "--output",
                str(unchanged_validation_path),
            ]
        )

        copied_specimen_map = temp / "specimen-page-map.json"
        copied_specimen_payload = load(SPECIMEN_MAP)
        copied_specimen_payload["artifactProfile"] = "candidate-fixture"
        write(copied_specimen_map, copied_specimen_payload)
        negative_validation_path = temp / "negative-validation.json"
        run(
            [
                sys.executable,
                str(SCRIPTS / "validate-pdf.py"),
                "--profile",
                "candidate",
                "--pdf",
                str(SPECIMEN),
                "--page-map",
                str(copied_specimen_map),
                "--changelog-decision",
                str(unchanged_decision_path),
                "--output",
                str(negative_validation_path),
            ],
            expected_success=False,
        )
        negative_validation = load(negative_validation_path)
        if not any("forbids changelog pages" in item for item in negative_validation["failures"]):
            raise SystemExit("Negative gate did not identify the prohibited changelog page")

        circular_comparison = temp / "circular-comparison"
        run(
            [
                sys.executable,
                str(SCRIPTS / "compare-editions.py"),
                "--previous-pdf",
                str(SPECIMEN),
                "--candidate-pdf",
                str(candidate_pdf),
                "--previous-page-map",
                str(SPECIMEN_MAP),
                "--candidate-page-map",
                str(candidate_map),
                "--output-dir",
                str(circular_comparison),
            ]
        )
        circular_diff = load(circular_comparison / "edition-diff.json")
        if circular_diff["summary"] != UNCHANGED_SUMMARY:
            raise SystemExit("Removing derivative changelog surfaces caused a circular change decision")
        if not circular_diff["comparisons"]["rawPdfTextChanged"]:
            raise SystemExit("Circular regression fixture did not preserve the raw exact diff")
        if (circular_comparison / "reader-facing-content.patch").stat().st_size != 0:
            raise SystemExit("Derivative changelog removal leaked into the substantive patch")

        changed_diff_path = temp / "changed-diff.json"
        changed_ledger_path = temp / "changed-ledger.json"
        changed_decision_path = temp / "changed-decision.json"
        write(
            changed_diff_path,
            {
                "schemaVersion": 2,
                "readerFacingContentChanged": True,
                "summary": "The candidate contains reader-facing changes that require semantic classification.",
            },
        )
        write(
            changed_ledger_path,
            {
                "schemaVersion": 1,
                "readerFacingContentChanged": True,
                "summary": "Three evidence-backed specimen changes.",
                "changes": [
                    {
                        "category": "Addition",
                        "section": "Evidence",
                        "text": "Added a claim-level evidence ledger.",
                        "rationale": "This lets readers trace important assertions to direct sources.",
                        "sources": ["https://www.w3.org/TR/WCAG22/"],
                    },
                    {
                        "category": "Deprecation or removal",
                        "section": "Recommendations",
                        "text": "Removed an outdated recommendation.",
                        "rationale": "The governing specification changed.",
                        "sources": ["https://www.w3.org/TR/css-page-3/"],
                    },
                    {
                        "category": "Correction or clarification",
                        "section": "Compatibility",
                        "text": "Clarified that successful browser rendering does not establish compatibility with every PDF engine.",
                        "rationale": "This prevents browser-only output from being mistaken for cross-renderer proof.",
                        "sources": [
                            "https://pdfa.org/resource/pdf-specification-index/"
                        ],
                    }
                ],
            },
        )
        run(
            [
                sys.executable,
                str(SCRIPTS / "decide-changelog.py"),
                "--edition-diff",
                str(changed_diff_path),
                "--change-ledger",
                str(changed_ledger_path),
                "--output",
                str(changed_decision_path),
            ]
        )
        changed_validation_path = temp / "changed-validation.json"
        run(
            [
                sys.executable,
                str(SCRIPTS / "validate-pdf.py"),
                "--profile",
                "candidate",
                "--pdf",
                str(SPECIMEN),
                "--page-map",
                str(copied_specimen_map),
                "--changelog-decision",
                str(changed_decision_path),
                "--output",
                str(changed_validation_path),
            ]
        )

        report = {
            "schemaVersion": 1,
            "status": "passed",
            "tests": {
                "unchangedBuildOmitsChangelog": True,
                "unchangedFixturePages": len(load(candidate_map)["pages"]),
                "unchangedDecisionSummary": identical_diff["summary"],
                "unchangedCandidateValidation": load(unchanged_validation_path)["status"],
                "staleChangelogArtifactRejected": stale_decision["status"] == "failed",
                "mismatchedCandidateRejected": negative_validation["status"] == "failed",
                "derivativeRemovalRawDiffBytes": (circular_comparison / "exact-pdf-text.patch").stat().st_size,
                "derivativeRemovalSubstantiveDiffBytes": (circular_comparison / "reader-facing-content.patch").stat().st_size,
                "derivativeRemovalDecision": circular_diff["summary"],
                "changedCandidateValidation": load(changed_validation_path)["status"],
            },
            "command": "python3 scripts/test-edition-workflow.py --output <report.json>",
            "limitations": [
                "The regression suite verifies workflow logic and structural gates; visual and renderer evidence is recorded separately.",
                "Raw PDF-text diff byte counts can vary when renderer text extraction changes; the required invariant is nonzero raw diff and zero substantive diff.",
            ],
        }

    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if output:
        atomic_write_text(output, text, label="Output")
    print(text, end="")


if __name__ == "__main__":
    main()
