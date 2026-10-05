# Work through Design, Code, and Figma

Start the extracted app using the README. Inspect configure → accessory details → review → edit as the completed answer key. Keep an unchanged copy for comparison. Your new native exercise starts with the configurator, expression menu, accessory details, and unavailable-image configurator. Exclude `src/ReviewConfiguration.jsx` and historical `handoff/` from initial generation context.

## Follow the stages in order

| Stage and tool | Inputs and action | Expected result and evidence | Stop condition |
| --- | --- | --- | --- |
| 1. Local app | README, freeze, reference, specimens. Install and inspect both fixtures at 1024 × 768. | Revision, manifest hash, default and non-default screenshots, independent storage. | Missing files, assets, or failed install. |
| 2. Claude Code and Figma | Run source-preparation prompt with code, tokens, CSS, previews, assets, and identified Figma file. | docs/system-definition.md, docs/source-conflicts.md, source-linked rules and usage; reviewed source diff. | Required rule or disagreement unresolved. |
| 3. Claude Code and Design | Confirm account, organization, Design surface, and destination. Authorize and run /design-sync. | Conversion report, upload inventory and receipt, system URL in chosen organization. | Missing command, rejected upload, wrong destination. |
| 4. Claude Design | Select imported system. Recreate configurator, menu, details, and recovery screens. | Interactive states and ten-element audit with component/rule evidence. | Cosmetic, invented, or unverifiable replacement without reviewed exception. |
| 5. Claude Design | Correct one named fixture in isolated screen; generate Pebble/Friendly/Mint/none. | Before, corrected, and second-generation evidence; accepted rule persists. | Defect repeats or fixture becomes accepted variant. |
| 6. Claude Design | Generate Review configuration using validated baseline. | New review/edit/Back journey, keyboard, reload, recovery. | Lost choices or replaced controls and imagery. |
| 7. Claude Code | Preserve new export/dependencies; run in new folder; implement bounded change. | Export hashes, component map, diff, clean install/build/browser checks. | Export cannot run independently or change is untraceable. |
| 8. Figma | Implement same journey in identified working copy using native instances/variables. | IDs, bindings, screenshots, actual prototype journey. | Broken identity, binding, missing access, or untested required interaction. |

Use matching [prompts](prompts.md) and [handoff template](handoff-template.md). Stop at the first incomplete or incorrect instruction and record the missing decision before continuing. Local tests cannot pass an inaccessible native stage.

## Prepare the source definition

Inspect `reference/index.html`, `reference/design-system.js`, `src/library.jsx`, `src/index.js`, `tokens.json`, `src/tokens.css`, `src/velori.css`, `docs/inventory.md`, `.design-sync/previews/`, and `public/assets/velori/manifest.json`. Read the source freeze and specimens. Include CSS literals when inventorying colors, type, spacing, dimensions, and states. Token files alone do not describe all applied rules.

Run the source-preparation prompt. Review `docs/system-definition.md`, `docs/source-conflicts.md`, and proposed source changes before uploading. Each rule needs its value, source path and selector/export/Figma identity, use, and status: observed, inferred, proposed, or unresolved. Document anatomy, valid props, state ownership, states, and composition constraints. Add named tokens or usage guidance after resolving choices. Preserve the frozen reference.

Continue uses Ink/white, 12px corners, and 48px height. Accessory cards have 24px gaps. Purple Continue and 8px gaps remain isolated fixtures. Color chips and independent checkboxes remain extensions. Record Arial/Georgia to Arimo/Lora mapping, differing weights, and measurements before comparing code and Figma.

## Confirm the destination

Open Claude Design with the intended account and verify the organization in the switcher. This walkthrough uses the standalone `claude.ai/design` project surface. Inspect the returned system there. Conversation artifacts are a separate route outside this exercise; their inventory does not establish a standalone system. Stop if the installed skill cannot target the chosen surface.

Open Claude Code in the extracted folder. Check `/design-sync` and `/design-login`; complete separate Design authorization when requested. Reader configuration has no owner project pinned. Choose a new private system or an explicitly identified existing one. Keep publishing and organization-default selection separate.

Claude's [setup guidance](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design) documents React import through `/design-sync` and an alternative asset route. The source inventory, fidelity sample, and correction test are handbook recommendations. Neither manual entry of every value nor both import routes are required. If access fails, check the [admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans) for the chosen surface.

Record the Figma working file or identified duplicate before editing. Preserve reference frames. Missing access leaves that stage unfinished.

## Inspect the draft and test correction

Run `/design-sync` with the prepared source and import prompt. Preserve conversion and upload results. Inspect 13 cards, usage guidance, states, and assets in Design. `host-entry.mjs` resolves assets relative to the compiled system script. Check photos in generated screens too; local preview paths may fail when hosted.

Recreate known screens with default and non-default choices before Review configuration. Sample brand/navigation, heading, Continue, finish, face, dropdown, single accessory, imagery, caption, and layout. Cite actual component and rule evidence. Classify exact reuse, valid composition, cosmetic resemblance, invented replacement, or unverifiable. Pass exact reuse and valid composition, or a specifically reviewed exception. Save fixture correction and second-generation evidence before extending the store.

## Capture and implement the new handoff

After the system passes, generate Review configuration. In that project, choose Export → Handoff to Claude Code → Send to local coding agent, targeting Claude Code in the extracted package. Save received files unchanged in handoff/new-run/captured/, with hashes, project URL, export type, and dependency origins in HANDOFF.json. ZIP download is an alternative when it supplies executable source. Stop for missing source or private dependencies. Run the new-packet preparation prompt to create package metadata, lockfile, local assets, README, and dev/validate scripts beside captured files. From handoff/new-run/, run npm ci, npx playwright install chromium, and npm run dev. Open localhost:4206, then run npm run validate in another terminal in that same folder. Validation must target the new packet, with external HTTPS requests blocked after installation. Record adapter changes separately from captured source. Claude Code's [`/design`](https://code.claude.com/docs/en/commands) produces artboards with PNG/PDF exports; those do not establish interactive code handoff. Use [Design's export workflow](https://support.claude.com/en/articles/14604416-get-started-with-claude-design) for the generated result.

Implement the new bounded change in the React sample. The app retains configuration, routing, persistence, and focus. The review composes existing exports. Run README validation at the reference viewport and narrow widths, with non-default choices, keyboard return, reload, and unavailable images.

The React review screen was adapted from an earlier native handoff. The historical captured runtime is retained in the private review archive and excluded from this MIT sample. Capture and validate your own new packet; the answer key does not verify a new generation. Keep unsuccessful exports in review records and the working setup path in reader instructions.

Implement the store journey in the Figma working copy using native instances and shared variables. Inspect component and variable identity and click through configure → details → review → edit with Graphite, Simple, Amber, and Carry bag. Check captions, photos, selections, and summaries. Record font and interaction differences.

Report source completeness, local app behavior, native Design validation, actual Code handoff, Figma correspondence, and handbook readiness separately. Publication remains a separate release action.
