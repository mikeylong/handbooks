#!/usr/bin/env python3
"""Validate a semantic change ledger and decide whether to include a changelog."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse

from runtime_support import atomic_write_text, safe_output_file


UNCHANGED_SUMMARY = "The handbook's reader-facing content is unchanged."
ALLOWED_CATEGORIES = {
    "Addition",
    "Deprecation or removal",
    "Correction or clarification",
}


def load_json(path: Path, label: str) -> dict:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise SystemExit(f"{label} cannot be a symlink: {expanded}")
    resolved = expanded.resolve()
    if not resolved.is_file():
        raise SystemExit(f"Missing {label}: {resolved}")
    return json.loads(resolved.read_text(encoding="utf-8"))


def valid_source_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--edition-diff", type=Path, required=True)
    parser.add_argument("--change-ledger", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--markdown-output", type=Path)
    args = parser.parse_args()

    diff = load_json(args.edition_diff, "edition diff")
    ledger = load_json(args.change_ledger, "change ledger")
    changed = bool(diff.get("readerFacingContentChanged"))
    ledger_changed = bool(ledger.get("readerFacingContentChanged"))
    changes = ledger.get("changes")
    if not isinstance(changes, list):
        raise SystemExit("Change ledger 'changes' must be an array")
    if changed != ledger_changed:
        raise SystemExit("Edition diff and change ledger disagree about reader-facing change")

    failures: list[str] = []
    include = changed
    if not changed:
        if ledger.get("summary") != UNCHANGED_SUMMARY:
            failures.append(f"Unchanged summary must be exactly: {UNCHANGED_SUMMARY}")
        if changes:
            failures.append("Unchanged content cannot have changelog entries")
    else:
        if not changes:
            failures.append("Changed reader-facing content requires changelog entries")
        if len(changes) > 8:
            failures.append("Changelog supports at most eight concise entries")
        for index, change in enumerate(changes, start=1):
            category = change.get("category")
            if category not in ALLOWED_CATEGORIES:
                failures.append(f"Change {index} has invalid category: {category}")
            for field in ("section", "text", "rationale"):
                if not isinstance(change.get(field), str) or not change[field].strip():
                    failures.append(f"Change {index} is missing {field}")
            sources = change.get("sources")
            if not isinstance(sources, list) or not sources:
                failures.append(f"Change {index} requires direct source URLs")
            elif any(not isinstance(url, str) or not valid_source_url(url) for url in sources):
                failures.append(f"Change {index} has an invalid direct source URL")

    markdown_output = (
        safe_output_file(args.markdown_output, "Changelog output")
        if args.markdown_output
        else None
    )
    if not include and markdown_output and markdown_output.exists():
        failures.append(
            "Refusing to leave a changelog Markdown artifact when it should be omitted"
        )

    decision = {
        "schemaVersion": 1,
        "status": "passed" if not failures else "failed",
        "includeChangelog": include and not failures,
        "readerFacingContentChanged": changed,
        "summary": ledger.get("summary"),
        "entryCount": len(changes),
        "failures": failures,
        "placement": "final-page" if include else None,
        "requiredPdfState": {
            "changelogPages": 1 if include else 0,
            "finalPage": bool(include),
            "navigationEntry": bool(include),
            "outlineEntry": bool(include),
        },
        "navigationLabels": ["Changelog", "Version history"],
        "expectedEntries": changes if include and not failures else [],
    }
    output = safe_output_file(args.output, "Decision output")
    atomic_write_text(
        output, json.dumps(decision, indent=2) + "\n", label="Decision output"
    )

    if include and not failures and markdown_output:
        markdown = [
            "# Changelog\n",
            f"\n{ledger.get('summary', '').strip()}\n",
        ]
        for change in changes:
            markdown.append(
                f"\n## {change['category']}\n\n{change['text'].strip()} "
                f"{change['rationale'].strip()}\n\n"
            )
            for url in change["sources"]:
                markdown.append(f"- {url}\n")
        atomic_write_text(
            markdown_output, "".join(markdown), label="Changelog output"
        )

    print(json.dumps(decision, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
