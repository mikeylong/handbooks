# Hosted handbook front page

For this collection at handbooks.surfaces.systems, use Production AI Engineering as the publication front-page reference. Apply this contract to each approved title when building or publishing its online reader.

The cover must include:

- The handbook title and its subtitle.
- Michael Long's author credit and a link to surfaces.systems.
- The edition's publication date and version.
- An “Explore the handbook” action that reaches the contents.
- A PDF download action with the measured page count of that exact release artifact.

Show the author/site credit and linked date/version beneath the title on the cover. Omit their duplicate sidebar block in all current and future readers. Retained historical readers hide that block through shared styling while preserving approved HTML bytes. Keep the sidebar theme selector and Search on one row, with download choices below. Preserve sidebar Search and PDF actions, accessible dialog controls, and the return to the gallery. The left-rail return must use the shared `handbooks-return` class and the hosted page must load `/gallery.css`. Do not set font size or spacing locally on this link. A return link that merely points to the gallery does not establish visual parity.

Keep weekly review schedules, countdowns, unscheduled-review notices, and publishing policy out of reader covers, sidebars, gallery cards, and edition pages. The weekly handbook collection review remains an internal, candidate-only workflow. Removing reader chrome does not disable or reschedule that review, approve publication, or change its manual release requirement.

Omit review markup in editable generators. During site assembly, remove legacy review panels from current frozen reader inputs without rewriting those approved packages. Preserve retained historical HTML bytes; the shared reader stylesheet hides any legacy review panel in those archived readers.

Keep printing guidance in the Daytime download row’s “For printing” label. Omit the standalone “Use the Daytime version for printing.” note from covers and all other public pages. Shared download assembly removes legacy notes, and build validation rejects them in new pages. Retained historical HTML keeps its approved bytes; shared download styles hide the old note.

Derive edition labels and PDF links from the release manifest, not a copied cover. Persist the front page in the editable generator so rebuilding retains it. Reuse the governing reader's classes and behavior so the new title matches its typography, publication metadata, actions, and responsive layout.

Before publication, validate every hosted title against this contract. Check the rendered cover and sidebar at desktop and mobile sizes, follow Explore, verify Search and Contents, and verify the downloaded PDF's digest and measured page count. Reject missing author credit, release links, actions, or page counts, and reject visible internal review panels.

The current gallery builder enforces this contract through `scripts/publication-front.mjs` in the collection repository under `site/`. Other publishing implementations must provide an equivalent check; prose guidance alone does not establish that the delivered page includes these elements.

Treat the shared navigation style as a publication requirement. The build must reject a missing return class, missing shared stylesheet, inline return-link overrides, or a broken gallery destination for every published title. Test those failures against newly built output; do not validate stale generated files. During browser review, compare computed font size, padding, and line height with the Production AI left-rail link, then verify the mobile return remains available.

Every hosted reader must also pass [the shared appearance contract](hosted-appearance.md). Adding a gallery card or passing the front-page metadata checks does not establish light/dark image quality.

## Paired PDF appearances

Apply [PDF appearances](pdf-appearances.md) to explicit Daytime version and Late night version downloads, shared generation, retained releases, additive appearance revisions, exact-hash approval, cross-renderer proof and future editions. An appearance companion preserves its content edition and existing Daytime bytes. Browser printing stays Light. A failed companion blocks the initial three-title launch.
