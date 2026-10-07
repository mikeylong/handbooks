# Build Claude Design Field Guide

Version 2.1.0 uses Velori to explore, refine and review a connected design through Add to cart. The book owns its manuscript, configuration, semantic diagram definitions and frozen artwork. The shared publishing toolkit owns PDF layout, reader conversion, themes, artwork processing and download identity.

## Reproduce a PDF pair

Use the toolkit's pinned Python requirements, Node.js, Poppler and ImageMagick. The toolkit supplies the fonts. Apple PDFKit proof also requires macOS and Swift.

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

Both configurations use the preserved v2.0.0 Daytime PDF as the previous content edition. Compare the new pair for text, geometry, links and navigation parity. Validate fonts, structural rules and artwork, then inspect every page in Poppler and Apple PDFKit.

## Reproduce the reader

```sh
python3 ./claude-design/source/build_reader.py --output ./reader-rebuild
npm run build
```

The first command creates an isolated raw reader. The collection build assembles the approved reader into `site/output/site`, then installs paired artwork, semantic diagrams, prompt and terminal styling, appearance controls, PDF downloads and the machine-readable Markdown edition. Current downloads share `/claude-design/editions/v2.1.0/`; older routes retain their bytes.

The catalog, approval registry, publication package and variant manifest pin accepted inputs. A build does not approve replacement artifacts. Run `npm run validate` from the collection root to check the released package and assembled site.

## Evidence and limits

See `release-manifest.json`, `pdf-variants.json`, `publication-package.json` and `qa/v2.1.0/`. The PDFs are untagged; PDF/UA and screen-reader usability are not claimed. The native starter and static Figma Review retain their v2.0.0 identity and evidence. The cart extension is local code in the standalone offline answer. Human task review, Code implementation and real missing-resource recovery have separate completion checks. Reproduction outputs must use new paths.
