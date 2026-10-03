# Claude Design Prompt Pack

Copy-ready prompts for the workflow in the *Claude Design Field Guide*. Replace bracketed fields and keep approved preservation language in every follow-up.

## Setup before using the prompts

These prompts describe work to perform. The October 2 review tested a local SDS React teaching example. Claude Design generation, sync, export, and native Figma reuse remain unverified. Follow [Simple Design System Setup](./Simple_Design_System_Setup.md) and record the surface, account/organization, version, provider, selected system, and source revision.

For React systems, the [Claude Code command reference](https://code.claude.com/docs/en/commands) documents `/design-login` followed by `/design-sync [hint]`. Sync converts and uploads the system; scope the source and confirm the destination. Manual Design MCP registration is not a prerequisite in the current reviewed instructions. `/design [brief]` drafts artboards and requires v2.1.265+, enabled Design, and an artifact-capable session. Test interactivity and exports on the chosen surface before treating the result as a working product prototype.

## 1. Analyze the baseline before generating

**Tool:** Claude Design

```text
You are preparing to extend an existing production screen. Do not generate a
new design yet.

Review the attached current screen, route context, relevant code, and
design-system sources. Produce:

1. a factual inventory of the current screen,
2. the visible component and layout patterns,
3. the behaviors and regions that should be preserved,
4. ambiguities or source conflicts,
5. a proposed change boundary for the requested feature.

Separate direct observations from inferences. Do not invent missing behavior.
End with the questions that require a product, design, or engineering owner.
```

## 2. Inspect the system package

**Tool:** Claude Code

```text
Inspect the attached design-system package and current feature implementation.
Do not edit files.

Return four inventories:

1. production components available for reuse, with import paths and relevant props,
2. semantic tokens available for color, spacing, typography, radius, and focus,
3. current screen composition and state-management patterns,
4. missing product-specific patterns required by the feature brief.

For every proposed missing pattern, explain why existing primitives cannot
cover it through composition. Flag any difference between Figma naming,
Code Connect mapping, and production code.
```

## 3. Create and validate the draft system

**Tool:** Claude Design after source import, or Claude Code `/design-sync` for the React system. Keep publication and default selection subject to the system owner's approval.

```text
Build a draft design system from the attached sources.

Treat the component-library code and design tokens as authoritative. Use the
attached shipped screens to learn composition and product patterns. Use the
working Figma file for component anatomy, variants, variables, and layout intent.

Preserve existing component, token, and pattern names exactly. Separate:

1. directly observed components and tokens,
2. inferred composition patterns,
3. missing or ambiguous areas.

Do not silently invent a component. Label any missing pattern as a proposed
addition. Generate a settings screen, a dense operational table, and a
confirmation flow for validation. Record the selected system and source
revision. Keep the system in draft. Do not publish or set an organization
default as part of this prompt.
```

## 4. Extend an existing screen

**Tool:** Claude Design

```text
Extend the existing [SCREEN OR ROUTE] with [FEATURE].

Starting context:
- current screen: [SCREENSHOT, WEB CAPTURE, OR FILE/ROUTE],
- relevant code: [DIRECTORIES OR FILES],
- existing components to reuse: [COMPONENT NAMES],
- existing pattern to follow: [SCREEN OR FLOW],
- target viewports: [VIEWPORTS].

Keep the current application shell, navigation, information architecture,
spacing scale, typography, and interaction language. Preserve [NAMED BEHAVIORS].
Do not redesign unrelated areas.

Change only [APPROVED REGION]. Reuse existing components and variants wherever
possible. Mark every proposed component or token explicitly. Produce a working
interactive prototype and a short change log.
```

## 5. Add one interaction without scope drift

**Tool:** Claude Design

```text
Keep the approved screen, fixture, components, and preservation boundary
unchanged. Add only [INTERACTION].

Show:
- the trigger and precondition,
- immediate feedback,
- success behavior,
- failure behavior that preserves stable state,
- keyboard and pointer paths,
- focus destination,
- persistence after save and reload.

Use existing design-system patterns. Do not add adjacent features or redesign
approved regions. Return a focused change log.
```

## 6. Complete the state model

**Tool:** Claude Design

```text
Extend the approved prototype to cover the supplied state matrix without
changing approved layout or components.

Cover default, populated, loading, empty, dirty, saving, success, validation,
system error, permission, conflict, stale, truncated, cancelled, and recovery
behavior where each state applies.

For every consequential action, state the trigger, precondition, immediate
feedback, success result, failure result, persistence rule, and recovery action.
Use representative frames and annotated transitions rather than duplicating
screens unnecessarily. Mark any state that depends on an unresolved API or
product decision.
```

## 7. Audit cross-surface consistency

**Tool:** Claude Design

```text
Audit the approved surfaces as one product state.

Trace the shared fixture through the complete journey. Identify every point
where selection, dirty state, run state, fixture data, status language,
permissions, or error recovery disagree across surfaces.

Correct only those inconsistencies. Preserve approved layout, components, and
product decisions. Return the traced journey and a before-and-after change log.
```

## 8. Specify responsive and accessible behavior

**Tool:** Claude Design

```text
Review the approved prototype at [PRIMARY VIEWPORT] and [MINIMUM VIEWPORT].
Show how adjacent surfaces resize, dock, overlay, collapse, or scroll without
colliding or hiding required actions. Do not shrink text or targets below the
design-system standards.

Then annotate the critical journey for keyboard, focus, labeling, status,
dialogs, tables, progress, and motion. For each step, specify the focused
element, available keyboard action, visible focus treatment, accessible name,
announcement when state changes, and focus destination after completion or
error.

Separate what the design proves from what must be tested in the rendered
implementation.
```

## 9. Run the conformance audit

**Tool:** Claude Design

```text
Audit this prototype against the linked design system and codebase.

For every visible element, classify it as:
- reused existing component,
- existing component with an approved variant,
- composed from existing primitives,
- proposed product component,
- proposed shared component,
- reference only,
- unverified.

Correct objective token, typography, spacing, radius, color, and component
deviations. List proposed corrections before applying them. Return the final
component disposition, source conflicts, and unresolved items with owners.
Do not call the design production-ready.
```

## 10. Run the handoff gate

**Tool:** Claude Design

```text
Run a final evidence audit of the approved prototype.

Return five sections:
1. preservation-boundary comparison,
2. component and token disposition for every visible pattern,
3. success-journey and state coverage,
4. responsive and accessibility specification coverage,
5. unresolved or unverified items with owners.

State one outcome: pass for handoff, conditional pass with bounded follow-up,
or hold. Do not correct product decisions silently. State whether the work is
ready for engineering handoff and why.
```

## Inspect the handoff before implementation

**Tool:** Claude Code or the intended local agent

```text
Read the supplied handoff from [BUNDLE URL OR LOCAL PATH]. Do not edit the
repository yet. List the files, design states, decisions, component mappings,
fixtures, and acceptance tests actually received. Separate documented default
bundle contents from observed contents. Record the source system/revision,
export surface/date, recipient access result, and missing inputs. Do not
invent absent decisions or treat prototype code as production code.
```

The [official tutorial](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux) describes a default bundle with files, chat, and README. Test the actual export before using that expectation as evidence. The implementation prompt below requires separate authority to edit the scoped feature.

## 11. Implement the approved handoff

**Tool:** Claude Code

```text
Implement the attached Claude Design handoff in the existing repository.

Before editing:
1. Read the repository instructions.
2. Inspect the current route, application shell, component library, tokens,
   tests, data layer, and nearby implementation patterns.
3. Map each design element to an existing production component.
4. Compare that map to the supplied component-to-code table.
5. Report any design element that has no valid implementation mapping.

During implementation:
- Modify the existing route and files where appropriate; do not create a
  parallel UI or duplicate existing components.
- Preserve behavior outside the approved feature scope.
- Use established state, data, accessibility, responsive, and testing patterns.
- Use the supplied fixtures across designed states and tests.
- Treat prototype code as design intent unless the handoff identifies a
  production mapping.
- Stop before broadening scope or promoting a shared component without approval.

After implementation:
- Run the relevant unit, integration, accessibility, type, lint, and build checks.
- Verify the rendered states at the specified viewports.
- Compare the rendered feature to the preservation and visual baselines.
- Report reused components, new components, deviations, proof, and anything
  still requiring human approval.
```

## 12. Extend an existing native Figma screen

**Tool:** Remote Figma MCP `use_figma`, with the installed Figma write-to-canvas skills. Verify Full seat and edit permission first. See [native-writing requirements](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/).

```text
Using the working Figma file and selected existing screen, add the approved
feature beside the current version for review.

Inspect the file and connected libraries first. Reuse existing components,
variables, styles, layer naming, and Auto Layout conventions. Preserve the
surrounding screen and source frame. Apply the approved component disposition,
state matrix, and responsive rules. Create only documented product-specific
extensions.

Return the IDs of created or changed frames and components, plus any mapping you
could not verify. Do not edit a public Community source.
```

## 13. Capture the implemented flow in Figma

**Tool:** Remote Figma MCP `generate_figma_design`. Any seat can capture in Drafts; outside Drafts, an existing file needs Full plus edit permission. See [capture requirements](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/).

```text
Capture the complete local feature flow in [WORKING FIGMA FILE URL] as editable
Figma frames.

Inspect whether captured layers use real connected components, variables,
and styles. Record matches and gaps without claiming identity from visual
similarity. Include each unique critical state and required viewport. Create a summary page that records
the journey, component mappings, implementation deviations, and unresolved
differences from production.

Keep approved source frames intact. Place captured implementation frames in a
separate named section with capture date and repository revision.
```

## Operating reminders

- Duplicate Community files before connected inspection or editing.
- Use the current built-in command path and confirm what `/design-sync` uploads; record authorization and sync errors.
- Use focused repository directories for large codebases.
- Export a reviewed baseline before alternatives; Design has no version history yet.
- Use chat for structural changes, comments for targeted changes, and direct canvas edits for quick layout adjustments.
- Treat conformance checks as assistance; a design-system owner still approves the result.
- Treat generated code as reference until it maps to production components and passes repository checks.

## 14. Check the fixture before building the example

**Tool:** Claude Code or local repository tools. This is a local fixture test, not a Claude Design observation.

```text
Inspect customers-august.csv, its JSON equivalent, and expected-results.json.
Use the six-row contract in Chapter 1. Do not replace records with placeholder data.

Require confirmation of contact_email → email and both proposed mappings before
importing. Create source ID august only after confirmation. Connect august to
normalize, retain normalize → validate → warehouse, and add validate → quarantine.

Expect normalized emails alice@example.com and frank@example.com for C001 and
C006. Report row 4/email, row 5/email, and row 6/health_score as invalid. The first
intended run fails at warehouse with missing-warehouse; repair to customer_health,
Save, then re-run for 3 published and 3 quarantined rows. Test Reject invalid rows
separately for 3 published, 0 quarantined, and 3 rejected.

Cancel and parse failure must leave the graph unchanged. Save failure must keep
Run disabled and preserve the unsaved draft. Attempt a cycle and an incompatible
connection without graph mutation. Test the same journey with keyboard actions.

Report actual tool observations, local execution, documentation, and inaccessible
checks separately. Do not call a manually assembled package a Design export.
```
