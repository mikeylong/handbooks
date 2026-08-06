# Diagram and chapter-illustration QA

**Artifact:** `Claude_Design_End_to_End_Field_Guide.pdf`  
**QA status:** Pass  
**Rendered size:** A5, 109 pages  
**Review date:** August 5, 2026

This review checks the diagrams and chapter-opening illustrations against the visual production rules established for the *AI Evaluation Field Guide*: simple geometry, trustworthy direction, one readable metaphor per chapter, generous white space, and proof at the size readers will actually see.

## Instructional diagrams

| Physical page | Figure | QA evidence | Result |
|---:|---|---|---|
| 1 | Cover sequence | Five equal nodes, equal gutters, explicit label color, centered connectors, and an unbroken `SYSTEM → SCREEN → STATES → HANDOFF → CODE` sequence. | Pass |
| 4 | End-to-end workflow | Eight equal cards in a 2×4 grid; identical number rails; orthogonal connectors; consistent arrowheads; unambiguous clockwise sequence; explicit `8 → 1` evidence-and-drift return. No connector crosses a card or label. | Pass |
| 5 | Shared product-state spine | One intentionally distinct source, one aligned distribution spine, four equal destination cards, orthogonal branches, and centered card ports. The figure communicates coordination, not a false sequence. | Pass |

The smallest secondary text is on page 5. It remains readable in the A5 render and should not be reduced further.

## Chapter-opening illustrations

The built-in ImageGen workflow produced one original illustration per chapter. Each prompt uses a chapter-specific mechanical metaphor and a shared series lock: black-and-white pointillist technical engraving, a single broad apparatus, pure white background, generous margins, no captions or labels, and no decorative scenery.

| Physical page | Chapter | Dominant read at A5 | Result |
|---:|---|---|---|
| 7 | Decide what is authoritative | Multiple sources resolve through one governing comparator. | Pass |
| 14 | Prepare Simple Design System | An organized component and tool kit becomes a portable working system. | Pass |
| 21 | Validate the imported system | One measurement bench tests three visibly different specimens. | Pass |
| 27 | Extend the existing screen | A preserved machine shell contains one bounded internal retrofit. | Pass |
| 34 | Design the adjacent surfaces | Three distinct work surfaces share one central selection mechanism. | Pass |
| 41 | Specify states and transitions | A rotary state mechanism exposes stable positions and constrained movement. | Pass |
| 48 | Prove responsive and accessible behavior | Handwheel, tactile keys, flag, and bell operate one adjustable carriage. | Pass |
| 54 | Run the design evidence gate | Multiple independent instruments inspect one specimen before release. | Pass |
| 60 | Hand off to Claude Code and developers | A keyed bundle transfers into a compatible receiving machine. | Pass |
| 68 | Implement, verify, and reconcile | Master and working gears meet under one mismatch gauge and correction loop. | Pass |
| 75 | Guided capstone | One left-to-right production line includes a clear failure and recovery path. | Pass |

All 11 images are visually distinct, centered, uncropped, label-free, and fitted without a visible background seam. The final PDF derivatives are grayscale PNGs at 1200×686 pixels and 280 ppi. Every outer edge is pure white.

## Full-document checks

- All 109 pages were freshly rendered at 200 ppi and reviewed in contact sheets; the diagram pages, 11 chapter openers, prompt panels, split tables, and corrected pagination boundaries were also inspected individually.
- Every page is A5 with zero rotation; no blank, clipped, or visibly overflowing page was found.
- The PDF contains exactly 11 raster images, on the 11 expected chapter-opening pages. Each is embedded as an 8-bit grayscale 1200×686 image at 280 ppi.
- Chapter bookmarks, appendix headings, source links, text extraction, missing-glyph markers, and pagination were checked programmatically.
- The geometry validator checked 95,863 PDF objects and 14,122 extracted words. It found zero word-word, word-rule, image-word, filled-panel-boundary, or page-boundary collisions.
- All 28 logical prompt panels and 31 rendered prompt headers have a clean, measurable header/body seam. On physical page 29, the first prompt's header text clears the seam by 5.32 points and its first body line begins 10.73 points below it.
- The capstone scorecard and its four mandatory gates remain together on physical page 89; no prompt header, list fragment, or section label is orphaned.
- The `Keep copy operational` section now begins as a complete unit on physical page 45 instead of leaving its numbered questions behind on the following page.
- A clean extraction of the delivery ZIP regenerated all chapter-art derivatives and rebuilt the PDF successfully; its 109 rendered pages were pixel-identical to the delivered PDF.
- `validate_claude_design_field_guide.py` reproduces the structural and asset checks. The exact ImageGen call record, prompt text, reference identities, hashes, and both original and PDF-ready assets are included under `assets/chapter-art/`.

## Panel-layout regression

The annotated page exposed a shared layout defect rather than a one-page exception. In the superseded 107-page build, paragraph padding painted outside ReportLab's allocated flow height. That produced 27 prompt-header collisions across 19 pages, affected all six callout panels, and made the standalone code panel vulnerable to the same overflow.

Prompt, callout, and code panels now use height-aware table rows with explicit padding and split behavior. The corrected flow adds two legitimate pages, repeats prompt labels when a panel must split, and keeps callout borders inside their allocated boxes. A second rendered and geometry-based audit found no remaining High, Medium, or Low visual suspects.

## Proof boundary

This is production QA of the rendered artifact. It verifies geometry, routing, fit, legibility, technical image properties, and the intended chapter-level semantic read. It does not substitute for independent editorial approval, accessibility testing with assistive technology, or a live product validation of Claude Design itself.
