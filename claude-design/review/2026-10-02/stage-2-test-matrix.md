# Stage 2 test matrix

The local worked example passes its bounded tests. The Claude Design workflow remains unverified. The local test result does not resolve the vendor workflow checks. Review date: October 2, 2026 (America/Los_Angeles). The original draft PDF, package and art are preserved.

## Actual tool observations and unavailable checks

| Priority | Check | Evidence mode / result | Evidence and consequence |
|---|---|---|---|
| High | Claude Code prerequisites | Actual tool observation | Installed CLI 2.1.285; authenticated first-party Claude Team session; slash menu lists /design, /design-sync, /design-login. Account controls, selected system and artifact destination were not inspected. See stage-2-capability-checks.json. |
| High | Claude Design canvas / generation / interactivity | Inaccessible | Headless claude.ai/design returned HTTP 403 with a security challenge. Computer-use runtime failed on the symlinked workspace root. No challenge bypass, authenticated canvas, artboard generation, targeted comment or prototype execution was performed. Screenshot: stage-2-evidence/claude-design-access/page-2026-10-03T03-24-29-659Z.png. Integrated Design was not independently observed. |
| High | React conversion/upload and destination | Documented only / unverified | /design-login and /design-sync were listed in the actual CLI. They were not executed: no selected system/destination or owner-confirmed controls were available, and their output could not be inspected through the blocked Design surface. No system was published or made an organization default. |
| High | Three imported-system tests and correction persistence | Unverified | Settings, dense table and confirmation-flow generation must still be tested in the actual Design system. Local forms/tables/dialogs exercise actual SDS code, but cannot pass the imported-system tests or their ten-element samples. |
| High | Actual Design export and recipient access | Inaccessible / unverified | No export was received. No file, chat history, README completeness, baseline restore, alternate version, export URL, or intended-recipient access was verified. The local handoff was manually assembled. |
| Medium | Actual Claude Code handoff inspection | Actual tool observation, pass within stated scope | Claude Code read the local files with Read-only tools. It traced the row outcomes and found three High defects; all were repaired. Frozen-input targeted recheck returns all three resolved. See stage-2-evidence/claude-code-handoff-inspection.json, claude-code-targeted-recheck-final.json, and code-review-input/input-hashes.json. This is not a Design-to-Code export test. |
| Medium | Figma access and native branch | Actual account observation; file workflow unverified | One connected account returned Full seat on Pro. A second connection requested authentication/retry. No working duplicate or file/node revision was supplied. No source Community file was edited or used as native-identity proof. No native write, capture, component-instance/variable-binding check or Code Connect mapping occurred. Pro/Full does not establish Organization/Enterprise Code Connect eligibility. |
| Medium | Governance, storage and sharing | Local storage observed; organization controls unverified | All deliverables are under the canonical local book; temporary access checks used /private/tmp. Retention, residency, audit, special tenant configurations and external sharing settings were not owner-verified. No settings changed. |

## Local executable model and browser tests

The app is at `stage-2-candidate/data-pipeline-studio/`, with the pinned SDS snapshot beside it. Eight Node model tests pass, and Vite builds the final source. The model tests assert exact normalization, validation, CSV/JSON parity, malformed parsing, cycle/type/duplicate rejection without mutation, both recovery policies, mapping confirmation, downstream connection checks, duplicate-ID rules, BOM handling, and error copy naming the attempted warehouse target.

The twenty browser checks below pass in headless Chromium. Their JSON results are in `stage-2-evidence/browser-results.json`; scripts and full action logs are stored alongside it.

| ID | Tested behavior | Result | Evidence |
|---|---|---|---|
| LOCAL-01 | Same shell text and route in synthetic linear baseline and extension | Pass | browser-journey-final5.log; baseline-1440.png, extension-1440.png |
| LOCAL-02 | Required mapping and recovery choice block import; exact malformed-row error; atomic six-row import | Pass | browser-journey-final5.log; mapping-required.png |
| LOCAL-03 | Source connection, keyboard selection, inspector/preview continuity, normalized email | Pass | browser-journey-final5.log; normalized-preview.png |
| LOCAL-04 | Quarantine branch; cycle and incompatible port reject without edge mutation | Pass | browser-journey-final5.log; rejected-connection.png |
| LOCAL-05 | Keyboard movement changes rendered geometry; undo/redo restore layout and structure | Pass | browser-journey-final5.log |
| LOCAL-06 | Save and reload preserve exact document state | Pass | browser-journey-final5.log |
| LOCAL-07 | Run locks edits while nodes remain inspectable; failure selects warehouse and survives reload | Pass | browser-journey-final5.log; run-failed.png |
| LOCAL-08 | Invalid draft is preserved; Save blocks; stale preview refresh; warehouse repair yields 3 published / 3 quarantined | Pass | browser-journey-final5.log; successful-rerun.png |
| LOCAL-09 | View-only and expired-session edits block; inspection and recovery preserve rows | Pass | browser-journey-final5.log |
| LOCAL-10 | Save failure preserves draft and disables Run; version conflict requires explicit reapply | Pass | browser-journey-final5.log; version-conflict.png |
| LOCAL-11 | Preview error/refresh, pagination and search show the same fixture rows | Pass | browser-journey-final5.log |
| LOCAL-12 | 1440×900, 1024×768 and 390×844; no page horizontal overflow; Save/Run remain reachable at editing sizes; mobile edits disabled | Pass | browser-journey-final5.log; viewport-1440.png, viewport-1024.png, viewport-390.png |
| LOCAL-13 | Cancel during parsing prevents later graph mutation; modal focus trap and return focus | Pass | browser-keyboard-final3.log |
| LOCAL-14 | Malformed CSV stays uncommitted; Escape closes importer and returns focus | Pass | browser-keyboard-final3.log; import-failed.png |
| LOCAL-15 | Tab/Enter/arrow/C keyboard journey using JSON fixture: mapping, source, branch, Save, failure, repair, successful re-run | Pass | browser-keyboard-final3.log; keyboard-success.png |
| LOCAL-16 | Pointer movement, undo, zoom, pan, reset | Pass | browser-keyboard-final3.log |
| LOCAL-17 | Cancel Run prevents delayed completion; reduced-motion CSS applied | Pass | browser-keyboard-final3.log |
| LOCAL-18 | Scripted DataTransfer drop and Reject invalid rows path yield 3 published / 0 quarantined / 3 rejected | Pass | browser-extra.log; reject-policy.png |
| LOCAL-19 | Test node follows selected operation; range keys resize sheet; table sort | Pass | browser-extra.log; selected-test-and-sort.png |
| LOCAL-20 | Session expires during Save; storage retains previous saved target and local draft stays intact | Pass | browser-extra.log |

A final preview layout check also passes: the fixed provenance header does not overlap the scrollable search/table body at 1024 × 768, and arrow keys change the height range from 260 to 280. See `stage-2-evidence/preview-layout-final.log` and `preview-body-1024.png`. These two assertions supplement the twenty browser checks above.

The browser runner supplies the file to the native file input through automation; it does not claim a human operating-system file-picker test. Drop coverage uses a scripted DataTransfer event. Initial loading, parsing, importing, saving, running, preview loading/error, and asynchronous cancellation were exercised. The viewport screenshots were visually inspected; they are local example evidence.

## Documented-only coverage and remaining release gates

| Priority | Required coverage | Remaining evidence / owner |
|---|---|---|
| High | Actual Claude Design generation, system fidelity, correction persistence, comments, baseline export/restore, connected interactions and handoff | Workflow tester with accessible Design surface and confirmed destination. Keep these observations absent in the candidate, or run and document them before claiming vendor workflow verification. |
| High | Production API, authorization, Save/version conflicts, run execution, quarantine storage, idempotency and telemetry | Implementing product team. The local browser simulations cannot qualify a production application. |
| Medium | Pointer port dragging, drawn edges, zoom-aware world coordinates, node deletion, full inspector schemas/drafts, large-data virtualization, cell/column resizing, full status variants | Product/design/engineering owners. The teaching harness covers named connections, node movement, one warehouse failure, simple configuration fields and a small paginated table. Preserve these narrower limits. |
| Medium | Physical CSV provenance for blank/multiline records and broad importer schema handling | Implementing engineer. Local source-row labels are fixture record ordinals; the fixture has no blank/multiline records. JSON labels follow the matching logical row. |
| Medium | Complete state matrix beyond the tested paths | Product/design/engineering owners. Canvas load failure, forbidden server action, queued/partial server runs, complete node variants, cache provenance, truncated-cell interaction and all production telemetry remain requirements. A table listing those states is not an executed pass. |
| Medium | Screen-reader and assistive-technology behavior; cross-browser/device checks | Accessibility reviewer. Chromium focus/labels/live regions and keyboard actions were tested; no VoiceOver/NVDA or other browser result is claimed. |
| Medium | Native Figma duplication, layer/component/variable identity and Code Connect | Figma/design-system owner with the working duplicate and eligible destination. No file was created or mutated. |
| High | New PDF/package readiness | Stage 3 must repair generator edition/reference labels and old fixed-page validator assumptions in an isolated build, create the candidate-specific page map, inspect all pages with Poppler and Apple PDFKit, check links/package contents and exact hashes. Neither stage 1 nor stage 2 rebuilt the PDF. |

Stage 3 can produce a valid review candidate if it packages the exact sources/fixtures and leaves the local/external split visible. It cannot declare the Claude Design workflow, production application or handbook release verified from these results. Publication, push, merge and deployment remain unauthorized.
