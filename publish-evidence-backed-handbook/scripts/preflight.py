#!/usr/bin/env python3
"""Verify the reference handbook runtime before building or validating artifacts."""

from __future__ import annotations

import importlib.metadata
import json
import platform
import sys

from runtime_support import (
    PINNED_PYPDF,
    ensure_supported_python,
    find_browser,
    find_program,
    program_version,
)


def main() -> None:
    failures: list[str] = []
    try:
        ensure_supported_python()
    except SystemExit as error:
        failures.append(str(error))

    try:
        pypdf_version = importlib.metadata.version("pypdf")
    except importlib.metadata.PackageNotFoundError:
        pypdf_version = "missing"
        failures.append("pypdf is missing; install requirements.txt in this environment")
    if pypdf_version != "missing" and pypdf_version != PINNED_PYPDF:
        failures.append(
            f"pypdf {PINNED_PYPDF} is required; found {pypdf_version}"
        )

    tools: dict[str, str] = {}
    checks = {
        "browser": (lambda: find_browser(), ["--version"]),
        "pdftoppm": (lambda: find_program("pdftoppm"), ["-v"]),
        "pdffonts": (lambda: find_program("pdffonts"), ["-v"]),
        "pdfimages": (lambda: find_program("pdfimages"), ["-v"]),
        "magick": (lambda: find_program("magick"), ["-version"]),
        "swift": (lambda: find_program("swift"), ["--version"]),
    }
    for name, (resolver, version_args) in checks.items():
        try:
            executable = resolver()
            assert executable is not None
            tools[name] = program_version(executable, version_args)
        except (SystemExit, OSError) as error:
            failures.append(str(error))

    report = {
        "schemaVersion": 1,
        "status": "passed" if not failures else "failed",
        "python": platform.python_version(),
        "pypdf": pypdf_version,
        "tools": tools,
        "failures": failures,
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
