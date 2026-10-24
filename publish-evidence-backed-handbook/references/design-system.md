# Handbook design system

## Authority

The bundled system has three coordinated authorities:

1. `specimen/canonical-handbook-specimen.pdf` is the perceptual authority.
2. `../assets/design-system/tokens.json` and this document define the measurable rules.
3. `../assets/design-system/print.css` and the templates are the reusable implementation.

If they disagree, stop and report design-system drift. Do not silently reinterpret the specimen or change it during an ordinary handbook run. A governing project-specific system supplied by the user takes precedence, but it must be recorded as the replacement authority.

The specimen encodes representative page roles from an approved full-handbook visual grammar using neutral example content. It is a visual reference, not a source of reusable prose. Use `specimen/canonical-page-map.json` to locate each pattern.

## Visual character

The system is an A5 editorial field guide: restrained, monochrome, practical, and book-like rather than interface-like. It relies on a strong serif hierarchy, compact sans-serif navigation and data labels, generous whitespace, fine rules, technical diagrams, and one purposeful monochrome illustration on chapter openers.

Avoid decorative color, card-heavy interface patterns, glossy gradients, generic stock imagery, ornamental borders, and dense dashboard styling. Visual interest should come from typography, spacing, contrast, diagrams, tables, and illustration craft.

## Page geometry

- Trim: A5, 148 x 210 mm, represented by 420 x 594.96 points.
- Print margins: 15 mm top, 13 mm inside/outside, 18 mm bottom.
- The reading column is deliberately narrow. Do not stretch prose to fill available space.
- Cover, foreword, contents, every chapter opener, and major back-matter openings start on their own pages.
- Running heads and page numbers sit outside the content frame, separated by hairline rules.

## Typography

- Narrative face: Source Serif 4, supplied under the SIL Open Font License. Use optical sizing and normal kerning.
- Labels and navigation: bundled Noto Sans in uppercase with deliberate tracking.
- Code: bundled Source Code Pro.
- Print body: 10 pt with 1.5 line height.
- Cover title: 42 pt, regular weight, tight leading and tracking.
- Chapter title: 28 pt, regular weight, compact leading.
- Major section: 18 pt; subsection: 14 pt.
- Tables: normally 7.2 pt and never below 6.6 pt without an explicit readability review.
- Code: at least 7.8 pt with approximately 1.55 line height.
- Use at least three widows and three orphans. Keep headings with following content.

### Heading wrapping

Multiline headings must not strand one trailing word or a tiny final fragment. Keep meaningful phrases together while preserving the heading's wording, font size, type hierarchy and available page width. The shared PDF formatters measure the actual heading and, when needed, choose the widest slightly narrower wrapping width that leaves at least two words and one quarter of the original width on the final line, without increasing the line count. This is a general rule, not a set of book-specific line breaks. Explicit author line breaks remain explicit. If an unbreakable word or other constraint prevents a valid wrap, flag the heading for visual review instead of shrinking the type. Short, single-line headings keep their original geometry.

PDF subsection headings display the title without decimal prefixes such as `2.1`. Preserve that source identifier for navigation and tracking. The PDF preparation hook gives each subsection a stable `section-2-1` anchor and changes matching in-text/index section references to linked titles. Chapter markers, procedural steps, diagram order, numerical data and source citation labels retain their numbering. Reader source headings keep their IDs and numbers; this rule governs the PDF presentation. Audit references whenever prefixes are removed so readers are not sent to invisible labels.

Use `INDEX_REFERENCE` for index-entry paragraphs containing section IDs. In narrative prose, references introduced by `section`, `in` or `see` are resolved against known subsection IDs. Unmarked decimal values and versions are preserved. Links and code are excluded from rewriting.

The serif voice should carry narrative and synthesis. The sans voice should carry labels, metadata, table structures, citations, and compact operational information.

## Palette and rules

Print uses white paper, black primary ink, dark gray secondary ink, and two neutral rule values. The canonical values are in `tokens.json`. Do not use transparency to simulate gray for critical print elements.

Use one-pixel or sub-point rules to establish hierarchy. Heavy boxes should be rare. Tables and examples normally use strong rules at their outer boundaries and lighter row rules internally.

## Page and component patterns

### Cover

Use a large multi-line serif title, concise subtitle, author credit, and a restrained date/version line. Preserve generous negative space. Do not add an eyebrow above the title.

### Foreword

Open with a large editorial heading, without an eyebrow. State the premise and reading model quickly. Use a short pull quote or compact operating principles only when they add orientation.

### Contents

Use a compact ruled list with chapter numbers, titles, and page numbers. The contents must reflect the stabilized final page map.

### Chapter opener

Use a small uppercase chapter kicker, a balanced serif title, one italic deck, and one centered monochrome technical illustration. The opener is a full page and should feel quieter than a poster.

### Eyebrow roles

Eyebrows appear only as chapter markers immediately above chapter titles, for example `CHAPTER 01`. Cover, preface, contents, and back-matter headings do not receive eyebrows. Keep actual titles, author/date/version metadata, running headers, and page numbers; those are separate roles.

This chapter-only rule was approved on 2026-10-23 and supersedes the nonchapter labels visible in the retained specimen. Preserve the historical specimen PDF; new builds follow this rule.

The shared ReportLab and Markdown formatters require the explicit `chapter-marker` role on an eyebrow paragraph. Chapter-opening helpers set that role. Existing `CoverKicker`, `ChapterKicker`, and `TOCKicker` styles are recognized as eyebrow styles, but a style name alone does not authorize a visible marker. New eyebrow styles declare `handbookEyebrow=True`. Without the chapter-marker role, the formatter omits the label and its spacing. This rule depends on semantic role, never on the label's text. The hosted reader applies the same rule and retains chapter markers inside chapter headers. HTML eyebrows use `data-role="chapter-marker"`.

### Narrative section

Use numbered headings, short paragraphs, operational lists, and selective bolding. Attach source markers to supported claims and end sourced sections with a compact source line plus an explicit synthesis note when needed.

### Tables and editorial examples

Prefer comparisons, contracts, budgets, checklists, and decision matrices over ornamental callouts. Labels are compact sans serif; explanatory text remains readable. Repeat table headers across page breaks and keep rows intact.

### Diagrams

Use vector geometry, a single ink color, consistent node shapes, and clear flow direction. Labels must remain legible at final A5 size. Diagrams should explain architecture, sequence, branching, ownership, or tradeoffs that prose alone would make harder to understand.

### Back matter

Notes and sources use grouped references with stable labels and direct URLs. The index uses compact multi-column typography and meaningful cross-references. A changelog, when required, is the final page.

## Illustration direction

- Prefer original chapter-opener raster art made with the host's image-generation capability and follow `illustration-workflow.md`. When that capability is missing or unavailable, or when the user explicitly requests sourced open art, `open-image-fallback.md` permits a verified public-domain or openly licensed image only if it matches this treatment. Deterministic geometry is appropriate for diagrams, not as a substitute for illustration.
- Use coherent black-and-white technical, engraved, or stippled line art on an opaque white background.
- The illustration should embody the chapter's mental model, not merely decorate its topic.
- Maintain consistent camera angle, line density, scale, contrast, and white-space behavior across a set.
- Hosted chapter art uses separately authored light/dark appearances under `hosted-appearance.md`. Dark screen art keeps natural shading on a transparent outer background; the page supplies its exact charcoal. The canonical Daytime specimen and artwork remain unchanged. Explicit Late night PDF derivatives follow [PDF appearances](pdf-appearances.md).
- Final print images must be precomposed and opaque. Remove live filters, clip paths, masks, blend modes, and soft-mask transparency before PDF generation.
- Prefer 300 effective PPI at final size; 240 PPI is the minimum acceptance threshold for print-critical raster art.
- Require one intended image paint per illustration placement. Duplicate paints or fragmented image masks are blockers.
- Freeze selected and normalized art into the candidate with mode-specific provenance: prompt and references for generated work, or item-page, creator, source, license, credit, and modification evidence for open-web work. Always record transforms and hashes. Reproducible layout starts from those frozen assets; it does not require image generation during every build.

## Reference protocol

Before producing layout:

1. Render the canonical specimen pages to images.
2. Read the page map and identify the roles needed by the target manuscript.
3. Use the supplied tokens and templates rather than recreating values by eye.
4. Record any intentional departure and its reason.

During review:

1. Render every candidate page and inspect a contact sheet.
2. Compare cover, contents, one opener, one narrative page, one dense table/example page, and back matter with the corresponding specimen roles.
3. Treat unplanned changes in hierarchy, density, whitespace, illustration treatment, or running furniture as design-system drift.
