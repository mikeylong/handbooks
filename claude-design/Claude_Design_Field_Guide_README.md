# Build Claude Design Field Guide

Version 1.2.0 uses Velori to teach source authority, one screen extension, behavioral proof, Code handoff and native Figma reconciliation. The book owns its manuscript, configuration, semantic diagram definitions and frozen artwork. The shared publishing toolkit owns PDF layout, reader conversion, themes, artwork processing and download identity.

## Reproduce a PDF pair

Use Python 3.12 with the toolkit's pinned requirements, Node.js, Poppler and ImageMagick. This edition was built with ReportLab 4.4.9, pypdf 6.10.0 and Pillow 12.3.0. The toolkit supplies its fonts. Apple PDFKit proof also requires macOS and Swift.

Set `HANDBOOK_PUBLISHING_TOOLKIT` to the extracted toolkit directory. From the collection root, run the preflight and build into a new local output directory. Existing PDF paths cannot be overwritten.

```sh
python3 "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/preflight.py"
node "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/build-pdf-variants.mjs" \
  --book ./claude-design --config ./claude-design/pdf-config.json --theme light \
  --output ./rebuild/daytime.pdf --python python3
node "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/build-pdf-variants.mjs" \
  --book ./claude-design --config ./claude-design/pdf-config.late-night.json --theme dark \
  --output ./rebuild/late-night.pdf --python python3
```

The light configuration treats the preserved v1.1.0 Daytime PDF as the previous content edition. The separate Late night configuration treats the approved v1.2.0 Daytime PDF as its appearance baseline. These two comparisons have different purposes; retain their exact baseline hashes.

The dark build checks the artwork pair hashes and freezes the separately authored dark originals onto the shared charcoal background. It preserves the light artwork and approved PDF bytes. Before accepting a rebuild, compare text, labels, geometry, links and outlines; validate embedded fonts and structural rules; then inspect every page in Poppler and Apple PDFKit.

## Reproduce the reader

```sh
python3 ./claude-design/source/build_reader.py --output ./reader-rebuild
npm run build
```

The first command creates an isolated raw reader. The collection build assembles the approved frozen reader into `site/output/site`, then installs paired artwork, semantic diagrams, prompt and terminal styling, shared appearance controls, PDF downloads and the machine-readable Markdown edition. Current download routes share `/claude-design/editions/v1.2.0/`; older routes remain usable.

The catalog, approval registry, publication package and variant manifest pin the accepted inputs. A new build does not approve replacement artifacts. Run `npm run validate` from the collection root to check the released package and assembled site.

## Evidence and limits

See `release-manifest.json`, `pdf-variants.json`, `publication-package.json`, `diagram-bindings.json`, `artwork-pairs.json` and `qa/v1.2.0/`. Both approved PDFs have 56 pages, all eleven chapter illustrations, searchable text, embedded fonts, outlines, internal links and matching printed and logical page labels. The final changelog occupies page 56. The PDFs are untagged; PDF/UA and screen-reader usability are not claimed.

The Velori sample's README and provenance explain its source identity, tests and public-package exclusions. Native generation, Code capture, bounded React adaptation and Figma checks have separate evidence and limitations. Historical native records remain private. Earlier PDFs and the August builder are preserved; reproduction outputs must use new paths.
