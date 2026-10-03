# Claude Design End-to-End Validation Checklist

Use this checklist at the design evidence gate, again at engineering handoff, and once more against the rendered implementation. Mark a branch-specific item not applicable only with a recorded reason; use unverified for a required check without evidence.

## 0. Availability and evidence mode

- [ ] Chosen surface is recorded: conversation, Artifacts, Claude Code, or standalone.
- [ ] Plan, organization, selected system, and Claude Code version/provider when used are recorded.
- [ ] Design, Design systems, and standalone settings are checked separately where applicable.
- [ ] If using `/design`, v2.1.265+, enabled Design, and an artifact-capable claude.ai session are confirmed.
- [ ] If using the React `/design-sync` path, authorization, conversion/upload destination, source revision, and completion evidence are recorded.
- [ ] Persistent storage, retention, residency, and restricted-organization requirements are checked with the owner.
- [ ] If using Figma, account/read access, native-writing seat/edit access, capture destination, Code Connect eligibility when needed, and quotas are checked separately.
- [ ] Each finding uses High, Medium, or Low and distinguishes documentation, observation, inference, and unverified behavior.
- [ ] No checklist item passes solely because the vendor documents the capability.

Official prerequisites: [Claude Code commands](https://code.claude.com/docs/en/commands), [Artifacts availability](https://code.claude.com/docs/en/artifacts), [Artifacts administration](https://support.claude.com/en/articles/16994751-artifacts-admin-guide-for-team-and-enterprise-plans), [Figma access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/).

## 1. Source and scope

- [ ] Current route and production behavior are named.
- [ ] The source-of-truth hierarchy is approved.
- [ ] The public Community file is untouched.
- [ ] A working Figma duplicate is used for connected inspection or editing.
- [ ] Repository and design revisions are recorded.
- [ ] The preservation boundary is visible.
- [ ] Non-goals are explicit.
- [ ] CSV, JSON, and authored expected-output hashes are recorded; the six customer IDs carry through the complete journey.
- [ ] Private data, secrets, dependency trees, and unrelated packages are excluded.

## 2. Design-system grounding

- [ ] Focused component code, tokens, stories, and mappings are linked.
- [ ] The imported system passed all three known-screen tests: settings form, dense table, and confirmation flow.
- [ ] Component identity and semantic-token use were sampled.
- [ ] A correction persisted through regeneration.
- [ ] Every visible pattern is classified as reuse, approved variant, composition, proposal, reference only, or unverified.
- [ ] Figma and code evidence are not conflated.
- [ ] Raw colors, arbitrary spacing, duplicate controls, and inline production styles are absent.
- [ ] Proposed components have owners, states, behavior, accessibility notes, and intended code paths.
- [ ] Code Connect mapping type and sampled imports/props/snippets match current code; absent fields are recorded.
- [ ] Historical SDS counts and node IDs are rechecked against the selected revision and working file.
- [ ] Required interactive behavior is observed on the selected surface, including when `/design` supplies artboards.

## 3. Existing-screen fidelity

- [ ] A reviewed baseline export opens and is preserved separately from later alternatives.
- [ ] Baseline and final references show a bounded diff.
- [ ] Shell, navigation, route identity, permissions, Save, Run, and persistence remain stable.
- [ ] Unrelated copy and product areas are unchanged.
- [ ] Rejected explorations are removed or clearly archived.
- [ ] The change log lists every intentional difference.

## 4. Behavior and data

- [ ] The complete success journey is interactive.
- [ ] The graph has pan, zoom, fit, reset, selection, and movement behavior.
- [ ] A valid connection is created.
- [ ] A cycle and incompatible connection are rejected without mutating the graph.
- [ ] Undo and redo cover node position and graph structure.
- [ ] Running-state locks are consistent.
- [ ] Node selection, inspector schema, and data-sheet provenance agree.
- [ ] The importer blocks unresolved required mappings.
- [ ] Inferred mappings are not silently committed.
- [ ] Malformed rows include row and column references.
- [ ] Import success creates the configured source node and opens its preview.
- [ ] Preview rows are the selected node's real fixture output.
- [ ] Save, reload, warehouse failure, repair to customer_health, and successful re-run are covered with exact 3/3/0 counts.
- [ ] Save failure keeps Run disabled; Run cannot persist an unsaved draft.
- [ ] Cancelled parsing/import leaves the graph unchanged, including delayed completion callbacks.
- [ ] Preview provenance remains visible when the sheet scrolls.
- [ ] Reject invalid rows produces 3 published, 0 quarantined, and 3 rejected.

## 5. State and recovery

- [ ] Document states include loading, pristine, dirty, saving, saved, failure, read-only, and conflict.
- [ ] Canvas and node states include empty, invalid, running, success, warning, failure, and disabled.
- [ ] Inspector states include no selection, loading, dirty, validation, testing, failure, and lock.
- [ ] Data sheet states include closed, loading, rows, empty, stale, truncated, and error.
- [ ] Importer states include drag-over, parsing, mapping, invalid rows, import, partial success, cancel, and failure.
- [ ] Permission, forbidden-action, and expired-session states recover safely.
- [ ] Version conflict preserves local work and supports review.
- [ ] Stale data stays inspectable and offers refresh.
- [ ] Errors say what happened, what was preserved, and what the user can do next.
- [ ] Consequential actions have trigger, precondition, feedback, success, failure, persistence, recovery, and telemetry contracts.

## 6. Accessibility and responsiveness

- [ ] The primary and minimum editing viewports are reviewed.
- [ ] Adjacent surfaces do not collide or hide required actions.
- [ ] Mobile editing is supported or explicitly out of scope.
- [ ] The critical journey has a non-pointer path.
- [ ] Focus is visible and restored after dialogs and state changes.
- [ ] Escape safely cancels transient interactions.
- [ ] Status uses icon, label, and semantic color.
- [ ] Fields have labels, descriptions, and linked errors.
- [ ] Dialog title, initial focus, focus trap, Escape, and return focus are specified.
- [ ] Sort, selection, resizing, and truncated-cell inspection have keyboard behavior.
- [ ] Progress and consequential state changes have announcement behavior.
- [ ] Reduced-motion behavior is assigned to implementation.
- [ ] Screen-reader and assistive-technology tests are listed as rendered evidence, not design claims.

## 7. Design evidence gate

- [ ] Scope evidence passes.
- [ ] Component and token traceability passes.
- [ ] Behavior and fixture traceability passes.
- [ ] State and recovery coverage passes.
- [ ] Responsive and accessibility specification passes.
- [ ] A challenge reviewer attempted invalid graph actions, minimum-viewport collisions, keyboard navigation, reload persistence, and data inconsistency.
- [ ] No unresolved High finding remains.
- [ ] Medium and Low follow-up has owners and consequences.
- [ ] The decision is recorded as pass, conditional pass, or hold.

## 8. Handoff package

- [ ] Baseline, final design, prototype, and change log are present.
- [ ] Component-to-code map uses real import paths and prop or variant mappings.
- [ ] Design-system delta is included.
- [ ] State matrix and transition contracts are included.
- [ ] Exact labels, helper text, errors, confirmations, and empty-state copy are included.
- [ ] Fixtures and expected transformations are included.
- [ ] Responsive references and accessibility contract are included.
- [ ] Acceptance tests are objective.
- [ ] Prototype-only code is labeled.
- [ ] Unresolved items have severity, owner, due date, and consequence.
- [ ] Export format/surface/time, file inventory, and intended-recipient access result are recorded.
- [ ] Files, chat, README, mappings, fixtures, and decisions actually received are inspected; absent inputs are supplied or assigned.
- [ ] Bundle inspection is complete before implementation edits begin.
- [ ] The Claude Design bundle is accessible to the implementation team.

## 9. Claude Code implementation prompt

- [ ] Requires repository-instruction review before editing.
- [ ] Requires inspection of the current route, shell, component library, tokens, tests, data, and nearby patterns.
- [ ] Requires a component map and reports unmapped elements.
- [ ] Modifies the existing feature rather than creating a parallel UI.
- [ ] Preserves out-of-scope behavior.
- [ ] Uses repository state, accessibility, responsive, and test patterns.
- [ ] Treats prototype code as intent unless explicitly mapped.
- [ ] Stops before scope expansion or shared-system promotion.
- [ ] Runs static, behavior, build, accessibility, and rendered checks.
- [ ] Reports deviations and unverified items directly.

## 10. Implementation proof

- [ ] Type, lint, formatting, and build checks pass.
- [ ] Unit and integration tests cover graph rules, transitions, persistence, importer mapping, fixtures, errors, retry, permissions, conflict, and undo/redo.
- [ ] The actual route renders in all critical states.
- [ ] Required viewports have visual evidence.
- [ ] Baseline-preservation and visual-regression comparisons pass.
- [ ] Keyboard navigation is tested in the rendered application.
- [ ] Assistive-technology results are reported separately.
- [ ] Product, design, engineering, and accessibility reviews are recorded.
- [ ] Meaningful design deviations are approved or assigned.
- [ ] Design, Figma, code, and Code Connect are reconciled where they remain sources of truth.

## Native-Figma evidence when required

- [ ] Native writing and live-UI capture are recorded as different workflows.
- [ ] `use_figma` prerequisites and current image/font/response-size limits are checked.
- [ ] `generate_figma_design` destination is Drafts or an editable Full-seat file outside Drafts.
- [ ] Captured component instances and variable bindings are inspected; editable layers alone do not pass reuse.
- [ ] The baseline frames remain intact, and changed node IDs are recorded.

## 11. Field-guide production QA

- [ ] Peer diagram elements use equal geometry, even gutters, and aligned ports.
- [ ] Directional diagrams use orthogonal connectors and arrowheads that point into the actual destination.
- [ ] Split, merge, and shared-state relationships use one deliberate connector spine rather than disconnected branches.
- [ ] A loop has a visible return path and an unambiguous reading order.
- [ ] Diagram labels remain readable in the rendered A5 page and do not collide with connectors.
- [ ] Every chapter opener uses one chapter-specific metaphor rather than a generic decorative plate.
- [ ] Chapter illustrations are unique, label-free, fully visible, and surrounded by generous white space.
- [ ] PDF-ready chapter images are 1200×686 grayscale assets at 280 ppi with pure-white outer edges.
- [ ] Every page is reviewed in a fresh full-document render; diagram pages and chapter openers are also inspected individually.
- [ ] Prompt, callout, code, and worksheet panels keep text inside their allocated geometry with no header/body overlap.
- [ ] Split panels repeat the required label and do not strand a header, list fragment, or section label on the next page.
- [ ] Extracted text contains no missing-glyph markers; symbols use an embedded glyph or a deliberate ASCII fallback.
- [ ] PDF page size, rotation, image placement, bookmarks, source links, and text extraction pass structural validation.

## Final decision

**Outcome:** `[pass / conditional pass / hold]`  
**Evidence revision:** `[design version + repository commit]`  
**Reviewers:** `[names / roles]`  
**Remaining High findings:** `[must be none for pass]`  
**Bounded follow-up:** `[item, severity, owner, due date]`  
**Unverified:** `[item and consequence]`

## Worked-example review status

The October 2 local experiment is a bounded teaching harness. Read the stage 2
handoff and test matrix under `review/2026-10-02/` for exact coverage and failures.
Claude Design generation, three imported-system tests, correction persistence,
conversion/upload, actual export contents, recipient access, and native Figma
identity remain unverified. Leave those checklist items open. The local graph
uses named connections; pointer port dragging and drawn-edge behavior need their
own evidence. Automated keyboard actions do not establish screen-reader usability.
