"""Reusable PDF link, raster-resolution, and painted-font validation.

These checks do not prescribe a book's page count, chapter layout, appearance,
or changelog pagination. Book adapters retain those content-specific contracts.
"""

from __future__ import annotations

import math
import re
import subprocess
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from pypdf import PdfReader
from pypdf.generic import ContentStream, Destination, IndirectObject, NameObject, NullObject, StreamObject

from runtime_support import find_program


def _dereference(value: Any) -> Any:
    return value.get_object() if isinstance(value, IndirectObject) else value


_MISSING = object()


def _raw_named_destination(reader: PdfReader, name: str) -> Any:
    """Find the original array before pypdf repairs missing or extra operands."""
    catalog = reader.root_object
    legacy = "/Dests" in catalog
    if legacy:
        tree = catalog.get("/Dests")
    else:
        names = _dereference(catalog.get("/Names", {}))
        tree = names.get("/Dests")
    if tree is None:
        return _MISSING

    def find(node: Any, requested: str, active: frozenset[Any] = frozenset()) -> Any:
        key = (node.idnum, node.generation) if isinstance(node, IndirectObject) else id(node)
        assert key not in active, "Cyclic internal named-destination tree"
        node = _dereference(node)
        assert hasattr(node, "get"), "Malformed internal named-destination tree"
        if legacy:
            for candidate, value in node.items():
                key_name = str(candidate).removeprefix("/") if isinstance(candidate, NameObject) else str(candidate)
                if key_name == requested:
                    return _dereference(value)
        elif "/Kids" in node:
            children = _dereference(node.get("/Kids"))
            assert isinstance(children, (list, tuple)), "Malformed named-destination children"
            for child in children:
                value = find(child, requested, active | {key})
                if value is not _MISSING:
                    return value
        elif "/Names" in node:
            entries = _dereference(node.get("/Names"))
            assert isinstance(entries, (list, tuple)) and len(entries) % 2 == 0, (
                "Malformed internal named-destination name array"
            )
            for index in range(0, len(entries), 2):
                if str(_dereference(entries[index])) == requested:
                    return _dereference(entries[index + 1])
        return _MISSING

    # A syntax slash belongs to NameObject, not to a literal PDF string.
    requested = str(name).removeprefix("/") if isinstance(name, NameObject) else str(name)
    return find(tree, requested)


def _validate_destination_operands(destination: list[Any] | tuple[Any, ...]) -> None:
    # Mode shapes and null behavior: https://pypdf.readthedocs.io/en/stable/modules/Fit.html
    # /FitR requires real coordinates; its documented null behavior is unpredictable.
    argument_counts = {
        "/Fit": 0, "/FitB": 0,
        "/FitH": 1, "/FitV": 1, "/FitBH": 1, "/FitBV": 1,
        "/XYZ": 3, "/FitR": 4,
    }
    mode = _dereference(destination[1])
    assert isinstance(mode, NameObject) and mode in argument_counts, (
        f"Unknown internal destination mode: {mode!r}"
    )
    operands = destination[2:]
    assert len(operands) == argument_counts[mode], (
        f"Internal destination {mode} needs {argument_counts[mode]} operands; found {len(operands)}"
    )
    for index, operand in enumerate(operands, start=1):
        operand = _dereference(operand)
        is_null = operand is None or isinstance(operand, NullObject)
        if is_null:
            assert mode != "/FitR", f"Internal destination /FitR operand {index} cannot be null"
            continue
        assert (
            isinstance(operand, (int, float))
            and not isinstance(operand, bool)
            and math.isfinite(operand)
        ), f"Internal destination {mode} operand {index} must be finite numeric or permitted null"
        if mode == "/XYZ" and index == 3:
            assert operand >= 0, "Internal destination /XYZ zoom must be nonnegative"


def validate_internal_link_target(reader: PdfReader, destination: Any) -> int:
    """Resolve a local PDF destination and return its zero-based page number.

    Accept PDF named destinations, direct destination arrays, and pypdf's
    Destination objects. Local direct destinations must reference a page in
    this reader; integer page numbers belong to remote destinations, not /GoTo.
    """
    try:
        value = _dereference(destination)
        if isinstance(value, str):
            named_value = _raw_named_destination(reader, value)
            assert named_value is not _MISSING, f"Unknown internal named destination: {value!r}"
            value = named_value
        if isinstance(value, Destination):
            value = value.dest_array
        elif hasattr(value, "get") and value.get("/D") is not None:
            value = _dereference(value.get("/D"))
        assert isinstance(value, (list, tuple)) and len(value) >= 2, (
            f"Malformed internal destination: {value!r}"
        )
        _validate_destination_operands(value)
        page_reference = value[0]
        page = _dereference(page_reference)
        assert hasattr(page, "get") and str(page.get("/Type", "")) == "/Page", (
            "Internal direct destination must reference a PDF page: "
            f"{page_reference!r}"
        )
        reference = (
            page_reference
            if isinstance(page_reference, IndirectObject)
            else getattr(page, "indirect_reference", None)
        )
        assert reference is not None and reference.pdf is reader, (
            "Internal destination references a page outside this PDF"
        )
        page_number = reader.get_page_number(page)
        assert (
            isinstance(page_number, int)
            and not isinstance(page_number, bool)
            and 0 <= page_number < len(reader.pages)
        ), f"Internal destination points outside the PDF: {page_number!r}"
        return page_number
    except AssertionError:
        raise
    except Exception as error:
        raise AssertionError(f"Could not resolve internal destination: {error}") from error


def validate_image_resolution(pdfimages_output: str, minimum_ppi: float = 240) -> int:
    """Validate both PPI columns of every image row from Poppler pdfimages -list.

    Read PPI relative to the size/ratio suffix so both normal object IDs and
    inline-image IDs work. Mask opacity and required-placement counts are
    separate checks. Return the number of raster image rows inspected.
    """
    assert (
        isinstance(minimum_ppi, (int, float))
        and not isinstance(minimum_ppi, bool)
        and math.isfinite(minimum_ppi)
        and minimum_ppi > 0
    ), f"Invalid minimum image PPI: {minimum_ppi!r}"
    count = 0
    failures = []
    for line in pdfimages_output.splitlines():
        line = line.strip()
        if not line or set(line) == {"-"}:
            continue
        if line.startswith("page ") and "x-ppi" in line and "y-ppi" in line:
            continue
        fields = line.split()
        assert (
            len(fields) in {15, 16}
            and all(fields[index].isdigit() for index in (0, 1, 3, 4, 6, 7))
            and fields[2] in {"image", "mask", "smask"}
            and int(fields[3]) > 0 and int(fields[4]) > 0
            and fields[9] in {"yes", "no"}
            and (
                (len(fields) == 16 and fields[10].isdigit() and fields[11].isdigit())
                or (len(fields) == 15 and fields[10] == "[inline]")
            )
        ), f"Malformed or unknown pdfimages image row: {line}"
        try:
            x_ppi, y_ppi = float(fields[-4]), float(fields[-3])
        except ValueError as error:
            raise AssertionError(f"Invalid image PPI in pdfimages row: {line.strip()}") from error
        assert math.isfinite(x_ppi) and math.isfinite(y_ppi), (
            f"Invalid image PPI in pdfimages row: {line.strip()}"
        )
        if fields[2] != "image":
            continue
        count += 1
        if min(x_ppi, y_ppi) < minimum_ppi:
            failures.append(f"page {fields[0]}, image {fields[1]}: {x_ppi:g} x {y_ppi:g} PPI")
    assert not failures, (
        f"Raster images below {minimum_ppi:g} effective PPI: " + "; ".join(failures)
    )
    return count


def _font_key(font: Any) -> tuple[int, int] | None:
    reference = font if isinstance(font, IndirectObject) else getattr(font, "indirect_reference", None)
    return (reference.idnum, reference.generation) if reference is not None else None


def _has_text(operands: list[Any], operator: bytes) -> bool:
    if not operands:
        return False
    value = operands[0] if operator == b"TJ" else operands[-1]
    if operator == b"TJ":
        return any(isinstance(part, (str, bytes)) and len(part) for part in value)
    return isinstance(value, (str, bytes)) and bool(value)


def _painted_fonts(reader: PdfReader) -> tuple[dict[Any, set[int]], dict[Any, Any]]:
    """Track text-painting font resources through graphics state and nested Forms."""
    painted: dict[Any, set[int]] = {}
    font_objects: dict[Any, Any] = {}

    def walk(
        stream: Any, resources: Any, page_number: int,
        selected_font: Any = None, active_forms: frozenset[Any] = frozenset(),
    ) -> None:
        if stream is None:
            return
        resources = _dereference(resources) if resources is not None else {}
        stack = []
        for operands, operator in ContentStream(stream, reader).operations:
            if operator == b"q":
                stack.append(selected_font)
            elif operator == b"Q":
                assert stack, f"Unbalanced graphics state on PDF page {page_number}"
                selected_font = stack.pop()
            elif operator == b"Tf":
                fonts = _dereference(resources.get("/Font", {}))
                selected_font = fonts.get(operands[0])
                assert selected_font is not None, (
                    f"Unknown painted-font resource {operands[0]} on PDF page {page_number}"
                )
            elif operator == b"gs":
                # A graphics state's /Font replaces Tf's selection:
                # https://printtechnologies.org/standards/files/pdfrefman_v1-3.pdf
                # Adobe PDF Reference, Table 4.8 (printed page 144).
                states = _dereference(resources.get("/ExtGState", {}))
                assert len(operands) == 1 and operands[0] in states, (
                    f"Unknown graphics-state resource on PDF page {page_number}: {operands!r}"
                )
                state = _dereference(states.get(operands[0]))
                assert hasattr(state, "get"), f"Malformed graphics state on PDF page {page_number}"
                if "/Font" in state:
                    selection = _dereference(state.get("/Font"))
                    assert isinstance(selection, (list, tuple)) and len(selection) == 2, (
                        f"Malformed graphics-state /Font selection on PDF page {page_number}"
                    )
                    font = _dereference(selection[0])
                    size = _dereference(selection[1])
                    assert hasattr(font, "get") and str(font.get("/Type", "")) == "/Font", (
                        f"Invalid graphics-state font on PDF page {page_number}"
                    )
                    assert (
                        isinstance(size, (int, float)) and not isinstance(size, bool) and math.isfinite(size)
                    ), f"Invalid graphics-state font size on PDF page {page_number}"
                    selected_font = selection[0]
            elif operator in {b"Tj", b"TJ", b"'", b'"'} and _has_text(operands, operator):
                assert selected_font is not None, (
                    f"Painted text has no active font on PDF page {page_number}"
                )
                font = _dereference(selected_font)
                key = _font_key(selected_font) or ("direct", id(font))
                painted.setdefault(key, set()).add(page_number)
                font_objects[key] = font
            elif operator == b"Do":
                xobjects = _dereference(resources.get("/XObject", {}))
                reference = xobjects.get(operands[0])
                assert reference is not None, (
                    f"Unknown XObject {operands[0]} on PDF page {page_number}"
                )
                form = _dereference(reference)
                if str(form.get("/Subtype", "")) != "/Form":
                    continue
                key = _font_key(reference) or ("direct", id(form))
                assert key not in active_forms, f"Cyclic Form XObject on PDF page {page_number}"
                walk(
                    form, form.get("/Resources", resources), page_number,
                    selected_font, active_forms | {key},
                )
        assert not stack, f"Unbalanced graphics state on PDF page {page_number}"

    for page_number, page in enumerate(reader.pages, start=1):
        walk(page.get_contents(), page.get("/Resources", {}), page_number)
    return painted, font_objects


def _decoded_program(value: Any, *, allow_empty: bool = False) -> bool:
    """Check that a real PDF program stream decodes, without parsing its format."""
    try:
        stream = _dereference(value)
        if not isinstance(stream, StreamObject):
            return False
        program = stream.get_data()
        return isinstance(program, bytes) and (allow_empty or bool(program))
    except Exception:
        return False


def _font_program_is_embedded(font: Any) -> bool:
    """Check actual painted font programs, including fonts omitted by pdffonts."""
    if str(font.get("/Subtype", "")) == "/Type3":
        # A Type 3 font defines its glyph programs in the PDF's CharProcs.
        glyphs = _dereference(font.get("/CharProcs", {}))
        return isinstance(glyphs, Mapping) and bool(glyphs) and all(
            isinstance(name, NameObject) and _decoded_program(program, allow_empty=True)
            for name, program in glyphs.items()
        )
    if str(font.get("/Subtype", "")) == "/Type0":
        descendants = _dereference(font.get("/DescendantFonts", []))
        return bool(descendants) and all(
            _font_program_is_embedded(_dereference(descendant)) for descendant in descendants
        )
    descriptor = _dereference(font.get("/FontDescriptor", {}))
    if not isinstance(descriptor, Mapping):
        return False
    return any(
        descriptor.get(key) is not None and _decoded_program(descriptor.get(key))
        for key in ("/FontFile", "/FontFile2", "/FontFile3")
    )


_FONT_ROW = re.compile(
    r"^(?P<name>\S+)\s+.+?\s+(?P<embedded>yes|no)\s+(?:yes|no)\s+"
    r"(?:yes|no)\s+(?P<object_id>\d+)\s+(?P<generation>\d+)\s*$"
)


def validate_fonts(path: Path, *, report_unused: bool = True) -> int:
    """Require embedded fonts that paint text; report unused unembedded resources.

    Return the pdffonts resource count plus independently verified painted
    resources absent from that inventory. Object IDs distinguish embedded and
    unembedded resources with the same BaseFont name. Nested Forms, graphics-
    state /Font selections, and q/Q font restoration all count as font use.
    """
    executable = find_program("pdffonts", required=False)
    assert executable, "pdffonts is required for the font-embedding check"
    result = subprocess.run([executable, str(path)], capture_output=True, text=True)
    assert result.returncode == 0, f"pdffonts failed for {path}: {result.stderr.strip()}"
    rows = [line.strip() for line in result.stdout.splitlines()[2:] if line.strip()]
    try:
        painted, font_objects = _painted_fonts(PdfReader(path, strict=True))
    except AssertionError:
        raise
    except Exception as error:
        raise AssertionError(f"Could not inspect painted-font resources in {path}: {error}") from error
    assert rows or painted, "No fonts were found"
    unembedded, unused = {}, []
    for key, font in font_objects.items():
        if not _font_program_is_embedded(font):
            name = str(font.get("/BaseFont", font.get("/Name", "unnamed"))).lstrip("/")
            location = f"object {key[0]} {key[1]}" if key[0] != "direct" else "direct font resource"
            pages = ", ".join(str(page) for page in sorted(painted[key]))
            unembedded[key] = f"{name} ({location}) on pages {pages}"
    listed_objects = set()
    for row in rows:
        match = _FONT_ROW.fullmatch(row)
        assert match, f"Malformed pdffonts resource row: {row}"
        key = int(match["object_id"]), int(match["generation"])
        listed_objects.add(key)
        if match["embedded"] == "yes":
            continue
        label = f"{match['name']} (object {key[0]} {key[1]})"
        if key in painted:
            pages = ", ".join(str(page) for page in sorted(painted.get(key, [])))
            unembedded[key] = label + (f" on pages {pages}" if pages else "")
        else:
            unused.append(label)
    assert not unembedded, "Unembedded painted fonts: " + "; ".join(unembedded.values())
    if report_unused and unused:
        print("NOTE: Unused unembedded font resources: " + "; ".join(unused))
    # Poppler may omit ExtGState-only fonts. Include independently verified
    # painted resources missing from its inventory in the resource count.
    return len(rows) + len(painted.keys() - listed_objects)
