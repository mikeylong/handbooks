# Handbooks website

Run `npm run build` from the repository root. Node.js is the only build prerequisite. The output is `output/site/`: a gallery at `/`, Production AI Engineering at `/production-ai-engineering/`, and the published PDF at its versioned download path.

The gallery loads the handbook's own stylesheet and fonts. Its cover image comes from the published PDF. The build includes the reader in both entry pages so opening the cover can animate directly into the reader without a document load. The reader initializes once; browser history switches between the two views. Direct links, reloads, and navigation without JavaScript still use the static routes. The handbook content, stylesheet, illustrations, and published PDF come from the existing release.

The Vercel project is `surfaces-handbooks` in `surfaces-platform`, configured for `handbooks.surfaces.systems`. The repository's `vercel.json` configures the build and static output. Preview deployments must pass desktop and mobile checks before production promotion: gallery to book, return navigation, search, contents, keyboard access, image/font loading, and the downloaded PDF checksum.

For a new edition, refresh `site/production-ai-engineering.json` with the published version, PDF path, SHA-256, and page count measured from that exact PDF. Extract page 1 with `pdftoppm -f 1 -singlefile -scale-to 1000 -png <published-pdf> site/assets/production-ai-engineering-cover`, and record the cover's new SHA-256. The build rejects a mismatched PDF or thumbnail.

New handbooks belong in `site/index.html` as additional cover cards inside `.handbook-grid`, with their own reading routes and assets. Keep the gallery's shared handbook typography and color styles.
