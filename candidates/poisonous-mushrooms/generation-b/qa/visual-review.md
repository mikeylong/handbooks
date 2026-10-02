# Visual and cross-renderer review

**Result:** Passed with no unresolved High-, Medium-, or Low-impact visual defect.

## Exact artifact reviewed

- PDF: `output/pdf/poisonous-mushroom-identification-handbook-generation-b.pdf`
- SHA-256: `741223fb6f8c1408f8164ffc5d3b4418337f6369dd37cb839f16b5a68c0dff63`
- Format: 20 A5 portrait pages at 420 x 594.96 points
- Variant: Generation B, open-image fallback with image generation deliberately blocked

## Renderer evidence

- Poppler `pdftoppm` 26.02.0, 180 DPI: complete contact sheet and full-size pages 4, 7, 10, 11, 13, 14, and 19 inspected.
- Apple PDFKit on macOS 26.6.2 via Swift 6.3.3, 180 DPI: complete contact sheet and the same seven full-size pages inspected.

Proof directories and contact-sheet hashes:

- `qa/poppler-proof/`; contact sheet SHA-256 `83acd12ec1cded3b239b50e7b21926680adc9555176dfc6c1dde2fec5126976d`
- `qa/pdfkit-proof/`; contact sheet SHA-256 `bfd897c1ecd51d429bd91eb112e18a724a48f0005b69bfc61f30d9c9df8a2eb5`

## Checks completed

- Both complete contact sheets show the same 20-page structure, typography, margins, hierarchy, rules, running heads, printed folios, tables, timeline, decision diagram, references, index, and footer states.
- Pages 4, 7, 10, 11, 13, and 14 each contain exactly one opaque raster illustration with no mask or soft mask.
- The four chapter openers read as a coherent historical botanical set and remain subordinate to the chapter titles.
- Page 11 presents two Amanita studies without historical labels. A visible caption identifies them as toxic *Amanita muscaria*, explicitly says they are not death caps, and limits them to a stop-pattern example. The image and caption are fully contained and the adjacent warning text remains legible.
- Page 13 visibly distinguishes pitted-ridged and wrinkled-brainlike exterior forms. It does not depict internal anatomy, and its editable captions do not claim that it does.
- Page 19 visibly carries the Generation B attribution, license, modification notice, and non-key safety limitation without entering the footer.
- Required-placement effective resolution ranges from 313.18 to 425.21 PPI, above the 240-PPI minimum.
- No blank, clipped, duplicated, transparent, unexpectedly masked, or unexpectedly rasterized page content remains.

## Defect found and resolved during review

- The initial page-11 open-image composition was too tall and entered the lower source area. Its print width and containment were corrected in the editable CSS, the PDF was rebuilt twice reproducibly, structural validation was rerun, and both renderer proofs were regenerated and reinspected.
- The page-11 species limitation initially existed only in alt text. A concise visible caption now distinguishes the illustrated *A. muscaria* from death caps for sighted readers; both renderer proofs confirm it remains legible and does not disturb page containment.

Every correction was made in editable source and verified again in both renderers.
