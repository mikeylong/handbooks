# Build Claude Design Field Guide

The handbook uses the shared publishing toolkit for PDF layout, hosted reader conversion, themes, diagrams, artwork normalization and download identity. The book owns its Markdown, semantic diagram definitions, configuration and frozen artwork.

The manuscript reflects official documentation accessed October 2, 2026. It includes the bounded local worked-example results and keeps Claude Design generation, sync, export and native Figma reuse unverified.

## Reproduce a PDF pair

Use Python with the versions in the toolkit's `requirements.txt`, Node.js, Poppler and ImageMagick. The shared toolkit includes all fonts. A PDFKit proof requires macOS and Swift.

Set `HANDBOOK_PUBLISHING_TOOLKIT` to the extracted `publish-evidence-backed-handbook` directory. Run the shared preflight, then build each appearance into a new output directory outside the book's `output/pdf`, `reader` and `assets` directories. Existing PDF paths cannot be overwritten.

```sh
python "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/preflight.py"
node "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/build-pdf-variants.mjs" \
  --book ./claude-design --config ./claude-design/pdf-config.json --theme light \
  --output ./rebuild/daytime.pdf --python python
node "$HANDBOOK_PUBLISHING_TOOLKIT/scripts/build-pdf-variants.mjs" \
  --book ./claude-design --config ./claude-design/pdf-config.json --theme dark \
  --output ./rebuild/late-night.pdf --python python
```

The dark build verifies the artwork pair hashes, proportionally places selected originals in the same frames as the light artwork, then freezes opaque RGB derivatives on the shared charcoal background. The normalizer preserves the selected illustrations.

## Reproduce the reader

```sh
python ./claude-design/source/build_reader.py --output ./reader-rebuild
```

The collection build then installs the paired artwork, responsive semantic diagrams, explicit PDF controls, shared System/Light/Dark appearance controls and exact download headers. The catalog and approval registry pin the approved reader and PDF hashes. Run `npm run build` from the collection root to assemble those frozen inputs. Rebuilds belong in isolated output; they do not replace the approved files.

## Evidence and limits

See `release-manifest.json`, `artwork-pairs.json`, `assets/chapter-art/dark/generation-records.json`, `diagram-bindings.json`, and the packaged review evidence. The candidate-specific maps mark all eleven required chapter images. Version 1.1.0 includes a final-page changelog, navigation entry, and bookmark.

The PDFs have searchable text, embedded fonts, outlines, internal links and matching printed/logical page labels. The PDFs are untagged; PDF/UA and screen-reader usability are not claimed. The HTML reader supplies semantic lists, table headers, navigation and diagram relationships.

The retained August builder and PDF are historical artifacts. These instructions reproduce the current edition in an isolated directory. Version 1.0.0 remains archived with its original bytes and printed candidate label.
