# Velori prompts

Follow these prompts in handbook order. Resolve source conflicts before import and pass the known-screen, fidelity, and correction checks before generating Review configuration. Keep the completed answer key and historical packet out of initial generation context. Use the walkthrough for tool setup, expected results, evidence, and stop conditions.

## Preserve the configurator (Claude Design)

```text
Inspect the supplied Velori configurator and component library. Record the choices, asset composition, captions, storage behavior, and reusable exports. Preserve the existing identity and 1024 × 768 reference layout. Use the documented expression dropdown and one accessory choice. Describe the bounded change needed for Continue to open Review configuration, with edit and Back retaining the four values. Do not add payment, stock, accounts, shipping, or order submission.
```

## Prepare the source system (Claude Code)

```text
Work in this extracted Velori package. Inspect reference/index.html, reference/design-system.js, src/library.jsx, src/index.js, tokens.json, src/tokens.css, src/velori.css, docs/inventory.md, the component previews, the asset manifest, and the identified Figma working file. Prepare docs/system-definition.md and docs/source-conflicts.md before uploading. Inventory colors, typography, spacing, layout, component anatomy, valid props, states, and usage. Include CSS literals. Cite the source path and selector, export, or Figma identity for each rule. Separate directly observed rules, inferred compositions, proposed additions, and unresolved conflicts. Preserve existing names and consumer behavior. Explain which useful values need named tokens or usage guidance; make source changes only after the choices are settled. Preserve the frozen reference, product imagery, dropdown, one-accessory rule, and 72 configurations. Normalize Continue to Ink/white, 12px corners, and 48px height, with 24px accessory gaps. Keep purple Continue and 8px gaps only as named teaching fixtures. Record Arial/Georgia to Arimo/Lora mapping and weight or measurement differences. Exclude ReviewConfiguration and the historical handoff from the baseline system. Stop before upload if an unresolved decision affects the starting screens. Do not invent a component or silently accept a proposed pattern.
```

## Import the prepared Velori draft (Claude Code)

```text
Use /design-sync to import the prepared Velori source system into the recorded destination. Use .design-sync/config.json, src/library.jsx, src/tokens.css, src/velori.css, the reviewed system definition and source-conflict record, conventions, previews, and packaged assets. Exclude the frozen reference, ReviewConfiguration, historical handoff, node_modules, validation outputs, and private owner state from upload. Confirm the account, organization, new or existing system, and destination before sending files. Check all 13 baseline exports and their usage guidance. Preserve the conversion report, file inventory, returned result, and system URL. Stop on a rejected upload or unresolved source conflict. Keep the system private; do not publish it or change the organization default.
```

## Recreate known Velori screens (Claude Design)

```text
Use the selected Velori system and accepted source definition. Recreate the configurator at 1024 × 768 with Chalk, Friendly, White, and Dock, then Graphite, Simple, Amber, and Carry bag. Show the expression menu, Carry bag details, Charging dock details, and unavailable-image configurator. Use the actual named components, controlled props, tokens, and product assets. Keep selection, photograph, mask, caption, and labels consistent. Browsing another accessory must not change selection. Preserve dropdown keyboard behavior. Identify missing or unverifiable source rules before substituting them. Do not add Review configuration yet.
```

## Audit source conformance (Claude Design)

```text
Audit these ten elements: brand/navigation, heading, Continue, finish, face, expression dropdown, single accessory choice, product imagery, caption, and layout. For each, cite the actual component/export and token or accepted CSS rule used, with its size, type, spacing, radius, and color where applicable. Classify it as exact reuse, valid composition, cosmetic resemblance, invented replacement, or unverifiable. Separate observed source evidence from inference. Flag altered props, substituted imagery, literal values that disagree with the definition, and missing states. Do not infer reuse from a screenshot. Stop before the review extension if any element lacks accepted source evidence.
```

## Correct and regenerate (Claude Design)

```text
In this isolated test screen, correct the named purple-continue or accessory-gap-8 fixture using the accepted Velori source system. Continue must use PrimaryButton with Ink/white, 12px corners, and 48px height. Accessory choices must have 24px gaps. Identify the source rule used for the correction. Then generate a second configurator state with Pebble, Friendly, Mint, and no accessory. Confirm that the corrected rule persists there and that the fixture has not become an accepted variant. Record any unresolved replacement before proceeding.
```

## Add Review configuration (Claude Design)

```text
Use the selected Velori system and supplied configurator as the baseline. Make Continue open Review configuration. Show the chosen product photo and finish, face, expression color, and single accessory. Add Edit configuration and Back. Both return without losing values. Support pointer and keyboard navigation, focus on the newly opened heading, reload persistence, and an unavailable-image state that retains the summary. Reuse the system components and tokens. Identify the review screen as new sample behavior. Keep payment, inventory, accounts, shipping, and order submission outside the result.
```

## Audit the complete journey (Claude Design)

```text
Select Graphite, Simple, Amber, and Carry bag. Open accessory details, browse Charging dock, and return. Continue to review, then edit. Inspect photographs, captions, selected marks, and summaries after each transition. Keep Carry bag selected while browsing Dock. Show the unavailable-image state on review with the four values still visible. Report any surface that reads stale or independent values.
```

## Verify recovery (Claude Code)

```text
Test rapid changes and a genuinely failed product-image request. Confirm the final image and caption agree, a failed image retains choices, and Retry reloads the asset after it becomes available. Test reload on review, blocked browser storage, and reset isolation. Keep unrelated storage values intact. Record actual results rather than adding untested behavior claims.
```

## Review against evidence (Claude Design)

```text
Audit the Velori journey against the preserved baseline and bounded review brief. Name each reused component, product composition, changed behavior, and unresolved issue. Test the non-default fixture, detail browsing, review, edit, keyboard return, reload, and unavailable images. Keep conclusions tied to the rendered result and actual handoff. Do not infer interactive behavior from an artboard or PNG.
```

## Prepare the new Code packet (Claude Code)

```text
Inspect the actual received Velori export from the recorded project. Preserve its files unchanged in handoff/new-run/captured/ and record their hashes and dependency origins in HANDOFF.json. Create a separate runnable adaptation in handoff/new-run/ with package.json, lockfile, local assets, README, a dev script serving localhost:4206, and a validate script. Do not reuse the historical packet as the new export. Resolve runtime and asset references from the received files; stop for missing private dependencies instead of replacing the generated result. Validation must target this new packet and test all 72 configurations, configure → details → review → edit, dropdown keyboard behavior, Back, reload persistence, rapid changes, unavailable-image recovery, and storage independence. Install Playwright as a development dependency for browser checks. Run without external HTTPS requests after installation. Document every host adaptation separately from captured source and preserve the sample application.
```

## Implement the exported review (Claude Code)

```text
Inspect handoff/new-run/captured/ and HANDOFF.json from the passing new packet. Adapt only the bounded Review configuration column into the React sample. Preserve named exports, tokens, photos, all four values, the expression dropdown, and one accessory choice. Keep routing, persistence, focus, and image recovery in their existing owners. Test configure → details → review → edit with Graphite, Simple, Amber, and Carry bag. Record the source-to-implementation mapping and deviations. Do not edit CLEAR or publish.
```

## Build and inspect the native store (Figma)

```text
Use the identified Velori working file. Preserve the original foundation, components, configurator, and source assets. Add editable native frames for configure, expression menu, Carry bag details, Charging dock details, review, and unavailable review. Reuse existing component instances and shared variables. Wire Graphite, Simple, Amber, and Carry bag through details, review, and edit. Confirm selected states, product images, captions, and summaries all update. Browse Dock without replacing Carry bag. Record component and variable identities and test the actual prototype.
```
