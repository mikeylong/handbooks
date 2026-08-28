#!/usr/bin/env python3
"""Central runtime, path, and output helpers for the handbook package."""

from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
MINIMUM_PYTHON = (3, 9)
PINNED_PYPDF = "6.10.0"

PROGRAM_ENV = {
    "pdftoppm": "HANDBOOK_PDFTOPPM",
    "pdffonts": "HANDBOOK_PDFFONTS",
    "pdfimages": "HANDBOOK_PDFIMAGES",
    "magick": "HANDBOOK_MAGICK",
    "swift": "HANDBOOK_SWIFT",
}

PROGRAM_FALLBACK_DIRS = (
    Path("/opt/homebrew/bin"),
    Path("/usr/local/bin"),
)

BROWSER_NAMES = (
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
    "chrome",
    "msedge",
    "brave-browser",
)

BROWSER_APPLICATIONS = (
    Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
    Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    Path("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
    Path.home() / "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    Path.home() / "Applications/Chromium.app/Contents/MacOS/Chromium",
    Path.home() / "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    Path.home() / "Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
)


def ensure_supported_python() -> None:
    if sys.version_info < MINIMUM_PYTHON:
        required = ".".join(str(part) for part in MINIMUM_PYTHON)
        actual = f"{sys.version_info.major}.{sys.version_info.minor}"
        raise SystemExit(f"Python {required} or newer is required; found {actual}")


def _executable(candidate: str | Path | None) -> str | None:
    if not candidate:
        return None
    path = Path(candidate).expanduser()
    if path.is_file() and os.access(path, os.X_OK):
        return str(path.resolve())
    return None


def find_program(name: str, *, required: bool = True) -> str | None:
    candidates: list[str | Path | None] = [os.environ.get(PROGRAM_ENV.get(name, ""))]
    candidates.append(shutil.which(name))
    candidates.extend(directory / name for directory in PROGRAM_FALLBACK_DIRS)
    for candidate in candidates:
        executable = _executable(candidate)
        if executable:
            return executable
    if required:
        override = PROGRAM_ENV.get(name)
        hint = f" or set {override}" if override else ""
        raise SystemExit(f"Required program not found: {name}{hint}")
    return None


def find_browser(explicit: str | None = None) -> str:
    candidates: list[str | Path | None] = [
        explicit,
        os.environ.get("HANDBOOK_BROWSER"),
    ]
    candidates.extend(shutil.which(name) for name in BROWSER_NAMES)
    candidates.extend(BROWSER_APPLICATIONS)
    for candidate in candidates:
        executable = _executable(candidate)
        if executable:
            return executable
    raise SystemExit(
        "No Chromium-family browser found. Pass --browser or set HANDBOOK_BROWSER."
    )


def safe_output_file(path: Path, label: str) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise SystemExit(f"{label} cannot be a symlink: {expanded}")
    absolute = expanded if expanded.is_absolute() else Path.cwd() / expanded
    resolved = absolute.resolve(strict=False)
    if resolved.exists() and not resolved.is_file():
        raise SystemExit(f"{label} must be a file path: {expanded}")
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved


def safe_output_dir(path: Path, label: str) -> Path:
    expanded = path.expanduser()
    if expanded.is_symlink():
        raise SystemExit(f"{label} cannot be a symlink: {expanded}")
    absolute = expanded if expanded.is_absolute() else Path.cwd() / expanded
    resolved = absolute.resolve(strict=False)
    if resolved.exists() and not resolved.is_dir():
        raise SystemExit(f"{label} must be a directory path: {expanded}")
    resolved.mkdir(parents=True, exist_ok=True)
    return resolved


def atomic_write_text(path: Path, text: str, *, label: str = "Output") -> Path:
    destination = safe_output_file(path, label)
    handle, temporary_name = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=".tmp", dir=destination.parent
    )
    temporary = Path(temporary_name)
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
        os.replace(temporary, destination)
    finally:
        if temporary.exists():
            temporary.unlink()
    return destination


def display_path(path: Path, *, bases: Iterable[Path] = ()) -> str:
    resolved = path.expanduser().resolve()
    for base in (*bases, PACKAGE_ROOT):
        try:
            return resolved.relative_to(base.expanduser().resolve()).as_posix()
        except ValueError:
            continue
    return resolved.name


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def program_version(executable: str, arguments: list[str]) -> str:
    result = subprocess.run(
        [executable, *arguments], capture_output=True, text=True, check=False
    )
    output = (result.stdout or result.stderr).strip()
    return output.splitlines()[0] if output else f"exit {result.returncode}"
