#!/usr/bin/env python3
"""Validate skill integrity, privacy, agent neutrality, and specimen proof binding."""

from __future__ import annotations

import argparse
import getpass
import json
import re
import socket
from pathlib import Path, PurePosixPath
from typing import Any

from pypdf import PdfReader

from runtime_support import atomic_write_text, safe_output_file, sha256_file


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_RELATIVE = "references/specimen/manifest.json"
BINARY_SUFFIXES = {".pdf", ".webp", ".ttf", ".woff2", ".png", ".zip"}
LICENSE_NAMES = {
    "SOURCE-SERIF-4-LICENSE.txt",
    "NOTO-SANS-LICENSE.txt",
    "SOURCE-CODE-PRO-LICENSE.md",
}
FORBIDDEN_PARTS = {".DS_Store", "__MACOSX", ".env"}
LOCAL_STATE_PARTS = {".git", ".venv", "__pycache__"}


def portable_member(value: Any, label: str, failures: list[str]) -> PurePosixPath | None:
    if not isinstance(value, str) or not value:
        failures.append(f"{label} must be a non-empty relative path")
        return None
    member = PurePosixPath(value)
    if member.is_absolute() or ".." in member.parts or "\\" in value:
        failures.append(f"{label} is not a safe POSIX-relative path: {value}")
        return None
    return member


def dereference(value: Any) -> Any:
    return value.get_object() if hasattr(value, "get_object") else value


def local_state(path: Path, package: Path) -> bool:
    relative = path.relative_to(package)
    return any(part in LOCAL_STATE_PARTS for part in relative.parts) or path.suffix == ".pyc"


def emit(report: dict[str, Any], output: Path | None) -> None:
    text = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if output:
        destination = safe_output_file(output, "Validation report")
        atomic_write_text(destination, text, label="Validation report")
    print(text, end="")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, default=PACKAGE_ROOT)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    package_input = args.package.expanduser()
    if package_input.is_symlink():
        raise SystemExit(f"Package cannot be a symlink: {package_input}")
    package = package_input.resolve()
    if not package.is_dir():
        raise SystemExit(f"Package must be a directory: {package}")
    report_output = (
        safe_output_file(args.output, "Validation report") if args.output else None
    )
    if report_output:
        try:
            report_output.relative_to(package)
        except ValueError:
            pass
        else:
            raise SystemExit("Validation report output must be outside the package")

    failures: list[str] = []
    required = [
        ".gitattributes",
        ".gitignore",
        "SKILL.md",
        "handbook-spec.json",
        "requirements.txt",
        "references/design-system.md",
        "references/editorial-quality.md",
        "references/research-and-evidence.md",
        "references/edition-and-release.md",
        "references/quality-gates.md",
        "references/specimen/canonical-handbook-specimen.pdf",
        "references/specimen/canonical-page-map.json",
        MANIFEST_RELATIVE,
        "references/specimen/validation.json",
        "references/specimen/compatibility-matrix.json",
        "references/specimen/workflow-regression.json",
        "references/specimen/source/specimen.html",
        "assets/design-system/tokens.json",
        "assets/design-system/print.css",
        "assets/design-system/illustration-reference.webp",
        "assets/design-system/fonts/source-serif-4-latin-variable.woff2",
        "assets/design-system/fonts/source-serif-4-latin-variable-italic.woff2",
        "assets/design-system/fonts/NotoSans-Regular.ttf",
        "assets/design-system/fonts/NotoSans-Bold.ttf",
        "assets/design-system/fonts/SourceCodePro-Regular.ttf",
        "assets/design-system/fonts/SourceCodePro-Semibold.ttf",
        "assets/design-system/fonts/SOURCE-SERIF-4-LICENSE.txt",
        "assets/design-system/fonts/NOTO-SANS-LICENSE.txt",
        "assets/design-system/fonts/SOURCE-CODE-PRO-LICENSE.md",
        "scripts/runtime_support.py",
        "scripts/preflight.py",
        "scripts/package-skill.py",
        "scripts/render-pdfkit.swift",
    ]
    for relative in required:
        path = package.joinpath(*PurePosixPath(relative).parts)
        if not path.is_file():
            failures.append(f"Missing required file: {relative}")
        elif path.is_symlink():
            failures.append(f"Required file cannot be a symlink: {relative}")

    if failures:
        report = {
            "schemaVersion": 1,
            "status": "failed",
            "package": package.name,
            "failures": failures,
            "stats": {"files": 0, "specimenPages": 0},
        }
        emit(report, report_output)
        raise SystemExit(1)

    actual_files = {
        path.relative_to(package).as_posix()
        for path in package.rglob("*")
        if path.is_file()
        and not local_state(path, package)
    }
    for relative in sorted(actual_files):
        member = PurePosixPath(relative)
        if any(part in FORBIDDEN_PARTS or part.startswith("._") for part in member.parts):
            failures.append(f"Forbidden package path: {relative}")
    for path in package.rglob("*"):
        if not local_state(path, package) and path.is_symlink():
            failures.append(f"Package contains symlink: {path.relative_to(package).as_posix()}")

    skill = (package / "SKILL.md").read_text(encoding="utf-8")
    frontmatter = re.match(r"^---\n(.*?)\n---\n", skill, flags=re.DOTALL)
    if not frontmatter:
        failures.append("SKILL.md frontmatter is missing")
    else:
        block = frontmatter.group(1)
        fields = [
            line.split(":", 1)[0].strip()
            for line in block.splitlines()
            if ":" in line
        ]
        if fields != ["name", "description"]:
            failures.append(f"SKILL.md frontmatter is not portable: {fields}")
        if "name: publish-evidence-backed-handbook" not in block:
            failures.append("SKILL.md has the wrong skill name")

    platform_brand = "Co" + "dex"
    platform_home = "CODE" + "X_HOME"
    platform_metadata_path = "agents/" + "open" + "ai.yaml"
    platform_policy_key = "allow_implicit_" + "invocation"
    file_scheme = "fi" + "le://"
    posix_users = "(?:" + "Users|users|home" + ")"
    windows_users = "Users"
    current_user = getpass.getuser()
    current_host = socket.gethostname()
    forbidden = {
        "agent-platform brand": re.compile(rf"\b{re.escape(platform_brand)}\b", re.IGNORECASE),
        "agent-platform home": re.compile(re.escape(platform_home)),
        "agent-platform metadata": re.compile(
            re.escape(platform_metadata_path) + "|" + re.escape(platform_policy_key)
        ),
        "personal POSIX path": re.compile(rf"/{posix_users}/[^/\s]+/"),
        "personal Windows path": re.compile(
            rf"[A-Za-z]:[\\/]+{windows_users}[\\/]+[^\\/\s]+[\\/]",
            re.IGNORECASE,
        ),
        "UNC path": re.compile(r"\\\\[^\\/\s]+[\\/][^\\/\s]+[\\/]"),
        "local file URI": re.compile(re.escape(file_scheme), re.IGNORECASE),
        "email address": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    }
    if current_user:
        forbidden["current username"] = re.compile(
            rf"\b{re.escape(current_user)}\b", re.IGNORECASE
        )
    if current_host and current_host.lower() not in {"localhost", "localhost.local"}:
        forbidden["current hostname"] = re.compile(
            rf"\b{re.escape(current_host)}\b", re.IGNORECASE
        )

    for relative in sorted(actual_files):
        path = package.joinpath(*PurePosixPath(relative).parts)
        if path.name in LICENSE_NAMES or path.suffix.lower() in BINARY_SUFFIXES:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for label, pattern in forbidden.items():
            if pattern.search(content):
                failures.append(f"{relative} contains forbidden {label}")

    personal_binary_markers = [
        ("/" + "Users" + "/" + current_user + "/").encode(),
        ("/" + "home" + "/" + current_user + "/").encode(),
        current_host.encode() if current_host else b"",
    ]
    for relative in sorted(actual_files):
        path = package.joinpath(*PurePosixPath(relative).parts)
        if path.suffix.lower() not in BINARY_SUFFIXES:
            continue
        data = path.read_bytes()
        if any(marker and marker in data for marker in personal_binary_markers):
            failures.append(f"{relative} contains a personal binary marker")

    for json_path in package.rglob("*.json"):
        if local_state(json_path, package):
            continue
        try:
            json.loads(json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            failures.append(
                f"Invalid JSON {json_path.relative_to(package).as_posix()}: {error}"
            )

    spec = json.loads((package / "handbook-spec.json").read_text(encoding="utf-8"))
    tokens = json.loads(
        (package / "assets/design-system/tokens.json").read_text(encoding="utf-8")
    )
    page_map = json.loads(
        (package / "references/specimen/canonical-page-map.json").read_text(
            encoding="utf-8"
        )
    )
    versions = {
        spec["designSystemVersion"],
        tokens["designSystemVersion"],
        page_map["designSystemVersion"],
    }
    if len(versions) != 1:
        failures.append(f"Design-system versions disagree: {sorted(versions)}")

    manifest_path = package / MANIFEST_RELATIVE
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest_inputs = manifest.get("inputs")
    if not isinstance(manifest_inputs, dict):
        failures.append("Manifest inputs must be an object")
        manifest_inputs = {}

    expected_files = {MANIFEST_RELATIVE}
    for value, expected in manifest_inputs.items():
        member = portable_member(value, "Manifest input", failures)
        if member is None:
            continue
        expected_files.add(member.as_posix())
        path = package.joinpath(*member.parts)
        if not path.is_file():
            failures.append(f"Manifest input is missing: {value}")
        elif path.is_symlink():
            failures.append(f"Manifest input cannot be a symlink: {value}")
        elif sha256_file(path) != expected:
            failures.append(f"Manifest hash mismatch: {value}")

    artifact = manifest.get("artifact") if isinstance(manifest.get("artifact"), dict) else {}
    artifact_member = portable_member(artifact.get("path"), "Manifest artifact", failures)
    specimen: Path | None = None
    artifact_hash = artifact.get("sha256")
    if artifact_member is not None:
        expected_files.add(artifact_member.as_posix())
        specimen = package.joinpath(*artifact_member.parts)
        if not specimen.is_file():
            failures.append(f"Manifest artifact is missing: {artifact_member.as_posix()}")
        elif specimen.is_symlink():
            failures.append("Canonical specimen cannot be a symlink")
        elif sha256_file(specimen) != artifact_hash:
            failures.append("Canonical specimen hash does not match manifest")

    extra_files = sorted(actual_files - expected_files)
    missing_files = sorted(expected_files - actual_files)
    if extra_files:
        failures.append(f"Files are not tracked by the manifest: {extra_files}")
    if missing_files:
        failures.append(f"Manifest-tracked files are missing: {missing_files}")

    proof_paths = {
        "validation": "references/specimen/validation.json",
        "compatibility": "references/specimen/compatibility-matrix.json",
        "workflow": "references/specimen/workflow-regression.json",
    }
    proofs: dict[str, dict[str, Any]] = {}
    for label, relative in proof_paths.items():
        proof = json.loads((package / relative).read_text(encoding="utf-8"))
        proofs[label] = proof
        if proof.get("status") != "passed":
            failures.append(f"{relative} status is not passed")
    for label in ("validation", "compatibility"):
        if proofs[label].get("artifactSha256") != artifact_hash:
            failures.append(f"{proof_paths[label]} is not bound to the manifest artifact")

    reader = PdfReader(specimen, strict=True) if specimen and specimen.is_file() else None
    specimen_pages = 0
    if reader:
        specimen_pages = len(reader.pages)
        if specimen_pages != len(page_map["pages"]):
            failures.append("Canonical specimen and page map page counts disagree")
        pdf_text = " ".join(str(value) for value in (reader.metadata or {}).values())
        pdf_text += " " + " ".join(page.extract_text() or "" for page in reader.pages)
        for label, pattern in forbidden.items():
            if pattern.search(pdf_text):
                failures.append(f"Canonical specimen contains forbidden {label}")
        for page in reader.pages:
            for annotation_ref in page.get("/Annots") or []:
                annotation = dereference(annotation_ref)
                action = dereference(annotation.get("/A")) if annotation.get("/A") else None
                uri = str(action.get("/URI", "")) if action else ""
                if uri.lower().startswith(file_scheme):
                    failures.append("Canonical specimen contains a local file link")

    report = {
        "schemaVersion": 1,
        "status": "passed" if not failures else "failed",
        "package": package.name,
        "failures": failures,
        "stats": {
            "files": len(actual_files),
            "specimenPages": specimen_pages,
            "designSystemVersion": spec["designSystemVersion"],
        },
    }
    emit(report, report_output)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
