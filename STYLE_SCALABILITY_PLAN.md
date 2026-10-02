# Plan: reusable handbook appearance, artwork, and diagrams

Make the shared reader work for new editions and future handbook titles without per-book theme fixes. Completion means unfamiliar illustration classes fit on desktop and mobile, diagrams remain readable in both themes, and the publication checks catch missing or stale assets before release.

This plan addresses the findings in `deployments/edition-style-verification/VERIFICATION.md`. Implementation and publication are separate steps. The current artwork rollout remains local.

## 0. Consolidate reusable implementation into the publishing skill

Implement this plan through `publish-evidence-backed-handbook/`, following its [shared reader workflow](publish-evidence-backed-handbook/references/shared-reader-workflow.md). The skill owns reusable executable modules, browser assets, and regression fixtures. Each handbook owns content, artwork, provenance, semantic diagram definitions, and a thin adapter. The collection site owns catalog approval, route assembly, gallery composition, and deployment.

Inventory duplicated reader conversion, chrome, CSS, diagram rasterization, and validation in the active builders, including Evaluation and Consulting. Extract common behavior into the skill while preserving intentional book differences. Move reusable theme and artwork modules and browser assets from the site into the skill, and update site callers to invoke them. Keep existing commands usable through delegating wrappers when needed. Do not introduce additional maintained copies in book folders or make one book depend on another book's generator.

Bind the new runtime, assets, references, and fixtures into the skill distribution manifest. Verify an extracted package works without this collection's sibling books. Remove obsolete active implementations only after candidate parity checks pass; preserve historical files and released packages.

Acceptance: all active hosted-reader paths invoke one skill-owned implementation for shared behavior. No book maintains a copied renderer, theme, artwork installer, diagram renderer, or validator. Existing output remains equivalent apart from the appearance and diagram changes authorized by this plan.

## 1. Fix shared artwork sizing

Apply the tested correction to `publish-evidence-backed-handbook/assets/reader/theme.css`: remove default margins from paired artwork figures and give their images responsive width, a maximum width of 100%, and automatic height. Keep these rules limited to screen rendering. Preserve transparent dark margins and the original light/print assets.

Promote the arbitrary-class fixture into a permanent regression test. Include an existing title with a new edition, a future title with 25 chapters, wide and tall artwork, and oversized source images. Test the shared stylesheet itself rather than injecting a corrective stylesheet into the fixture.

Acceptance: no page-wide overflow at 390 px and 1440 px, correct aspect ratios or undistorted containment, correct Light/Dark source selection, and no plate around dark artwork. Recheck the 36 existing openers and light printing. The previous proof established that the proposed correction works; the shared stylesheet update makes the correction part of the implementation.

## 2. Replace print-rasterized web diagrams with shared responsive rendering

Inventory the four raster diagram types across five placements: Evaluation's Evidence Loop and Data Split, and Consulting's Lifecycle and Exposure Ladder. The ladder appears twice. Record their exact labels, ordering, branches, feedback relationships, and explanatory notes before changing their rendering.

Create semantic diagram definitions owned by each handbook and shared rendering components owned by the publishing skill. Use one definition per diagram, including repeated placements. Keep labels and relationships available to both the PDF flowable and web renderer so future editions cannot update one while leaving the other stale. Preserve the PDF drawing geometry, typography, colors, and released PDF bytes during this extraction.

Implement responsive HTML or inline SVG for the web. Simple sequences and distributions should reflow on narrow screens; complex graphs may scroll within their own labelled container. Use shared ink, muted text, paper, and line tokens. Give each diagram a concise accessible description and a readable text equivalent. Keep diagram styling distinct from illustration styling.

Invoke the skill-owned modules through the editable collection build, following the artwork overlay pattern. Bind each legacy placement to its approved source asset and semantic definition with hashes. Generate the hosted diagram from those inputs without rewriting the frozen approved reader package. Retain the original raster diagram as the browser-print fallback.

Acceptance: every existing label and relationship is preserved; primary labels render at least 16 CSS px on mobile and 14 CSS px on desktop; notes remain readable without shrinking the entire diagram. No page-wide overflow, clipped labels, ambiguous connectors, or unintended light panels in Dark. Any required panning stays inside the diagram. Both ladder placements render consistently.

If extracting shared definitions changes PDF generator code, build isolated PDF candidates and compare text and representative diagram geometry in Poppler and Apple PDFKit. Do not regenerate or replace released PDFs as part of the web migration.

## 3. Make the rules part of future-edition and new-title checks

Enforce the skill's shared reader, diagram, and paired-artwork contracts through its reusable modules and tests. Provide a small reference fixture showing the required reader structure, a chapter-art pair, a sequence, a branching diagram, and a feedback loop.

Extend permanent tests to cover prose-only reuse, changed artwork, added and removed chapters, changed diagram definitions, stale diagram mappings, unfamiliar figure classes, and an arbitrary future route with more than twelve chapters. Assert semantic parity for nodes, labels, and edges rather than only checking that an SVG exists.

Require hosted candidates to use the collection build. Keep individual PDF builds light. Preserve the existing catalog and edition approval gates; adding a title or edition to the fixture must not approve publication. Check that all hosted routes receive the shared theme and that no production path skips artwork or diagram integration.

Acceptance: valid new editions and future-reader fixtures pass. Missing pairs, stale hashes, unmapped technical diagrams, and changed diagram content fail with actionable errors. Rendered checks catch image overflow and unreadable labels that markup checks cannot detect. Artwork quality and scene accuracy remain explicit visual-review gates.

## 4. Validate the collection and prepare one scoped release

Run the collection build and test suite, then inspect all three readers in System, Light, and Dark at desktop and mobile widths. Exercise theme persistence, blocked storage, JavaScript-disabled fallback, diagram scrolling or reflow, and printing from Dark. Inspect all changed diagram placements and every opener affected by the sizing rule.

Verify the exact PDF download checksums and preservation of the approved reader packages. Save before/after screenshots, diagram parity results, and the future-edition fixture results. Review the final diff for skill-owned implementation and fixtures, handbook adapters and semantic definitions, site integration, and publishing guidance.

Completion: the two findings are closed with permanent regression coverage, the existing readers remain correct, and a future title inherits the same behavior through the supported collection build. Release preparation ends with a reviewable local change. Commit, PR, merge, deployment, and live verification follow Mike's direct `Land this` command.
