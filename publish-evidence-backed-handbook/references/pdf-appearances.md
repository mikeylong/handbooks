# Daytime and Late night PDF versions

Every new handbook and content edition supplies two fixed PDF appearances: **Daytime version** (`light`) and **Late night version** (`dark`). Use these exact display names in downloads, accessible names, edition details and new PDF metadata. Saved filenames end in `-daytime-r1.pdf` or `-late-night-r1.pdf`. Browser printing always uses Light, including from a Dark reader.

## Inputs and ownership

Books own the manuscript/story functions, selected artwork and provenance, semantic diagram definitions, edition identity, fonts and governing geometry in `pdf-config.json`. Book adapters import or invoke this package. Reusable layout, styles, page templates, helpers, diagram drawing, artwork normalization, Chromium rendering, finalization, downloads and validation live here. Do not copy runtime scripts into books. `HANDBOOK_PUBLISHING_TOOLKIT` selects an extracted toolkit installation.

`assets/design-system/pdf-appearance.json` supplies PDF colors. Preserve Light metrics and book-specific page geometry. Dark uses opaque paper `#191918`, ink `#eeece6`, muted ink `#b5b2aa`, raised paper `#222221`, and an essential rule with at least 3:1 contrast. The canonical Light specimen stays frozen. Inspection must cover each theme's cover, contents, opener, body, diagram, dense table, code, worksheet, sources and terminal page.

The ReportLab runtime constructs styles before building the story and paints every page template before content. Each appearance runs in a separate process. The Chromium runtime selects `data-pdf-theme` only for explicit PDF generation, keeps background printing and tagging enabled, and the finalizer places an opaque full-page background behind content. Its background is a tagged artifact. Color assignment happens in source/layout; never invert a PDF or Light illustration.

`pdf_artwork.py` verifies the artwork-pair hashes and recorded dimensions/alpha ranges, composites separately authored Dark art onto the exact PDF paper color, then freezes RGB derivatives and a transform manifest. Transparent source art is permitted; a PDF image with `/Mask` or `/SMask` fails. Preserve source originals. Require at least 240 effective PPI at each actual placement and one image paint per required opener. Check framing, page/plate background match, edges, shadows and linework visually in both renderers.

## Explicit candidate generation

Invoke `scripts/build-pdf-variants.mjs` with `--book`, `--config`, `--theme`, `--output` and `--python`. Chromium also needs `--browser` and `--playwright-module`. Choose a new, isolated output path for each attempt. The runtime rejects existing outputs and protected book directories. ReportLab configuration names the source story and document class. Chromium configuration may name a canonical authoring command and frozen inputs, including the content edition's existing changelog. Rebuild that source only in an isolated copy.

Build an isolated Daytime comparison first. Compare it to the actual released PDF before introducing Dark. Initial migrations retain the released Daytime bytes and URLs; the comparison is evidence only. Use `validate_pdf_pair.py` for per-page text, media/crop boxes, labels, outlines, destinations, links, searchable text, fonts, image masks and measured PPI. Keep exact text diffs alongside semantic results. Preserve PDF version. A mismatch blocks the companion; content changes need an edition decision.

A listed but unused unembedded font resource must be distinguished from a font used to paint text. Record it in the structural report; every painted font must be embedded. Record the existing untagged baseline for ReportLab books without claiming PDF/UA compliance. Tagged books must retain their structure and usable reading order after finalization. HTML reading remains available.

## Additive appearance revisions

An added format preserves the content version, publication date, released manifests, frozen reader package and prior evidence. Record a separate appearance revision and approval date in `pdf-variants.json`. Daytime compatibility fields `pdf`, `sha256` and `pages` retain their old meaning. Initial Daytime links keep hosted URLs and set a named download filename. A new Late night artifact gets an immutable edition-directory URL. A later appearance replacement advances `r1` to `r2`, retaining every previous artifact and URL. Changed distributed content follows the content edition policy.

Sidecars include content identity/source hashes, variant name/theme, revision/date, safe local/public paths, saved filename, hash, size, measured pages, page-map hash, status, toolchain/font/diagram/artwork provenance and proof. Candidate discovery never grants approval. The collection approval registry pins the content package and exact sidecar hash. Public assembly accepts approved artifacts only. Explicit candidate assembly uses a separate review registry and isolated output, with all initial launch titles together. A failed title blocks the launch.

`pdf-downloads.mjs` resolves legacy single-PDF manifests as Daytime-only and supplies shared controls for gallery, cover, sidebar, mobile, end and edition details. Historical editions without a companion say: `The Late night version is not available for this edition.` Never redirect a missing historical companion to another content edition. The collection assembles the explicit retained-release inventory on every clean build and checks every hash. Frozen packages receive controls during assembly; their bytes stay unchanged.

## Review and future editions

Render every page of both distributed appearances with Poppler and Apple PDFKit. Inspect whole-document sheets and full-size openers, diagrams and dense page roles. Check contrast, reading order, clipping, numbering and background continuity. Freeze evidence against exact artifact hashes. Linux structural checks do not replace the required macOS rendering and visual review.

Use the portable PDF fixture runner for both rendering paths, next editions and a 25-chapter future title. Include repeated diagrams and unusually shaped art. Reject missing Dark input, stale hashes, image alpha in PDFs, white panels on Dark, duplicate/mixed-edition variants, wrong page counts, missing downloads, unsafe paths and output overwrites. Run the same checks from the extracted skill package. Synthetic fixture geometry tests runtime behavior; it never substitutes for separately authored production illustration.

Before release, check 390 px and 1440 px in System, Light and Dark, plus blocked storage and JavaScript-disabled fallback. Exercise keyboard focus, Explore, Search, Contents, persistence and gallery return. Download each action and verify HTTP status, MIME type, saved filename, hash, pages and edition identity. Check edition paths with and without a trailing slash. Publish only the exact frozen approved files after separate authorization; never rebuild during promotion.

## A first title or next edition

Start with [the PDF configuration template](../assets/design-system/templates/pdf-config.json). `source` is relative to the book root. `story` names the story function; `docClass` defaults to `GuideDocTemplate`. `fonts: "toolkit"` uses the packaged fonts. `pageSizePoints` records the governing media box; `chapterCount` must match every required opener. A first edition leaves `releasedPdf` and `releasedSha256` null. A next edition sets them to the actual previously approved PDF and records its content comparison before approval. An initial appearance companion must match its retained content exactly; a failed retained baseline blocks that companion until a separately authorized repair edition exists.

Each artwork-pair entry supplies `chapter`, safe relative `light` and `dark` paths, `lightSha256`, `darkSha256`, `darkDimensions`, and `transparencyReview.alphaRange`. Follow [the artwork-pair contract](illustration-workflow.md) for authorship and composition evidence. The normalizer fits the authored foreground proportionally into the released Light frame, composites on the exact paper color, and records the frame hash, scale and padding. Originals stay frozen. The generation command creates this derivative manifest beside its isolated PDF automatically.

Run from the toolkit directory. Replace the variables with local book, candidate, pinned Python, browser and Playwright paths. The portable package requires Node 22, its pinned `requirements.txt`, Poppler, and Playwright 1.62.1 for Chromium.

```sh
node scripts/build-pdf-variants.mjs --book "$book" --config "$book/pdf-config.json" --theme light --output "$candidate/daytime.pdf" --python "$python"
node scripts/build-pdf-variants.mjs --book "$book" --config "$book/pdf-config.json" --theme dark --output "$candidate/late-night.pdf" --python "$python"
```

For Chromium, add `--browser "$browser" --playwright-module "$playwright_module"` to both commands. Configuration supplies the canonical authoring command and its relative inputs when rebuilding HTML is necessary. The shared fixed-flow SVG renderer owns geometry templates; book adapters supply exact semantic source requirements, labels and relationships. The generic specimen builder uses the same Chromium adapter and accepts `--theme` plus `--playwright-module`; choose an isolated output and never replace the canonical Light specimen.

```sh
"$python" scripts/validate_pdf_pair.py --retained "$retained" --candidate "$dark" --output "$evidence/parity"
"$python" scripts/audit-pdf-appearance.py --retained "$retained" --candidate "$dark" --chapters "$chapter_count" --output "$evidence/appearance.json"
pdftoppm -png -r 144 "$dark" "$evidence/poppler/page"
swift scripts/render-pdfkit.swift --pdf "$dark" --output-dir "$evidence/pdfkit" --dpi 144
```

Create renderer output directories before rendering. Repeat rendering for retained Daytime. Review all pages in both engines, including full-size opener, diagram, code, table and worksheet proof. `audit-pdf-appearance.py` compares every image paint frame, effective PPI, tagged structure order and marked-content order, and records token contrast. Its structural accessibility check does not certify PDF/UA or replace assistive-technology usability testing.

```sh
"$python" scripts/build-pdf-fixtures.py --output "$new_fixture_directory" --browser "$browser" --playwright-module "$playwright_module"
"$python" scripts/test-pdf-runtime.py --fixtures "$new_fixture_directory" --output "$fixture_evidence"
node scripts/test-pdf-downloads.mjs
"$python" scripts/validate-package.py --output "$package_report"
```

Package with `scripts/package-skill.py --output <archive.zip>`, extract outside the source package, validate the extracted directory, and repeat fixture generation and tests there. Linux CI retains structural proof; the dependent macOS job renders every fixture PDF with Apple PDFKit. Exact production PDFs still need their complete macOS visual review and approval before their manifest can enter public assembly.

## Collection approval handoff

The collection owns `site/approval-registry.json` and `site/retained-releases.json`; the publishing package supplies the resolver. Each approved registry entry pins the unchanged content package SHA-256 and the exact `pdf-variants.json` SHA-256. Fill sidecar measurements from the exact files and generated page maps. Preserve `pdf`, `sha256`, and `pages` as the retained Daytime compatibility identity. Every Dark record includes passed parity proof and an exact-hash visual approval with `status: "approved"`; record its approval date separately from the edition date. Approving one file does not approve a different hash.

Review assembly uses `HANDBOOK_PDF_REVIEW_REGISTRY` with a candidate registry and requires `HANDBOOK_SITE_OUTPUT` to point to isolated output. Candidate links cannot enter the ordinary public build. Initial migration review includes Production AI Engineering, AI Evaluation and AI Consulting together. After exact-artifact approval and separate release authorization, pin the sidecars in the public registry and promote the frozen PDFs. Keep every retained route hash unchanged. Do not rebuild PDFs during promotion.

Static site assembly validates pinned artifact bytes, measured page-map identity and passed parity evidence without invoking native PDF executables. Release validation and portable fixture tests measure the PDF page count directly with Poppler. This keeps hosted builds portable without treating unmeasured metadata as approved evidence.
