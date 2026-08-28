#!/usr/bin/env python3
"""Create a deterministic, metadata-clean distribution ZIP for this skill."""

from __future__ import annotations

import argparse
import json
import zipfile
from pathlib import Path, PurePosixPath

from runtime_support import PACKAGE_ROOT, display_path, safe_output_file, sha256_file


ARCHIVE_ROOT = "publish-evidence-backed-handbook"
FIXED_TIME = (2020, 1, 1, 0, 0, 0)


def safe_member(value: str) -> PurePosixPath:
    member = PurePosixPath(value)
    if member.is_absolute() or ".." in member.parts or "\\" in value:
        raise SystemExit(f"Unsafe manifest path: {value}")
    if any(part in {".DS_Store", "__MACOSX", "__pycache__", ".venv"} for part in member.parts):
        raise SystemExit(f"Forbidden distribution path: {value}")
    if any(part.startswith("._") for part in member.parts):
        raise SystemExit(f"Forbidden AppleDouble path: {value}")
    return member


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    output = safe_output_file(args.output, "Archive output")
    try:
        output.relative_to(PACKAGE_ROOT)
    except ValueError:
        pass
    else:
        raise SystemExit("Archive output must be outside the source package")

    manifest_path = PACKAGE_ROOT / "references/specimen/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    members = set(manifest["inputs"])
    members.add("references/specimen/manifest.json")
    members.add(manifest["artifact"]["path"])

    with zipfile.ZipFile(
        output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for value in sorted(members):
            member = safe_member(value)
            source = PACKAGE_ROOT.joinpath(*member.parts)
            if source.is_symlink() or not source.is_file():
                raise SystemExit(f"Distribution member must be a regular file: {value}")
            archive_name = f"{ARCHIVE_ROOT}/{member.as_posix()}"
            info = zipfile.ZipInfo(archive_name, FIXED_TIME)
            info.create_system = 3
            mode = 0o755 if member.parts[0] == "scripts" else 0o644
            info.external_attr = mode << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            info.extra = b""
            archive.writestr(info, source.read_bytes(), compresslevel=9)

    print(
        json.dumps(
            {
                "output": display_path(output),
                "sha256": sha256_file(output),
                "files": len(members),
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
