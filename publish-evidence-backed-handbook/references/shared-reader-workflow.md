# Shared reader implementation and edition checks

Use this contract when creating or revising a hosted reader, migrating an existing reader, or changing shared appearance, illustrations, or diagrams. Apply it to existing titles, new editions, and future titles.

## Own reusable code in the skill

The publishing skill owns reusable reader rendering, theme assets, artwork-pair installation, diagram rendering, validation, and regression fixtures. Keep executable modules in this package's `scripts/`, browser assets in `assets/`, and portable fixtures with the package. Books call those modules through thin adapters. Do not copy reusable scripts, reader templates, CSS, or browser code into handbook source folders.

Each handbook owns its manuscript, evidence, edition metadata, selected artwork, provenance manifests, semantic diagram definitions, and any governing design differences. Adapters supply those inputs and explicit output paths to the shared implementation. Preserve book-specific wording, captions, numbering, and layout decisions during consolidation. Do not make one handbook import another handbook's generator as its reusable runtime.

The collection site owns catalog approval, route assembly, gallery composition, and deployment. Its build invokes the skill's reader modules and installs browser assets from the skill into generated output. Generated output may contain copies of required runtime files; those copies are build products, never maintained source copies.

Resolve the toolkit from the collection's `publish-evidence-backed-handbook/` directory or the existing `HANDBOOK_PUBLISHING_TOOLKIT` override. Fail clearly when the toolkit is unavailable. Keep the packaged skill usable outside this collection: reusable modules take input paths and configuration rather than depending on a sibling book or a local deployment folder.

## Consolidate before extending

Inventory each active builder and its callers before extracting code. Compare duplicated paragraph/table conversion, reader chrome, CSS, artwork processing, diagram rasterization, and validation. Separate genuinely shared behavior from intentional book differences.

Move reusable behavior into the skill, then replace existing callers with imports or thin command adapters. Keep a compatibility wrapper only when an existing command needs it; wrappers must delegate rather than retain a second implementation. Move the collection's reusable appearance and artwork modules and browser assets into the package too. Leave collection-specific catalog and deployment code in the site.

Verify candidate output and semantic parity before removing obsolete maintained copies. Preserve historical archives, frozen reader packages, released PDFs, and selected image bytes. Include new modules, assets, references, and fixtures in the skill distribution manifest; validate an extracted package so packaging cannot silently omit the shared runtime.

## Responsive artwork

Follow [hosted appearance](hosted-appearance.md) and [illustration acquisition](illustration-workflow.md). Every hosted chapter needs an original light/print asset and a separately authored dark screen asset with transparent outer margins. The page supplies the exact background color. Never invert or filter the light asset.

Shared screen styles remove default margins from paired figures and size child images responsively with automatic height. Artwork must fit regardless of a book's figure class or source-image dimensions. Keep original light artwork as the print fallback. Test wide, tall, and oversized inputs at 390 px and 1440 px against the actual shared stylesheet, without injecting a corrective test stylesheet.

## Semantic diagrams

Keep labels, nodes, ordering, branches, feedback edges, and explanatory notes in handbook-owned definitions. Repeated placements use one definition. Shared web renderers produce responsive HTML or inline SVG using theme ink, muted text, paper, and line tokens. PDF flowables consume the same semantic data while preserving their governing print geometry and typography.

Simple diagrams should reflow on narrow screens. Complex graphs may pan inside a labelled container. Require an accessible description and readable text equivalent. Primary labels must render at least 16 CSS px on mobile and 14 CSS px on desktop; keep notes readable without shrinking the whole diagram. Reject clipped labels, ambiguous connectors, page-wide overflow, and unintended light panels in Dark.

For legacy frozen packages, bind each hosted replacement to its approved raster asset and semantic definition with hashes. Apply replacements during the shared build and retain original raster diagrams for browser printing. Do not rewrite approved packages or released PDFs. When PDF generator extraction changes code, compare isolated candidates with Poppler and Apple PDFKit before accepting the extraction.

## New-edition and future-title gates

Keep these tests in the skill so every caller uses the same checks:

1. Render an existing title's next-edition fixture and an arbitrary future title with more than twelve chapters, unfamiliar figure classes, and wide, tall, or oversized artwork. Require correct Light/Dark sources, preserved image proportions, transparent margins matching the page, and no page-wide overflow at 390 px and 1440 px.
2. Accept prose-only reuse of frozen pairs. Reject changed light assets with stale pair hashes, missing pairs for added chapters, and unused mappings after removed chapters.
3. Exercise sequences, branches, feedback loops, and repeated diagram placements. Compare labels, nodes, and edges with the definitions. Reject stale source bindings, changed definitions with stale mappings, and unmapped technical diagrams. SVG presence alone is insufficient proof.
4. Exercise System, Light, and Dark; persistence; blocked storage; JavaScript-disabled fallback; diagram reflow or internal panning; and printing from Dark. Inspect artwork and diagram quality visually as well as mechanically.
5. Verify approved package and PDF hashes. Route hosted candidates through the collection build, which calls the skill. Fixtures and passing checks do not approve a title, edition, or deployment.

Step markers inside single-cell nested tables must align with the adjacent first line of text. The shared reader stylesheet removes the wrapper's extra padding while preserving genuine nested data-table spacing. `checkReaderBrowser` checks this at 390 px and 1440 px in Light and Dark, including the next-edition and future-title fixtures.

## Prompt examples

Prompt directives render with a compact “Prompt” indicator, a tool/task heading, and a monospace body. For frozen legacy readers, a book-owned `prompt-bindings.json` records the approved reader hash and each prompt table's hash, title, and placement count. The collection build applies `scripts/prompt-blocks.mjs` without changing the frozen reader or PDFs. Unbound data tables remain unchanged; stale bindings fail the build.

## Terminal commands

Shell fences render in a bordered block with a compact “Terminal” label and a monospace `pre`/`code` body. Preserve exact source text, indentation, and line breaks. Do not add a shell prompt to copyable commands. Other code fences use the “Code” label. Frozen readers use book-owned `terminal-bindings.json` hashes to bind their original command callouts and exact source bodies; stale readers, changed commands, and missing placements fail the build.

## Runtime dependencies

Every current and future hosted handbook includes a Markdown edition alongside its PDF links through the shared download builders. For a portable text edition, use the [machine-readable Markdown export](machine-readable-markdown.md). It converts manuscript directives to standard Markdown and supplies a source index without changing the manuscript or hosted reader.

Use Node.js 22 or newer for the hosted modules and tests. Install this package's pinned Python requirements for the ReportLab reader converter. PDF diagram raster fallbacks also require Poppler; cross-renderer proof uses Apple PDFKit through the supplied Swift renderer.

## Runtime entry points

1. `scripts/flowable_reader.py` builds a reader from a handbook's ReportLab story and `source/reader-config.json`. Book adapters resolve this toolkit and call `main(book_root)`. The default output is `output/reader-candidate/`; pass `--output` to select another isolated candidate location and optionally `--reader-chrome` for an explicitly governed template. The shared default chrome and styles live in `assets/reader/`.
2. `scripts/build-approved-reader.mjs` and `scripts/validate-reader-release.mjs` provide common approved-package assembly and release checks. Book adapters supply their root, slug, and release-check configuration. These checks preserve book-specific chapter counts, evidence counts, and semantic-list requirements.
3. `scripts/artwork-pairs.mjs`, `scripts/diagrams.mjs`, `scripts/site-theme.mjs`, and `scripts/publication-front.mjs` install and validate hosted appearance. The collection build invokes them through its toolkit adapter. `assets/reader/` supplies the shared browser runtime.
4. `scripts/build-reader-fixtures.mjs <isolated-output-directory>` creates next-edition and 25-chapter fixtures with synthetic test geometry. Keep those fixtures outside public output. `scripts/reader-browser-check.mjs` exports a check for the host's Playwright CLI; supply fixture and reader URLs and an optional screenshot directory.
5. Run `scripts/test-artwork-pairs.mjs`, `scripts/test-site-theme.mjs`, and `scripts/test-diagrams.mjs` with Node. The theme test optionally accepts a built-site directory. Validate an extracted distribution with `scripts/validate-package.py` and run the same runtime tests there.

### Book input formats

Inline screenshot figures use the [shared screenshot manifest and source markers](screenshot-figures.md). Keep selected captures and prepared crops in the book. The same manifest supplies PDF panels, hosted figures and immutable Markdown image links; missing or stale figure inputs fail the build.

`source/reader-config.json` records the story function, illustration and diagram flowable class names, title/subtitle and canonical URL, and the governing conversion options. Release checks record chapter and source counts, citation prefix, prohibited review text, and semantic-list requirements. Keep those decisions with the book; implement reusable behavior in the toolkit.

Each `source/diagrams/<name>.json` defines `title`, `kind` (`sequence` or `branch`), nodes (`id`, `label`, optional `detail`), edges (`from`, `to`, optional `feedback`), and an optional `note`. Preserve any legacy `printAlt` and `printCaption` in the same definition. Fixed PDF flowables check node counts and relationships against their geometry and fail when a semantic update requires a new drawing layout. PDF drawing code loads the same definition through `scripts/diagram_data.py`. Extend the shared renderer when a future diagram needs another shape.

`diagram-bindings.json` has `schemaVersion: 1` and a `diagrams` array. Every binding records an approved package-relative `asset` and its `assetSha256`, a book-relative `definition` and its `definitionSha256`, and an exact `placements` count. Bindings protect semantic updates and repeated placements against stale hosted output. The build rejects unbound raster technical diagrams, including readers with a missing bindings file.

## Scope of this consolidation

Evaluation and Consulting use the shared flowable converter, package assembler, and release validator. All hosted titles use the skill-owned appearance and artwork runtime. Their four raster diagram types use shared responsive rendering across five placements, with original print fallbacks. Production's existing inline diagrams retain their approved rendering. Book-specific manuscript and PDF layout builders remain book-owned; this consolidation does not certify those builders as a general-purpose shared PDF layout engine.

Rendered regression proof and visual review remain required before a candidate is called ready. Passing fixture tests does not approve a title, edition, or deployment.

### Chapter-only eyebrows

Follow the [eyebrow role contract](design-system.md#eyebrow-roles). Both PDF runtimes and the flowable reader use `scripts/eyebrow_roles.py`. Chapter helpers explicitly assign `role='chapter-marker'`; nonchapter eyebrows are omitted without spacing. The reader places allowed markers inside the corresponding chapter header. Keep ordinary titles, metadata and running furniture. Run `scripts/test-eyebrow-roles.py` after changes to these semantics.

## Paired PDF appearances

Apply [PDF appearances](pdf-appearances.md) to explicit Daytime version and Late night version downloads, shared generation, retained releases, additive appearance revisions, exact-hash approval, cross-renderer proof and future editions. An appearance companion preserves its content edition and existing Daytime bytes. Browser printing stays Light. A failed companion blocks the initial three-title launch.

### Compact concept diagrams

For a small cause/action branch or a three-stage ownership loop, use `ConceptDiagram(book_root, definition_name)` from `scripts/concept_diagrams.py`. The book owns `source/diagrams/<definition_name>.json`: an ID, title, three labelled nodes with details, exact edges, and a complete `textEquivalent`. `layout` is `branch-actions` or `ownership-loop`; ownership nodes also have roles and a feedback label. The shared class rejects edges that do not fit its geometry. It draws vector PDF content and the flowable reader emits a responsive HTML diagram with the same labels and an accessible description. Markdown uses the text equivalent, not a screenshot or table. The shared stylesheet stacks branches and loop stages on phones without reducing primary labels below 16 px. Validate the actual PDF and hosted rendering after changes.

Use `ordered-sequence` for a process of two to eight steps. Its edges must connect each step to the next in order; the PDF and reader show numbered steps and connecting arrows. Keep labels and explanatory detail with each step, and include the complete sequence in the text equivalent. Choose this when order matters, rather than converting a process into a two-column table merely for visual variety.

## Reader download placement

Use exactly one Markdown-first download group in each of three locations: the top cover, desktop sidebar, and mobile Contents dialog footer. Do not append a download area to the main content. Edition pages retain their separate controls. `installReaderDownloads` enforces this structure with `validateReaderDownloadPlacements`; browser checks also verify visible desktop controls and the opened mobile Contents menu. Preserve existing routes, saved filenames, Markdown/PDF bytes, frozen source packages, and retained historical releases. A layout change does not authorize publication.
