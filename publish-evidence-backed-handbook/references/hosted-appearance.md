# Hosted handbook appearance

Apply this contract to every handbook published in the collection at handbooks.surfaces.systems. The site theme is shared across the gallery and readers. Keep theme changes in the editable site build and shared assets; preserve released PDF and illustration bytes.

## Shared behavior

1. Offer System, Light, and Dark under Appearance. Default to System. Persist an explicit choice between the gallery and readers, synchronize desktop and mobile controls, and follow system changes while System is selected. Keep the reader usable when storage or JavaScript is unavailable.
2. Load the shared theme initialization before styles to avoid a flash of the wrong theme. Reuse the collection's theme script and stylesheet; do not copy them into individual books or maintain separate per-book palettes.
3. In dark mode, show raster engravings and diagrams with their original shading on a muted light background. Disable inversion, image filters, chapter edge masks, and clipping. Preserve label contrast and detail; keep inline diagrams responsive to the theme. Review colored illustrations and transparent assets in context rather than assuming a monochrome sample proves their quality.
4. Keep PDFs and browser printing light and suitable for printing. Screen-only theme rules must not alter PDF sources, released assets, or print output.

## Integrating a new reader

The collection implementation lives in the collection repository under `site/`. `scripts/build-site.mjs` finishes with `finalizeSiteThemes` from `scripts/site-theme.mjs`, which discovers the generated HTML pages, injects the shared theme, and validates each page. Do not add a separate list of titles for theme coverage. A new title still needs its reading route, assets, gallery card, release metadata, and publication-front validation.

Use `main#main-content` for handbook content, `.sidebar-meta` for the desktop control, and `.mobile-actions` for the mobile control. Put raster content images inside `figure` elements. Use the governing reader's `chapter-figure` or `chapter-art` figure class for chapter engravings so the panel retains the shared width; diagrams can use the full content width. Avoid inline filters, masks, clipping, blending, and background overrides on images or their ancestors, including figures and picture wrappers. Other publishing implementations must provide equivalent behavior and validation.

Run `npm run validate:front-pages` from the collection repository after rebuilding. The theme checks must discover all output pages and exercise a future reader on an arbitrary route. Missing shared assets, misplaced or missing controls, images outside the shared figure structure, and local image overrides must fail the build. Structural checks establish coverage; rendered checks establish appearance.

## Before publication

1. Verify the new title on desktop and mobile in System, Light, and Dark. Check navigation between gallery and reader, persistence of the chosen appearance, and the desktop and mobile controls.
2. Inspect every chapter opener and raster diagram in light and dark modes. Confirm original shading, readable labels, loaded images, uncropped detail, and no horizontal overflow. Inspect transparent or colored assets as well as monochrome engravings.
3. Compare computed image and ancestor filters, masks, clipping, blending, background, and dimensions with the shared reader treatment. Reject a local stylesheet that overrides the shared appearance, even when the markup check passes.
4. Check browser printing from a dark reader and verify the exact PDF download checksum. Both must retain their light appearance. Record screenshots and results for the candidate and deployed output before claiming publication is complete.

A missing theme surface, unreadable diagram, negative-looking engraving, or dark print output fails the hosted publication gate. Repair the shared source when the defect affects multiple titles and rerun the affected checks.
