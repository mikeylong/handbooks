# Claude Design Field Guide package

This package answers a specific workflow question: can Claude Design work from a real design system, extend an existing product screen, and hand the result to developers without forcing them to reconstruct the design intent?

The answer is yes, with a tool boundary. Claude Design is the system-grounded prototype and review environment. Claude Code is the repository-aware implementation path. Figma MCP and Code Connect are the native-Figma branch when editable frames or a design/code round-trip remain required.

## Files

- `Claude_Design_End_to_End_Field_Guide.pdf` — polished A5 field guide.
- `Claude_Design_Field_Guide_Source.md` — editable manuscript and source of the PDF's content.
- `build_claude_design_field_guide.py` — reproducible ReportLab builder.
- `Claude_Design_Prompt_Pack.md` — copy-ready prompts for Claude Design, Claude Code, and Figma MCP.
- `Claude_Design_Handoff_Template.md` — editable design-to-development handoff template.
- `Claude_Design_Validation_Checklist.md` — design, handoff, and implementation validation checklist.
- `Simple_Design_System_Setup.md` — focused setup and inspection instructions for the example design system.
- `Claude_Design_Diagram_and_Illustration_QA.md` — rendered evidence for the instructional diagrams and chapter-opening art.
- `validate_claude_design_field_guide.py` — reproducible PDF-structure and chapter-asset checks.
- `prepare_chapter_art.py` — reproducible conversion from ImageGen originals to PDF-ready grayscale assets.
- `assets/chapter-art/PROMPTS.md` — compact creative specification and chapter-to-asset mapping.
- `assets/chapter-art/GENERATION_RECORD.md` — exact submitted prompts, ImageGen call evidence, reference identities, hashes, transformation recipe, and approval status.
- `assets/chapter-art/original/` — 11 built-in ImageGen originals.
- `assets/chapter-art/pdf/` — 11 normalized 1200×686 grayscale derivatives at 280 ppi.

## Rebuild the PDF

Use a Python environment with ReportLab, Pillow, pypdf, and pdfplumber installed.
ReportLab builds the PDF, Pillow prepares and inspects the artwork, pypdf runs
the structural checks, and pdfplumber verifies panel geometry, object bounds,
and overlap regressions.

```sh
python3 build_claude_design_field_guide.py
```

The builder reads `Claude_Design_Field_Guide_Source.md` from the same directory and writes `Claude_Design_End_to_End_Field_Guide.pdf` beside it.

The builder also expects `assets/chapter-art/pdf/chapter-01.png` through `chapter-11.png`. To regenerate those derivatives from the included ImageGen originals, run:

```sh
python3 prepare_chapter_art.py
```

Then validate the finished PDF and art package:

```sh
python3 validate_claude_design_field_guide.py
```

## Source notes

The guide uses the user-supplied Simple Design System Community link as provenance and Figma's `figma/sds` repository as the inspectable code and metadata source. The connected Figma account did not have editor access to the public Community file, so live-file page structure and variants remain explicitly unverified. The guide instructs readers to make an editable Drafts copy before connected inspection or editing.

Product details reflect official sources available August 5, 2026. Claude Design and Figma MCP are changing quickly; verify plan availability, setup commands, exports, permissions, governance, and known limitations before adoption.

Chapter-opening illustrations were generated with the built-in ImageGen workflow, one chapter-specific prompt per asset. The prompt record, untouched originals, normalized PDF derivatives, and rendered QA record are included so the visual system can be inspected rather than inferred.

`Claude_Design_Prompt_Pack.md` covers the product-design and engineering workflow. It is separate from the chapter-art generation record under `assets/chapter-art/`.
