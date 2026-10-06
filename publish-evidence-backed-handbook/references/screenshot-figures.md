# Screenshot figures

Use screenshot figures when a reader needs to find a control, recognize a result, or compare two states. Books own the selected assets and captions. The shared runtime renders the same definition into the PDF, hosted reader and Markdown edition.

Keep source captures and preparation records with the book. Prepare publication assets before building. The runtime preserves image bytes and colors. Optional source-pixel framing clips the original at layout time; it does not redact, recolor, resample or rewrite the bitmap.

Place each figure once using a stable source marker:

```markdown
<!-- FIGURE s01-start -->
```

The default book-owned manifest is `screenshot-figures.json`. Set `screenshotManifest` in `pdf-config.json` to use another book-relative path.

```json
{
  "schemaVersion": 1,
  "figures": [
    {
      "id": "s01-start",
      "title": "Figure 1",
      "caption": "Public sample. The selected values agree in Configure and Review.",
      "panels": [
        {
          "label": "Configure",
          "asset": "assets/screenshots/configure.png",
          "sha256": "<SHA-256 of the prepared image>",
          "alt": "Configure shows Graphite, Simple, Amber and Carry bag.",
          "maxHeightPoints": 240,
          "minPpi": 240,
          "fullAsset": "assets/screenshots/configure-full.png",
          "fullSha256": "<SHA-256 of the larger prepared image>"
        }
      ]
    }
  ]
}
```

Every figure requires `id`, `caption` and a nonempty `panels` array. Every panel requires `asset`, `sha256` and useful `alt` text. Figure `title` defaults to `Figure 1`, `Figure 2` and so on in manifest order. Panel `label` is optional. `maxHeightPoints` defaults to 240 and accepts 72 through 420. `fullAsset` and `fullSha256` are optional together; without them, the larger-image link opens the prepared panel asset.

Use opaque RGB PNG or JPEG files with extensions that match their bytes. Paths must stay inside the book, including after resolving symlinks. Every asset must match its recorded SHA-256. Basenames must be unique unless the assets have identical bytes. Unknown figure IDs, malformed markers, duplicate placements, unplaced definitions, missing assets, stale hashes, transparency and unsafe paths fail the build. A marker inside a code fence is an example, not a placement.

PDF panels stack vertically and keep their labels. A figure can split between panels; the caption stays with the final panel and the next page repeats the figure title with “continued.” `minPpi` defaults to 240 and accepts 120 through 600. The runtime reduces placement dimensions to meet that panel's minimum without adding pixels. Review each panel at actual A5 size; a passing resolution check does not establish readable UI text.

The authorized Claude Design screenshot treatment permits a documented exception for native UI captures. A 14px label from a 1x bitmap prints at 4.2pt at 240PPI, but 8.4pt at 120PPI. A retina Figma label captured at 26px can use 220PPI. These are screenshot-only exceptions; chapter artwork and every unbound raster paint retain the governing minimum of 240PPI. Values below 240 require `printReadability` with nonempty `captureDensity` and `reason` strings. Record the source dimensions/density, measured label size, and why the chosen placement is readable. Optional positive `labelPixelHeight` records the measurement.

```json
{
  "minPpi": 120,
  "printReadability": {
    "captureDensity": "Original 1x UI capture with 14px labels.",
    "labelPixelHeight": 14,
    "reason": "At 120PPI the native 14px labels print at 8.4pt without resampling."
  }
}
```

For private framing review, optional `crop: [x, y, width, height]` names an integer source-pixel rectangle measured from the bitmap's top-left corner. All coordinates must stay within the original; width and height must be positive. The PDF clips the original and the reader uses a matching CSS viewport. The larger link opens a generated HTML view with the same crop. Cropped panels cannot name a separate `fullAsset`. Print sizing uses the cropped dimensions and the recorded minimum PPI.

Framing is not redaction. The complete original remains extractable from the clipped PDF and hosted package. Mark any source containing private text with `sourcePrivacy: "internal"`. Cropped sources default to `"unreviewed"`; both values produce internal-only distribution metadata and reader attributes. `sourcePrivacy: "public"` is appropriate only when the entire original is safe to distribute. Internal source panels cannot enter a published Markdown edition. Before publication, prepare and verify assets containing only the accepted visible region, then use those assets without a layout crop. Keep their original captures and exact-region preparation receipts private.

The hosted reader uses semantic `figure`, `figcaption` and image alt text. Panels stack at all widths and keep their captured appearance in Light and Dark. Image anchors cap at the panel's native pixel width, center within the text column, and shrink to the available width on narrow screens. Small UI details therefore retain their native size on a wide screen. Each panel has a keyboard-accessible larger-image link. The converter copies frozen assets into both `reader/assets/screenshots/` and `reader/editions/v<version>/assets/screenshots/`. Reader and Markdown image URLs use the immutable edition route, such as `/book/editions/v1.3.0/assets/screenshots/configure.png`.

The hosted Markdown exporter preserves screenshot image URLs, labels, alt text and captions. Layout-cropped panels export a description, the source-pixel rectangle and a matching larger-view link, rather than embedding the uncropped bitmap. Chapter artwork remains a description and diagrams use their existing contracts. For an authored manuscript export, supply the manifest and content identity:

```sh
python3 scripts/export-machine-markdown.py --source "$book/manuscript.md" --output "$candidate/handbook.md" --figures "$book/screenshot-figures.json" --book-root "$book" --book-id "$slug" --version "$version"
```

Use the existing `--diagram ID=JSON_PATH` options for any diagram markers in the source. Markdown URLs identify the candidate's intended edition route; publication requires the separate release process.

Run the focused regression and paired PDF placement audit:

```sh
python3 scripts/test-screenshot-figures.py --output "$new_fixture_directory"
node scripts/test-markdown-downloads.mjs
python3 scripts/audit-pdf-appearance.py --retained "$daytime" --candidate "$late_night" --chapters "$chapter_count" --screenshot-manifest "$book/screenshot-figures.json" --output "$evidence/appearance.json"
python3 scripts/validate_pdf_pair.py --retained "$daytime" --candidate "$late_night" --screenshot-manifest "$book/screenshot-figures.json" --output "$evidence/parity"
```

Also pass `--screenshot-manifest` to `validate-pdf.py` alongside the normal candidate page map and changelog decision. When the manifest lives in a nested directory, supply `--book-root` to all three validators so assets still resolve relative to the book. All three bind decoded image pixels and exact paint counts before accepting a screenshot PPI exception. Chapter opener checks remain independent.

The focused test can additionally compare the exact source region with headless Chromium captures of the reader, larger view and print viewport, and check a 147px panel at wide and narrow viewports. Supply `--browser <executable>` and `--playwright-module <module-directory>` to `test-screenshot-figures.py`. The synthetic fixture never substitutes for actual candidate review. Candidate page-map, cross-renderer, responsive and visual checks still apply.
