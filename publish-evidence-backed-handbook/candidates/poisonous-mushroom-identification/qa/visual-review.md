# Visual and cross-renderer review

**Result:** Passed with no unresolved High-, Medium-, or Low-impact visual defect.

## Exact artifact reviewed

- PDF: `output/pdf/poisonous-mushroom-identification-handbook.pdf`
- SHA-256: `507df2b77bf37821032ba7f31b6c16e03aaced47602125a446178ecd62be18e7`
- Format: 20 A5 portrait pages at 420 x 594.96 points

## Renderer evidence

- Poppler `pdftoppm` 26.02.0, 180 DPI: complete contact sheet inspected; revised page 13 inspected at full size against the previously passed full-page baseline.
- Apple PDFKit on macOS 26.6.2 (Swift 6.3.3 renderer harness), 180 DPI: complete contact sheet inspected; revised page 13 inspected at full size.

Proof directories:

- `qa/poppler-proof/`
- `qa/pdfkit-proof/`

## Checks completed

- The complete Poppler and PDFKit contact sheets show no reflow or regression outside the revised page. Cover, contents, chapter openers, tables, timeline, emergency response, references, index, and final-page states remain consistent with the prior full-size review.
- Each generated opener illustration was compared with the canonical stippled monochrome illustration specimen. The four images form a coherent set, read as illustrations rather than diagrams, contain no labels or watermarks, and preserve the intended quiet editorial hierarchy.
- The page-11 Amanita warning graphic is now an unlabeled generated natural-history engraving. It matches the monochrome stippled treatment, shows the free gills, fragile ring, bulb, and volva clearly, and does not read as a vector callout diagram or species-identification key.
- The page-13 morel warning graphic is now one unlabeled generated natural-history comparison plate. Its exterior and longitudinal-section studies make the pitted continuous-hollow pattern visibly distinct from the irregular brainlike chambered warning pattern, while the editable labels and adjacent prose prevent it from reading as a standalone edibility key.
- Pages 4, 7, 10, 11, 13, and 14 each paint exactly one opaque raster illustration with no mask or soft mask. The chapter openers render at approximately 313 PPI; page 11 renders at 406.74 by 408.12 PPI; page 13 renders at 408.71 by 408.24 PPI.
- Other explanatory body diagrams stay vector artwork and are legible in both complete contact sheets; page 13 is intentionally raster illustration plus editable HTML labels.
- Typography, margins, hierarchy, rules, running heads, printed folios, whitespace, table wrapping, diagram labels, and source strips were checked.
- Both renderers show the same complete emergency guidance, source list, index, and footer state.
- No blank, clipped, duplicated, masked, transparent, or unexpectedly rasterized page content remains. The generated page-11 and page-13 illustrations are fully contained, page 13 does not reflow or enter the footer area, and both renderers preserve the same caption alignment.

## Defects found and resolved during review

- Page 16 international emergency guidance was clipped; the page-specific layout was tightened and rebuilt.
- Printed folios inherited a hidden global style; the candidate override now displays them consistently.
- Cover metadata sat on the trim edge; it now aligns to the page margin.
- The final index note entered the footer area; index spacing now keeps it above the footer rule.
- The original chapter openers used deterministic SVG constructions that did not meet the illustration style. They were replaced with four independently generated, frozen raster illustrations and the complete two-renderer proof was regenerated.
- The page-11 Amanita warning figure still used a deterministic labeled SVG. It was replaced with a generated, frozen botanical engraving; the four former callout details were preserved in editable prose, and page-specific raster validation plus both renderer proofs were regenerated.
- The page-13 true-morel and false-morel comparison still used paired deterministic SVGs. They were replaced with one generated, frozen botanical comparison plate; the four former SVG labels and the non-certification safety limit remain editable text, and page-specific raster validation plus both renderer proofs were regenerated.

Every correction was made in the editable source and verified again in both renderers.
