# Handbooks site

Build the gallery and check every reader:

```sh
npm run validate:front-pages
```

Requires Node.js 22, npm, tar and network access to the public book repositories on GitHub. No npm packages or GitHub credentials are needed. The build writes `output/site/` and downloads source snapshots into ignored `.cache/books/`. It copies approved PDFs; it never regenerates them.

The collection repository owns the gallery, approved hosted readers, and hosting at https://handbooks.surfaces.systems. `catalog.json` selects approved local book packages; the build verifies their exact PDF and reader hashes before assembling the public site. Books retain manuscripts, artwork, evidence, edition metadata, and semantic diagram definitions.

Reusable reader rendering, browser assets, light/dark artwork processing, responsive diagrams, and validation live in `../publish-evidence-backed-handbook/`. Book and site adapters invoke that runtime; do not copy its scripts or styles into a new handbook. Follow the toolkit's [shared reader workflow](../publish-evidence-backed-handbook/references/shared-reader-workflow.md) for new editions and titles. Publication approval remains explicit.

Run `npm run validate` from the collection root to validate the released books and site, or `npm run validate:front-pages` from this directory for hosted checks. To preview, run `npm run preview` and open http://127.0.0.1:4181/. Reuse the existing preview when the port is already serving this collection.
