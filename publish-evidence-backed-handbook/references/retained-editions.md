# Retain approved editions

Keep each approved edition's downloads and edition page at their released URLs when a newer edition becomes current. The current reader and gallery may advance only after the new edition passes its release checks.

1. Before advancing an approved package, build its current reader through the shared runtime and final appearance transforms. Freeze the assembled edition HTML, Markdown edition and content index under `site/retained/<book>/<version>/`. Preserve a reader snapshot and a receipt identifying the source commit, approved package hash and frozen routes.
2. Register each public historical route in `site/retained-releases.json` with its collection-relative source and SHA-256. Include PDF and sample ZIP aliases already released. Preserve their original bytes. Retention does not approve a draft or expose a private source package.
3. Invoke the shared `installRetainedReleases` helper after current-reader generation and final appearance transforms. It checks the entire curated inventory before copying files. A changed source hash, duplicate route, unsafe path or generated route with different bytes fails the build.
4. Compare the assembled historical routes with their live Surfaces counterparts, following normal redirects. Record the returned bytes and hashes. Check their download links beside the new edition in desktop and narrow layouts.
5. Run `scripts/test-retained-releases.mjs`. Its future-edition fixture verifies that historical HTML, Markdown, index, PDF and ZIP bytes survive and that conflicting or unsafe entries fail.

Use only `handbooks.surfaces.systems` for publication and live checks. Add public routes deliberately; never discover retained files from a draft or review directory.
