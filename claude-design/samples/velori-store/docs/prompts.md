# Current exercise · v2.1.1

Use [add-to-cart.md](add-to-cart.md) and [product-brief.md](product-brief.md) for the current Review and Cart assignment. The stages below retain the source-preparation and native-capture sequence. Extend stage 7 through Add to cart and Cart confirmation; keep Continue on both Configure and Edit. Exclude ReviewConfiguration and CartConfirmation from initial generation context.

# Velori handbook prompts

The prompts below match the candidate handbook. Confirm the account, organization, selected system, and working Figma file before a native step. Keep unsuccessful attempts and actual returned evidence.

## 1. Preserve the configurator

Tool: Claude Design

```text
Inspect the supplied Velori configurator and component library. Record the choices, asset composition, captions, storage behavior, and reusable exports. Preserve the existing identity and 1024 × 768 reference layout. Use the documented expression dropdown and one accessory choice. Describe the bounded change needed for Continue to open Review, then Add to cart to save one snapshot and open Cart confirmation. Edit and Back retain the four values; editing a cart item restores its saved choices and adding again updates that item. Do not add payment, stock, accounts, shipping, or order submission.
```

## 2. Prepare the source system

Tool: Claude Code

```text
Work in this extracted Velori package. Inspect reference/index.html, reference/design-system.js, src/library.jsx, src/index.js, src/main.jsx for starting-screen copy and navigation, src/model.mjs for labels and captions, tokens.json, src/tokens.css, src/velori.css, docs/inventory.md, the component previews, the asset manifest, and the identified Figma working file. Prepare docs/system-definition.md and docs/source-conflicts.md before uploading. Inventory colors, typography, spacing, layout, component anatomy, valid props, states, and usage. Include CSS literals. Cite the source path and selector, export, or Figma identity for each rule. Separate directly observed rules, inferred compositions, proposed additions, and unresolved conflicts. Preserve existing names and consumer behavior. Explain which useful values need named tokens or usage guidance; make source changes only after the choices are settled. Preserve the frozen reference, product imagery, dropdown, one-accessory rule, and 72 configurations. Normalize Continue to Ink/white, 12px corners, and 48px height, with 24px accessory gaps. Keep purple Continue and 8px gaps only as named teaching fixtures. Record Arial/Georgia to Arimo/Lora mapping and weight or measurement differences. Project exact configure and accessory-details wording, caption construction, and details routing into docs/native-baseline.md. Map original source references to their imported bundle, CSS, and component guidance paths. Exclude ReviewConfiguration, completed Review implementation, and the historical handoff from the baseline system. Stop before upload if an unresolved decision affects the starting screens. Do not invent a component or silently accept a proposed pattern.
```

## 3. Import the prepared Velori draft

Tool: Claude Code

Type `/design-sync` yourself at the Claude Code prompt and submit the native command. After it opens, supply the instruction below.

```text
Import the prepared Velori source system into the recorded destination using the native command already opened. Use .design-sync/config.json, src/library.jsx, src/tokens.css, src/velori.css, docs/native-baseline.md derived from the reviewed system definition and resolved source-conflict decisions, conventions, previews, and packaged assets. Exclude the frozen reference, ReviewConfiguration, completed answer-key guidance, historical handoff and mappings, node_modules, validation outputs, and private owner state from upload. Confirm the account, organization, new or existing system, and destination before sending files. Check all 13 baseline exports and their usage guidance. Use the supplied declared source adapter so assets and their hash inventory exist before native validation and capture. Include assets/** in the upload scope, review obsolete asset paths, and verify the product files reached the recorded destination. Recapture asset-dependent previews whenever the asset inventory changes. Preserve the conversion report, file inventory, returned result, and system URL. Stop on a rejected upload or unresolved source conflict. Keep the system private; do not publish it or change the organization default.
```

## 4. Recreate known Velori screens

Tool: Claude Design

```text
Use the selected Velori system and accepted source definition. Create one responsive interactive store with one shared configuration and one mounted screen at a time. Use fixture controls or routes to inspect the required states while keeping component IDs unique. Preserve the supplied storage and focus behavior. Recreate the configurator at 1024 × 768 with Chalk, Friendly, White, and Dock, then Graphite, Simple, Amber, and Carry bag. Show the expression menu, Carry bag details, Charging dock details, and unavailable-image configurator. Use the actual named components, controlled props, tokens, and product assets. Keep selection, photograph, mask, caption, and labels consistent. Browsing another accessory must not change selection. Preserve dropdown keyboard behavior. Identify missing or unverifiable source rules before substituting them. Do not add Review configuration yet.
```

## 5. Audit source conformance

Tool: Claude Design

```text
Audit these ten elements: brand/navigation, heading, Continue, finish, face, expression dropdown, single accessory choice, product imagery, caption, and layout. For each, cite the actual component/export and token or accepted CSS rule used, with its size, type, spacing, radius, and color where applicable. Classify it as exact reuse, valid composition, cosmetic resemblance, invented replacement, or unverifiable. Separate observed source evidence from inference. Flag altered props, substituted imagery, literal values that disagree with the definition, and missing states. Do not infer reuse from a screenshot. Stop before the review extension if any element lacks accepted source evidence.
```

## 6. Correct and regenerate

Tool: Claude Design

```text
In this isolated test screen, correct the named purple-continue or accessory-gap-8 fixture using the accepted Velori source system. Continue must use PrimaryButton with Ink/white, 12px corners, and 48px height. Accessory choices must have 24px gaps. Identify the source rule used for the correction. Then generate a second configurator state with Pebble, Friendly, Mint, and no accessory. Confirm that the corrected rule persists there and that the fixture has not become an accepted variant. Record any unresolved replacement before proceeding.
```

## 7. Add Review configuration

Tool: Claude Design

```text
Use the selected Velori system and supplied configurator as the baseline. Make Continue open Review configuration. Show the chosen product photo and finish, face, expression color, and single accessory. Add Edit configuration and Back. Both return without losing values. Keep Continue as the primary label on Configure and Edit. Add to cart saves a separate one-item snapshot and opens Cart confirmation with a real product image, all four choices, and Quantity: 1. Later configuration changes leave the snapshot intact. Edit cart item restores saved values; add again updates the one item without duplicates. Preserve the same-session cart on reload. Reset clears it, restores defaults, and returns to Configure. Require an explicit replacement or None when an accessory is unavailable. An empty cart offers Configure Velori. Support pointer and keyboard navigation. Focus the Review heading when it opens; when Edit configuration, Back, or browser Back returns to the configurator, restore focus to Continue. Preserve reload persistence and an unavailable-image state that retains the summary. Reuse the system components and tokens. Identify the review screen as new sample behavior. Keep payment, inventory, accounts, shipping, and order submission outside the result.
```

## 8. Audit the complete journey

Tool: Claude Design

```text
Select Graphite, Simple, Amber, and Carry bag. Open accessory details, browse Charging dock, and return. Continue to review, then edit. Inspect photographs, captions, selected marks, and summaries after each transition. Keep Carry bag selected while browsing Dock. Show the unavailable-image state on review with the four values still visible. Report any surface that reads stale or independent values.
```

## 9. Verify recovery

Tool: Claude Code

```text
Test rapid changes and a genuinely failed product-image request. Confirm the final image and caption agree, a failed image retains choices, and Retry reloads the asset after it becomes available. Test reload on review, blocked browser storage, and reset isolation. Keep unrelated storage values intact. Record actual results rather than adding untested behavior claims.
```

## 10. Review against evidence

Tool: Claude Design

```text
Audit the Velori journey against the preserved baseline and bounded review brief. Name each reused component, product composition, changed behavior, and unresolved issue. Test the non-default fixture, detail browsing, review, edit, keyboard return, reload, and unavailable images. Keep conclusions tied to the rendered result and actual handoff. Do not infer interactive behavior from an artboard or PNG.
```

## 11. Prepare the new Code packet

Tool: Claude Code

```text
Use the copied native handoff prompt to read the recorded Velori project through the authenticated claude_design MCP. Confirm the intended account and complete /design-login only if authorization is requested. Read the selected generated HTML, support.js, every referenced system bundle and stylesheet, and all referenced assets. Preserve the copied prompt, returned files and read receipts unchanged in handoff/new-run/captured/, and record their hashes, project URL, selected file, handoff method and dependency origins in handoff/new-run/HANDOFF.json. Treat a truncated binary response or an incomplete decode as a failed read, and preserve its receipt. Obtain full bytes through Share → Project HTML → Project archive → Export. Preserve the original archive and extracted entries unchanged, hash both, and compare complete overlapping files with the MCP reads. Do not fill missing files from the sample or a historical packet. Stop until every required source file and dependency has complete bytes. After capture is complete, create a separate runnable adaptation in handoff/new-run/ with package.json, lockfile, local assets, README, a dev script serving localhost:4206, and a validate script. Do not reuse the historical packet as the new handoff. Inspect the received runtime for globals, CDN URLs and resource mappings; provision required dependencies locally and document every URL or asset-route mapping separately from captured source. Validation must target this new packet and test all 72 configurations, configure → details → review → edit, dropdown keyboard behavior, Back, reload persistence, rapid changes, unavailable-image recovery, and storage independence. Install Playwright as a development dependency for browser checks. Run without external HTTPS requests after installation. Preserve the sample application.
```

## 12. Implement the exported review

Tool: Claude Code

```text
Inspect handoff/new-run/captured/ and HANDOFF.json from the passing new packet. Adapt the bounded Review and Cart columns into the React sample, following the Add to cart brief. Preserve named exports, tokens, photos, all four values, the expression dropdown, and one accessory choice. Keep routing, persistence, focus, and image recovery in their existing owners. Test configure → details → review → edit with Graphite, Simple, Amber, and Carry bag. Record the source-to-implementation mapping and deviations. Do not edit CLEAR or publish.
```

## 13. Build and inspect the native store

Tool: Figma

```text
Use the identified Velori working file. Preserve the original foundation, components, configurator, and source assets. Add editable native frames for configure, expression menu, Carry bag details, Charging dock details, review, unavailable review, Cart confirmation, and empty-cart recovery. Reuse existing component instances and shared variables. Wire Graphite, Simple, Amber, and Carry bag through details, review, and edit. Confirm selected states, configured product images, captions, and summaries update. Keep the original Chalk reference photos in accessory details, matching AccessoryPhoto; browsing Dock must preserve the selected Carry bag. Record component and variable identities and test the actual prototype.
```
