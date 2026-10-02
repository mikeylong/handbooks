# Handbooks website

Run `npm run build` from the repository root. Node.js is the only build prerequisite. The output is `output/site/`: a gallery at `/`, Production AI Engineering at `/production-ai-engineering/`, and the published PDF at its versioned download path.

The gallery loads the handbook's own stylesheet and fonts. Both cover previews are generated from the published readers. Ordinary links open each static reader with the shared cross-document fade when supported, and respect reduced-motion preferences. Browser Back and the reader's All handbooks link restore focus to the previously viewed card. The handbook content, stylesheet, illustrations, and published PDF come from the existing release.

The Vercel project is `surfaces-handbooks` in `surfaces-platform`, configured for `handbooks.surfaces.systems`. The repository's `vercel.json` configures the build and static output. Preview deployments must pass desktop and mobile checks before production promotion: gallery to book, return navigation, search, contents, keyboard access, image/font loading, and the downloaded PDF checksum.

For a new edition, refresh `site/production-ai-engineering.json` with the published version, PDF path, SHA-256, and page count measured from that exact PDF. Run `npm run validate:front-pages` to build the gallery and readers and check their publication details. The gallery previews take their title, subtitle, author credit, and date/version directly from the validated reader covers. No separate screenshot is required. Historical cover images in `site/assets` are preserved but are no longer build inputs or deployed assets.

New handbooks belong in `site/index.html` as additional cover cards inside `.handbook-grid`, with their own reading routes and assets. Keep the gallery's shared handbook typography and color styles.
