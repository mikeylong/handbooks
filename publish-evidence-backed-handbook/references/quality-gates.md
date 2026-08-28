# Quality gates

A candidate is ready only when every required hard gate passes and the perceptual review finds no unresolved High-impact defect. Classify review findings as High, Medium, or Low.

## Source and evidence gates

- Canonical source is identified and preserved.
- Research cutoff and access date are recorded.
- Every changed factual claim maps to an accepted source.
- Author synthesis and inference are labeled.
- Gated, partial, conflicting, and stale sources are disclosed.
- Exact source diff matches the accepted change ledger.

## Editorial gates

- The intended audience and reader job remain clear.
- Headings, section order, terminology, and numbering are coherent.
- Examples are internally consistent and operationally safe enough to teach from.
- No placeholders, tool tokens, fabricated citations, or unresolved editorial notes remain.
- The actual candidate's changelog page, contents or index entry, and bookmark state match the passed changelog decision.

## PDF structural gates

- File reopens in strict mode and is not encrypted.
- Every page matches the required trim size and orientation.
- No page is blank, clipped, unexpectedly duplicated, or outside the media box.
- Fonts are embedded; glyph extraction shows no unreadable substitutions.
- Metadata, page labels, outlines, internal destinations, external links, and table of contents agree.
- The candidate-specific page map, not the design specimen's page map, agrees with the final PDF.
- PDF version is compatible with all features used and is preserved through post-processing.
- Print-critical images meet effective-resolution requirements.
- Image objects have no `/SMask`, `/Mask`, or live transparency structure that the target renderer handles unreliably.
- An illustration is painted once at its intended placement, not fragmented or duplicated.
- Every page-map entry that requires an illustration resolves to exactly one raster image paint on that PDF page. Zero-image opener pages fail even when every other structural check passes.

## Visual and print gates

- Render every page and inspect a complete contact sheet.
- Inspect at full size: cover, contents, every chapter opener, every page with an image or diagram, the densest table, code, references, index, and final page.
- Compare representative page roles with the canonical specimen.
- Confirm typography, margins, hierarchy, rules, running furniture, page numbers, whitespace, table wrapping, and diagram labels.
- Confirm widows, orphans, heading separation, and accidental blank areas are acceptable.
- Confirm illustrations remain coherent at normal viewing scale and print resolution.
- Confirm generated chapter art matches the governing illustration treatment rather than reading as a flowchart, labeled diagram, icon, or generic stock image.

## Cross-renderer gates

When the PDF will be read across ecosystems, inspect the exact candidate in at least two independent renderers. One should use the operating system PDF stack when that stack is a supported target. Record renderer names and versions when available.

A successful render in the generator's browser is not proof of compatibility with another PDF engine.

## Release-integrity gates

- Candidate hash is recorded before approval.
- Production source and artifact status are recorded.
- Recommended version bump follows `edition-and-release.md`.
- Release, tag, push, deploy, billing, notification, and outreach authority are explicit.
- The promoted artifact hash equals the approved candidate hash.

If a hard gate fails, stop at the candidate stage and report the failed gate plus its log or proof path.
