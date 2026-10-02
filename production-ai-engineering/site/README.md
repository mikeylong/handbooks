# Handbooks website

Run `npm run build` from the repository root. Node.js is the only build prerequisite. The output is `output/site/`: a gallery at `/`, Production AI Engineering at `/production-ai-engineering/`, and the published PDF at its versioned download path.

The gallery loads the handbook's own stylesheet and fonts. Both cover previews are generated from the published readers. Ordinary links open each static reader with the shared cross-document fade when supported, and respect reduced-motion preferences. Browser Back and the reader's All handbooks link restore focus to the previously viewed card. The handbook content, stylesheet, illustrations, and published PDF come from the existing release.

The Vercel project is `surfaces-handbooks` in `surfaces-platform`, configured for `handbooks.surfaces.systems`. The repository's `vercel.json` configures the build and static output. Preview deployments must pass desktop and mobile checks before production promotion: gallery to book, return navigation, search, contents, keyboard access, image/font loading, and the downloaded PDF checksum.

For a new edition, refresh `site/production-ai-engineering.json` with the published version, PDF path, SHA-256, and page count measured from that exact PDF. Run `npm run validate:front-pages` to build the gallery and readers and check their publication details. The gallery previews take their title, subtitle, author credit, and date/version directly from the validated reader covers. No separate screenshot is required. Historical cover images in `site/assets` are preserved but are no longer build inputs or deployed assets.

New handbooks belong in `site/index.html` as additional cover cards inside `.handbook-grid`, with their own reading routes and assets. Keep the gallery's shared handbook typography and color styles.

Every hosted page uses the shared `site/theme.css` and `site/theme.js`. Appearance defaults to System; readers can choose Light or Dark in the gallery, desktop sidebar, or mobile header. The choice persists for the site and updates other open tabs. The final build step discovers every generated HTML page and injects and validates the shared controls. New reader routes join this step automatically; keep the reader structure described below. Dark styles apply only to screens; browser printing and the released PDFs remain light. Keep theme changes in these site files rather than the PDF styles or source.

In dark mode, raster engravings and diagrams retain their original shading on a muted light background. Keep image filters and chapter edge masks disabled in that mode. Check both readers, including labeled diagrams, on desktop and mobile when changing image treatment; also verify that light mode and printing retain their existing appearance.

For a new reader, use `main#main-content`, `.sidebar-meta`, and `.mobile-actions`. Place raster content images inside `figure` elements so the shared dark-mode background reaches them; do not add inline image filters, masks, blending, or background overrides. The build rejects missing theme assets, controls, image containers, and inline image overrides. `npm run validate:front-pages` also exercises a future reader on an arbitrary nested route. Adding a title still requires its gallery card, release metadata, publication-front validation, and assets.
