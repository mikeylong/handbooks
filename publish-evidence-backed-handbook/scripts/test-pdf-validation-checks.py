#!/usr/bin/env python3
"""Unit regressions for shared PDF targets, raster resolution, and font use."""

from __future__ import annotations

from contextlib import redirect_stdout
from io import BytesIO, StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject, BooleanObject, DecodedStreamObject, DictionaryObject, EncodedStreamObject, FloatObject,
    IndirectObject, NameObject, NullObject, NumberObject, TextStringObject,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

from pdf_validation_checks import (
    validate_fonts, validate_image_resolution, validate_internal_link_target,
)


def reader_with_named_destination() -> PdfReader:
    writer = PdfWriter()
    writer.add_blank_page(200, 200)
    writer.add_blank_page(200, 200)
    writer.add_named_destination("chapter", 1)
    stream = BytesIO()
    writer.write(stream)
    stream.seek(0)
    return PdfReader(stream, strict=True)


class LinkTests(unittest.TestCase):
    def setUp(self):
        self.reader = reader_with_named_destination()

    def test_named_destinations_and_pdf_string_objects(self):
        for value in ["chapter", TextStringObject("chapter"), NameObject("/chapter")]:
            with self.subTest(value=value):
                self.assertEqual(validate_internal_link_target(self.reader, value), 1)

    def test_literal_string_slash_does_not_alias_a_syntax_slash(self):
        for value in ["/chapter", TextStringObject("/chapter")]:
            with self.subTest(value=value), self.assertRaisesRegex(AssertionError, "Unknown internal named"):
                validate_internal_link_target(self.reader, value)
        self.assertEqual(validate_internal_link_target(self.reader, NameObject("/chapter")), 1)

    def test_modern_name_tree_preserves_explicit_literal_slash_name(self):
        writer = PdfWriter()
        writer.add_blank_page(200, 200)
        writer.add_blank_page(200, 200)
        writer.add_named_destination("chapter", 0)
        writer.add_named_destination("/chapter", 1)
        stream = BytesIO()
        writer.write(stream)
        stream.seek(0)
        reader = PdfReader(stream, strict=True)
        self.assertEqual(validate_internal_link_target(reader, TextStringObject("chapter")), 0)
        self.assertEqual(validate_internal_link_target(reader, TextStringObject("/chapter")), 1)
        self.assertEqual(validate_internal_link_target(reader, NameObject("/chapter")), 0)
        self.assertEqual(validate_internal_link_target(reader, NameObject("//chapter")), 1)

    def test_legacy_name_dictionary_normalizes_name_syntax_only(self):
        writer = PdfWriter()
        page = writer.add_blank_page(200, 200)
        writer.root_object[NameObject("/Dests")] = DictionaryObject({
            NameObject("/chapter"): ArrayObject([page.indirect_reference, NameObject("/Fit")]),
        })
        stream = BytesIO()
        writer.write(stream)
        stream.seek(0)
        reader = PdfReader(stream, strict=True)
        self.assertEqual(validate_internal_link_target(reader, NameObject("/chapter")), 0)
        self.assertEqual(validate_internal_link_target(reader, TextStringObject("chapter")), 0)
        with self.assertRaisesRegex(AssertionError, "Unknown internal named"):
            validate_internal_link_target(reader, TextStringObject("/chapter"))

    def test_direct_array_and_pypdf_destination(self):
        reference = self.reader.pages[0].indirect_reference
        direct = ArrayObject([reference, NameObject("/Fit")])
        self.assertEqual(validate_internal_link_target(self.reader, direct), 0)
        self.assertEqual(
            validate_internal_link_target(self.reader, self.reader.named_destinations["chapter"]), 1,
        )
        self.assertEqual(validate_internal_link_target(self.reader, [self.reader.pages[1], NameObject("/Fit")]), 1)
        wrapped = DictionaryObject({NameObject("/D"): direct})
        self.assertEqual(validate_internal_link_target(self.reader, wrapped), 0)

    def test_unknown_names_and_malformed_arrays_fail(self):
        for value in ["absent", NameObject("/absent"), None, [], [None], [NumberObject(9999), NameObject("/Fit")]]:
            with self.subTest(value=value), self.assertRaises(AssertionError):
                validate_internal_link_target(self.reader, value)

    def test_foreign_page_reference_fails_even_with_same_object_number(self):
        foreign = reader_with_named_destination()
        self.assertEqual(
            foreign.pages[0].indirect_reference.idnum,
            self.reader.pages[0].indirect_reference.idnum,
        )
        with self.assertRaisesRegex(AssertionError, "outside this PDF"):
            validate_internal_link_target(self.reader, [foreign.pages[0].indirect_reference, NameObject("/Fit")])

    def test_non_page_reference_fails(self):
        catalog = self.reader.trailer.raw_get("/Root")
        with self.assertRaisesRegex(AssertionError, "must reference a PDF page"):
            validate_internal_link_target(self.reader, [catalog, NameObject("/Fit")])

    def test_page_object_outside_page_tree_fails(self):
        writer = PdfWriter()
        writer.add_blank_page(200, 200)
        orphan = writer._add_object(DictionaryObject({NameObject("/Type"): NameObject("/Page")}))
        stream = BytesIO()
        writer.write(stream)
        stream.seek(0)
        reader = PdfReader(stream, strict=True)
        destination = [IndirectObject(orphan.idnum, orphan.generation, reader), NameObject("/Fit")]
        with self.assertRaisesRegex(AssertionError, "points outside the PDF"):
            validate_internal_link_target(reader, destination)

    def test_every_supported_mode_and_operand_count(self):
        valid = {
            "/Fit": [], "/FitB": [],
            "/FitH": [NumberObject(100)], "/FitV": [FloatObject(10.5)],
            "/FitBH": [NumberObject(100)], "/FitBV": [FloatObject(10.5)],
            "/XYZ": [NumberObject(-10), FloatObject(200.5), NumberObject(0)],
            "/FitR": [NumberObject(0), NumberObject(0), NumberObject(200), NumberObject(200)],
        }
        reference = self.reader.pages[0].indirect_reference
        for mode, operands in valid.items():
            with self.subTest(mode=mode):
                self.assertEqual(validate_internal_link_target(self.reader, [reference, NameObject(mode), *operands]), 0)
                with self.assertRaisesRegex(AssertionError, "needs .* operands"):
                    validate_internal_link_target(self.reader, [reference, NameObject(mode), *operands, 1])
                if operands:
                    with self.assertRaisesRegex(AssertionError, "needs .* operands"):
                        validate_internal_link_target(self.reader, [reference, NameObject(mode), *operands[:-1]])

    def test_null_coordinates_and_zero_zoom_are_legal_for_permitted_modes(self):
        reference = self.reader.pages[0].indirect_reference
        for null in [None, NullObject()]:
            for mode in ["/FitH", "/FitV", "/FitBH", "/FitBV"]:
                with self.subTest(mode=mode, null=null):
                    self.assertEqual(validate_internal_link_target(self.reader, [reference, NameObject(mode), null]), 0)
            for operands in [[null, null, null], [null, 200, 0], [10, null, 1.25]]:
                self.assertEqual(validate_internal_link_target(self.reader, [reference, NameObject("/XYZ"), *operands]), 0)

    def test_unknown_mode_invalid_coordinate_types_and_negative_zoom_fail(self):
        reference = self.reader.pages[0].indirect_reference
        for mode in [NameObject("/NotARealDestinationMode"), TextStringObject("/Fit"), "/Fit", None, 1]:
            with self.subTest(mode=mode), self.assertRaisesRegex(AssertionError, "Unknown .* mode"):
                validate_internal_link_target(self.reader, [reference, mode])
        for invalid in [True, BooleanObject(True), "10", TextStringObject("10"), float("nan"), float("inf"), -float("inf")]:
            for mode, operands in [("/FitH", [invalid]), ("/XYZ", [invalid, 10, 1]), ("/FitR", [invalid, 0, 200, 200])]:
                with self.subTest(mode=mode, invalid=invalid), self.assertRaisesRegex(AssertionError, "finite numeric"):
                    validate_internal_link_target(self.reader, [reference, NameObject(mode), *operands])
        with self.assertRaisesRegex(AssertionError, "zoom must be nonnegative"):
            validate_internal_link_target(self.reader, [reference, NameObject("/XYZ"), 0, 0, -1])

    def test_fit_rectangle_rejects_null_at_every_position(self):
        reference = self.reader.pages[0].indirect_reference
        for null in [None, NullObject()]:
            for index in range(4):
                operands = [0, 0, 200, 200]
                operands[index] = null
                with self.subTest(index=index, null=null), self.assertRaisesRegex(AssertionError, "cannot be null"):
                    validate_internal_link_target(self.reader, [reference, NameObject("/FitR"), *operands])

    def test_named_destinations_validate_raw_operands_before_pypdf_repairs_them(self):
        malformed = [
            ["/NotARealDestinationMode"], ["/XYZ", 0], ["/Fit", 99],
            ["/FitH"], ["/FitR", 0, 0, NullObject(), 200], ["/XYZ", 0, 0, -1],
        ]
        for legacy in [False, True]:
            for operands in malformed:
                writer = PdfWriter()
                page = writer.add_blank_page(200, 200)
                array = ArrayObject([page.indirect_reference, NameObject(operands[0])])
                for operand in operands[1:]:
                    array.append(operand if isinstance(operand, NullObject) else NumberObject(operand))
                wrapped = DictionaryObject({NameObject("/D"): array})
                if legacy:
                    writer.root_object[NameObject("/Dests")] = DictionaryObject({NameObject("/bad"): wrapped})
                else:
                    writer.root_object[NameObject("/Names")] = DictionaryObject({
                        NameObject("/Dests"): DictionaryObject({NameObject("/Names"): ArrayObject([TextStringObject("bad"), wrapped])}),
                    })
                stream = BytesIO()
                writer.write(stream)
                stream.seek(0)
                reader = PdfReader(stream, strict=True)
                with self.subTest(legacy=legacy, operands=operands), self.assertRaises(AssertionError):
                    validate_internal_link_target(reader, TextStringObject("bad"))


class ResolutionTests(unittest.TestCase):
    HEADER = (
        "page num type width height color comp bpc enc interp object ID x-ppi y-ppi size ratio\n"
        "--------------------------------------------------------------------------------\n"
    )

    def row(self, x=240, y=240, object_id="488 0", kind="image"):
        return f"  4 0 {kind} 1536 1364 icc 3 8 image no {object_id} {x} {y} 2138K 35%\n"

    def test_realistic_rows_and_inline_ids_pass(self):
        output = self.HEADER + self.row(375, 375) + self.row(240, 240, "[inline]")
        self.assertEqual(validate_image_resolution(output), 2)

    def test_both_dimensions_and_custom_minimum_are_enforced(self):
        for x, y in [(239, 375), (375, 239), (0, 240), (240, -1)]:
            with self.subTest(x=x, y=y), self.assertRaisesRegex(AssertionError, "below 240"):
                validate_image_resolution(self.HEADER + self.row(x, y))
        with self.assertRaisesRegex(AssertionError, "below 300"):
            validate_image_resolution(self.HEADER + self.row(250, 375), minimum_ppi=300)

    def test_malformed_and_nonfinite_ppi_fail(self):
        for row in [
            "1 0 image 10\n", self.row("oops", 240), self.row("nan", 240), self.row(240, "inf"),
            self.row(kind="unknown"), self.row().replace("1536", "missing"), "unexpected Poppler warning\n",
        ]:
            with self.subTest(row=row), self.assertRaises(AssertionError):
                validate_image_resolution(self.HEADER + row)

    def test_mask_rows_and_empty_image_inventory_are_not_resolution_decisions(self):
        self.assertEqual(validate_image_resolution(self.HEADER + self.row(1, 1, kind="smask")), 0)
        self.assertEqual(validate_image_resolution(self.HEADER), 0)

    def test_invalid_minimum_fails(self):
        for minimum in [0, -1, True, float("nan")]:
            with self.subTest(minimum=minimum), self.assertRaisesRegex(AssertionError, "Invalid minimum"):
                validate_image_resolution(self.HEADER, minimum_ppi=minimum)


def standard_font(writer: PdfWriter) -> IndirectObject:
    font = DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
    })
    return writer._add_object(font)


def stream_object(writer: PdfWriter, contents: bytes, *, resources=None):
    stream = DecodedStreamObject()
    stream.set_data(contents)
    if resources is not None:
        stream.update({
            NameObject("/Type"): NameObject("/XObject"),
            NameObject("/Subtype"): NameObject("/Form"),
            NameObject("/BBox"): ArrayObject([NumberObject(0), NumberObject(0), NumberObject(200), NumberObject(200)]),
            NameObject("/Resources"): resources,
        })
    return writer._add_object(stream)


class FontTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory(prefix="handbook-pdf-font-checks-")
        self.root = Path(self.directory.name)

    def tearDown(self):
        self.directory.cleanup()

    def write(self, writer, name="fixture.pdf"):
        path = self.root / name
        writer.write(path)
        return path

    def embedded_fixture(self):
        font_path = Path(__file__).resolve().parents[1] / "assets/design-system/fonts/NotoSans-Regular.ttf"
        pdfmetrics.registerFont(TTFont("ValidationFixtureSans", str(font_path)))
        buffer = BytesIO()
        canvas = Canvas(buffer, pagesize=(200, 200))
        canvas.setFont("ValidationFixtureSans", 10)
        canvas.drawString(20, 100, "Embedded fixture text")
        canvas.save()
        buffer.seek(0)
        return PdfReader(buffer, strict=True)

    def test_unused_standard_font_is_reported_but_embedded_painted_font_passes(self):
        path = self.write(PdfWriter(clone_from=self.embedded_fixture()))
        output = StringIO()
        with redirect_stdout(output):
            count = validate_fonts(path)
        self.assertGreaterEqual(count, 2)
        self.assertIn("Unused unembedded font resources", output.getvalue())
        self.assertIn("Helvetica", output.getvalue())
        with redirect_stdout(output := StringIO()):
            self.assertEqual(validate_fonts(path, report_unused=False), count)
        self.assertEqual(output.getvalue(), "")

    def test_unembedded_painted_font_fails(self):
        writer = PdfWriter()
        page = writer.add_blank_page(200, 200)
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F0"): standard_font(writer)}),
        })
        page[NameObject("/Contents")] = stream_object(writer, b"BT /F0 12 Tf 10 100 Td (Painted) Tj ET")
        with self.assertRaisesRegex(AssertionError, "Unembedded painted fonts.*Helvetica.*pages 1"):
            validate_fonts(self.write(writer))

    def test_nested_form_unembedded_painted_font_fails(self):
        writer = PdfWriter()
        page = writer.add_blank_page(200, 200)
        fonts = DictionaryObject({NameObject("/F0"): standard_font(writer)})
        inner = stream_object(writer, b"BT /F0 12 Tf 10 100 Td (Nested) Tj ET", resources=DictionaryObject({NameObject("/Font"): fonts}))
        outer = stream_object(writer, b"/Inner Do", resources=DictionaryObject({NameObject("/XObject"): DictionaryObject({NameObject("/Inner"): inner})}))
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/XObject"): DictionaryObject({NameObject("/Outer"): outer})})
        page[NameObject("/Contents")] = stream_object(writer, b"/Outer Do")
        with self.assertRaisesRegex(AssertionError, "Unembedded painted fonts.*pages 1"):
            validate_fonts(self.write(writer))

    def test_same_basename_does_not_hide_unembedded_painted_object(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        page = writer.pages[0]
        fonts = page["/Resources"]["/Font"]
        embedded_name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        unembedded = standard_font(writer)
        unembedded.get_object()[NameObject("/BaseFont")] = fonts[embedded_name]["/BaseFont"]
        fonts[NameObject("/UnembeddedTwin")] = unembedded
        page[NameObject("/Contents")] = stream_object(
            writer, f"BT {embedded_name} 10 Tf (Embedded) Tj /UnembeddedTwin 10 Tf (Unembedded) Tj ET".encode(),
        )
        with self.assertRaisesRegex(AssertionError, "Unembedded painted fonts.*NotoSans"):
            validate_fonts(self.write(writer))

    def test_font_selected_only_for_empty_text_is_unused(self):
        writer = PdfWriter()
        page = writer.add_blank_page(200, 200)
        page[NameObject("/Resources")] = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F0"): standard_font(writer)})})
        page[NameObject("/Contents")] = stream_object(writer, b"BT /F0 12 Tf () Tj [0 -2] TJ ET")
        output = StringIO()
        with redirect_stdout(output):
            self.assertEqual(validate_fonts(self.write(writer)), 1)
        self.assertIn("Unused unembedded font", output.getvalue())

    def test_q_restore_and_inherited_form_font_use_embedded_resource(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        page = writer.pages[0]
        fonts = page["/Resources"]["/Font"]
        embedded_name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        form = stream_object(writer, b"BT 10 100 Td (Inherited) Tj ET", resources=DictionaryObject())
        page["/Resources"][NameObject("/XObject")] = DictionaryObject({NameObject("/Inherited"): form})
        contents = f"BT {embedded_name} 10 Tf ET q BT /F1 10 Tf () Tj ET Q /Inherited Do".encode()
        page[NameObject("/Contents")] = stream_object(writer, contents)
        self.assertGreaterEqual(validate_fonts(self.write(writer), report_unused=False), 2)

    def test_graphics_state_can_override_embedded_tf_with_unembedded_font(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        page = writer.pages[0]
        fonts = page["/Resources"]["/Font"]
        embedded_name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        state = DictionaryObject({NameObject("/Font"): ArrayObject([standard_font(writer), NumberObject(10)])})
        page["/Resources"][NameObject("/ExtGState")] = DictionaryObject({NameObject("/GS1"): writer._add_object(state)})
        page[NameObject("/Contents")] = stream_object(
            writer, f"BT {embedded_name} 10 Tf /GS1 gs (Unembedded override) Tj ET".encode(),
        )
        with self.assertRaisesRegex(AssertionError, "Unembedded painted fonts.*Helvetica"):
            validate_fonts(self.write(writer))

    def test_embedded_font_selected_only_by_graphics_state_passes(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        page = writer.pages[0]
        fonts = page["/Resources"]["/Font"]
        embedded_name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        state = DictionaryObject({NameObject("/Font"): ArrayObject([fonts.raw_get(embedded_name), NumberObject(10)])})
        page["/Resources"][NameObject("/ExtGState")] = DictionaryObject({NameObject("/GS1"): writer._add_object(state)})
        page[NameObject("/Contents")] = stream_object(writer, b"/GS1 gs BT (Embedded state) Tj ET")
        self.assertGreaterEqual(validate_fonts(self.write(writer), report_unused=False), 2)
        # The only reference to this painted font is now inside ExtGState.
        del fonts[embedded_name]
        self.assertGreaterEqual(validate_fonts(self.write(writer, "state-only.pdf"), report_unused=False), 2)

    def state_only_font(self, writer, font):
        page = writer.pages[0]
        page["/Resources"][NameObject("/ExtGState")] = DictionaryObject({
            NameObject("/GS1"): DictionaryObject({NameObject("/Font"): ArrayObject([font, NumberObject(10)])}),
        })
        page[NameObject("/Contents")] = stream_object(writer, b"/GS1 gs BT (A) Tj ET")

    def test_gs_only_empty_nonstream_and_undecodable_fontfile_programs_fail(self):
        for malformed in ["empty", "nonstream", "undecodable"]:
            writer = PdfWriter(clone_from=self.embedded_fixture())
            fonts = writer.pages[0]["/Resources"]["/Font"]
            name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
            font = fonts.raw_get(name)
            descriptor = font.get_object()["/FontDescriptor"]
            if malformed == "nonstream":
                program = DictionaryObject({NameObject("/Data"): TextStringObject("not a stream")})
            elif malformed == "undecodable":
                program = EncodedStreamObject()
                program._data = b"not an encoded program"
                program[NameObject("/Filter")] = NameObject("/UnsupportedFilter")
            else:
                program = DecodedStreamObject()
                program.set_data(b"")
            descriptor[NameObject("/FontFile2")] = writer._add_object(program)
            del fonts[name]
            self.state_only_font(writer, font)
            with self.subTest(malformed=malformed), self.assertRaisesRegex(AssertionError, "Unembedded painted fonts"):
                validate_fonts(self.write(writer))

    def test_gs_only_type_zero_font_uses_embedded_descendant_program(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        fonts = writer.pages[0]["/Resources"]["/Font"]
        name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        descriptor = fonts[name].raw_get("/FontDescriptor")
        del fonts[name]
        descendant = writer._add_object(DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/CIDFontType2"),
            NameObject("/BaseFont"): NameObject("/TypeZeroFixture"),
            NameObject("/FontDescriptor"): descriptor,
        }))
        font = writer._add_object(DictionaryObject({
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type0"),
            NameObject("/BaseFont"): NameObject("/TypeZeroFixture"),
            NameObject("/Encoding"): NameObject("/Identity-H"),
            NameObject("/DescendantFonts"): ArrayObject([descendant]),
        }))
        self.state_only_font(writer, font)
        self.assertGreaterEqual(validate_fonts(self.write(writer), report_unused=False), 2)

    def test_gs_only_type_three_requires_decodable_glyph_streams(self):
        for malformed in [False, "mapping", "value", "undecodable", "empty-program"]:
            writer = PdfWriter(clone_from=self.embedded_fixture())
            if malformed == "mapping":
                glyphs = TextStringObject("not a glyph mapping")
            elif malformed == "value":
                glyphs = DictionaryObject({NameObject("/A"): NumberObject(1)})
            else:
                if malformed == "undecodable":
                    program = EncodedStreamObject()
                    program._data = b"encoded glyph"
                    program[NameObject("/Filter")] = NameObject("/UnsupportedFilter")
                else:
                    program = DecodedStreamObject()
                    program.set_data(b"" if malformed == "empty-program" else b"1000 0 d0")
                glyphs = DictionaryObject({NameObject("/A"): writer._add_object(program)})
            font = writer._add_object(DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type3"),
                NameObject("/BaseFont"): NameObject("/TypeThreeFixture"),
                NameObject("/CharProcs"): glyphs,
            }))
            self.state_only_font(writer, font)
            with self.subTest(malformed=malformed):
                if malformed in {False, "empty-program"}:
                    self.assertGreaterEqual(validate_fonts(self.write(writer), report_unused=False), 3)
                else:
                    with self.assertRaisesRegex(AssertionError, "Unembedded painted fonts"):
                        validate_fonts(self.write(writer))

    def test_graphics_state_font_selection_restores_with_q_and_q(self):
        writer = PdfWriter(clone_from=self.embedded_fixture())
        page = writer.pages[0]
        fonts = page["/Resources"]["/Font"]
        embedded_name = next(name for name in fonts if "NotoSans" in str(fonts[name]["/BaseFont"]))
        state = DictionaryObject({NameObject("/Font"): ArrayObject([standard_font(writer), NumberObject(10)])})
        page["/Resources"][NameObject("/ExtGState")] = DictionaryObject({NameObject("/GS1"): writer._add_object(state)})
        page[NameObject("/Contents")] = stream_object(
            writer, f"BT {embedded_name} 10 Tf ET q /GS1 gs BT () Tj ET Q BT (Restored embedded) Tj ET".encode(),
        )
        self.assertGreaterEqual(validate_fonts(self.write(writer), report_unused=False), 2)

    def test_unknown_and_malformed_graphics_state_font_selections_fail(self):
        for selection in [ArrayObject(), ArrayObject([NullObject(), NumberObject(10)]), ArrayObject([NullObject()])]:
            writer = PdfWriter(clone_from=self.embedded_fixture())
            page = writer.pages[0]
            state = DictionaryObject({NameObject("/Font"): selection})
            page["/Resources"][NameObject("/ExtGState")] = DictionaryObject({NameObject("/GS1"): state})
            page[NameObject("/Contents")] = stream_object(writer, b"/GS1 gs BT (Invalid) Tj ET")
            with self.subTest(selection=selection), self.assertRaisesRegex(AssertionError, "graphics-state"):
                validate_fonts(self.write(writer))
        writer = PdfWriter(clone_from=self.embedded_fixture())
        writer.pages[0][NameObject("/Contents")] = stream_object(writer, b"/Absent gs")
        with self.assertRaisesRegex(AssertionError, "Unknown graphics-state"):
            validate_fonts(self.write(writer))


if __name__ == "__main__":
    unittest.main()
