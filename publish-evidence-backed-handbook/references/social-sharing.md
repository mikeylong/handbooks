# Favicon and social sharing assets

Current collection pages, handbook readers and edition pages need a legible favicon and a static sharing image. Install their metadata through `scripts/sharing-metadata.mjs` in the shared site build. Use absolute public HTTPS image URLs, descriptive image alt text, measured image dimensions and matching Open Graph/Twitter titles and descriptions. Metadata must be present in the HTML without JavaScript. Follow the [Open Graph protocol](https://ogp.me/) and [HTML icon relationship](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#icon).

For the Surfaces handbooks collection, the favicon uses two solid white book pages on a charcoal tile. Its geometry lives in `assets/brand/book-mark.json`; the generator derives the SVG and raster exports from the same coordinates. The 16 px counter and silhouette take priority over illustration detail. Keep the existing engraving favicon in historical packages. Test the new icon at actual 16, 24, 32, 48 and 96 px sizes on light and dark backgrounds; provide SVG, multi-size ICO, 16/32 px PNG fallbacks and a 180 px touch icon.

Sharing cards use the collection's existing serif/sans fonts, black-on-white cover typography and each handbook's approved chapter engraving. Produce a 1200 × 630 PNG for the collection and each current title. Take the title and subtitle from the current reader cover, and retain the existing artwork's source hash. Review the full-size card and a 300 px wide preview. A social card is a new composition; it does not change the chapter illustration, manuscript or PDF.

Generate an asset package explicitly from an assembled site:

```sh
python publish-evidence-backed-handbook/scripts/build-sharing-assets.py \
  --site-output site/output/site \
  --brand site/sharing-brand.json \
  --catalog catalog.json \
  --output site/site/assets/sharing
npm run build
```

The generator uses the skill's pinned Pillow dependency and bundled fonts. Its manifest records the copy, artwork, geometry, font and output hashes. The site build validates the asset package before installation and rejects missing cards, stale cover copy, changed artwork or mismatched bytes. When a new title or changed cover makes the build stop at the sharing step, regenerate from the reader output already assembled by that build, then rebuild. Do not substitute an unrelated title's card.

Apply new head metadata to current pages during assembly. Install retained historical releases afterward without changing their bytes. Keep existing historical asset URLs. Recheck generated HTML and actual image/icon responses in the managed browser workflow before publication. A local asset review does not authorize deployment.
