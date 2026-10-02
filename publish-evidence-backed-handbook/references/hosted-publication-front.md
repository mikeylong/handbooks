# Hosted handbook front page

For handbooks at handbooks.mikelong.ai, use Production AI Engineering as the publication front-page reference. Apply this contract to each approved title when building or publishing its online reader.

The cover must include:

- The handbook title and its subtitle.
- Michael Long's author credit and a link to surfaces.systems.
- The edition's publication date and version.
- An “Explore the handbook” action that reaches the contents.
- A PDF download action with the measured page count of that exact release artifact.
- A “Next version review” panel identifying the site and PDF, with the policy that both publish together after manual review.

The sidebar must include the same author/site credit and date/version, with the date linked to the handbook repository and the version linked to its release. Preserve Search and PDF actions, accessible dialog controls, and the return to the gallery. The left-rail return must use the shared `handbooks-return` class and the hosted page must load `/gallery.css`. Do not set font size or spacing locally on this link. A return link that merely points to the gallery does not establish visual parity.

A scheduled review panel uses the handbook's approved review date, timezone, and cadence. Render a working countdown and a readable scheduled time. When no review is approved, state “The next review has not been scheduled.” Omit the countdown. Never copy another handbook's schedule or claim an automation exists because a countdown was added.

Derive edition labels and PDF links from the release manifest, not a copied cover. Persist the front page in the editable generator so rebuilding retains it. Reuse the governing reader's classes and behavior so the new title matches its typography, publication metadata, actions, and responsive layout.

Before publication, validate every hosted title against this contract. Check the rendered cover and sidebar at desktop and mobile sizes, follow Explore, verify Search and Contents, and verify the downloaded PDF's digest and measured page count. A missing author credit, release link, action, page count, review policy, or truthful review state fails the publication gate.

The current gallery builder enforces this contract through `scripts/publication-front.mjs` in the Production AI Engineering repository. Other publishing implementations must provide an equivalent check; prose guidance alone does not establish that the delivered page includes these elements.

Treat the shared navigation style as a publication requirement. The build must reject a missing return class, missing shared stylesheet, inline return-link overrides, or a broken gallery destination for every published title. Test those failures against newly built output; do not validate stale generated files. During browser review, compare computed font size, padding, and line height with the Production AI left-rail link, then verify the mobile return remains available.

Every hosted reader must also pass [the shared appearance contract](hosted-appearance.md). Adding a gallery card or passing the front-page metadata checks does not establish light/dark image quality.
