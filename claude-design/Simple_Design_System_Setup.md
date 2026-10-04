# Simple Design System Setup for Claude Design

Use this setup to pair a working Figma copy with the SDS React package and give Claude Design a focused source package.

## 1. Create the working Figma file

1. Open the supplied [Simple Design System Community file](https://www.figma.com/design/AIulMBySUibjRtykdngCUp/Simple-Design-System--Community-?node-id=3-5).
2. Choose **Open in Figma** if the Community preview opens first.
3. Choose **Make a copy**.
4. Save the copy in Drafts or the project that will own the experiment.
5. Record both links:
   - Provenance: the original Community URL.
   - Working file: the new editable `/design/<fileKey>/...` URL.
6. Confirm the account used by connected tools can edit the working file.

Keep the public Community source untouched. Figma MCP permits reads of content the authenticated account can view or edit; native writes require a Full seat and edit permission for an existing file. Confirm the account, seat, file membership, and available tools. Use `whoami` to check identity and seat, then inspect a small selection in the copied file. See [MCP access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) and [native writing](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/).

## 2. Pair the codebase

Use Figma's official [Simple Design System repository](https://github.com/figma/sds).

Relevant sources:

- `src/ui/primitives` — reusable controls.
- `src/ui/layout` — Flex, Grid, and Section helpers.
- `src/ui/compositions` — example compositions.
- `src/ui/icons` — generated icon components.
- `src/theme.css` — generated CSS variables.
- `src/figma` — Code Connect mappings.
- `src/stories` — Storybook examples and states.
- `scripts/tokens/tokens.json` — checked-in Figma variable data.
- `scripts/component-metadata/components.json` — checked-in component metadata.

Record the repository revision used for the project. The component inventory, counts, token names, and Table discrepancy retained in the guide come from August 5 research. Re-inspect them in your chosen revision and working file before using them as current evidence.

## 3. Connect the duplicated file to Code Connect

The SDS README still documents `documentUrlSubstitutions` in `figma.config.json` and expects a fresh copy to retain node IDs. Verify a sample before changing file keys. Code Connect requires a Dev or Full seat on Organization or Enterprise. Its current CLI quickstart recommends framework-agnostic template files, while SDS mappings depend on the repository revision. Record the mapping format and installed CLI version; do not silently migrate existing mappings. See [Code Connect eligibility](https://developers.figma.com/docs/code-connect/) and the [CLI quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/).

1. Clone or copy the SDS repository into the approved development environment.
2. Update the file keys in the URLs in `figma.config.json` so they point to the working Figma copy.
3. Leave node IDs unchanged unless components were intentionally detached and recreated.
4. Follow the CLI quickstart for Node.js 18 or newer and a locally stored token with Code Connect Write and File content Read scopes. Keep secrets out of prompts and files intended for handoff.
5. Validate mappings locally. Publish only when that external write is authorized by the system owner.
6. Sample a component response for import, props, snippet, and source path. CLI and UI mappings supply different detail; full code snippets are not included by default for UI mappings. See [mapping context](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/).

Do not paste API tokens into Claude chat, commit them, or include them in the handoff.

## 4. Build the focused Claude Design package

Include:

- The working Figma file URL.
- Relevant SDS primitive, layout, and composition directories.
- `src/theme.css` and token-generation notes.
- Relevant Code Connect files.
- Relevant Storybook stories.
- The current product route and nearby tests.
- Two or three representative shipped screens.
- The extension brief, preservation boundary, state matrix, and fixtures.

Exclude:

- `.git`, `node_modules`, build output, and caches.
- Unrelated packages and large asset folders.
- Deprecated components.
- Concept work that conflicts with production.
- Private customer data, secrets, or sensitive screenshots.

For a large monorepo, attach the focused package and feature directories instead of the entire repository.

## 5. Choose and verify the Claude Design surface

1. Confirm the plan and organization. Design and Design systems are beta on Pro, Max, Team, and Enterprise. Both templates are on by default on Pro, Max, and Team. Enterprise owners enable each required template in Organization settings > Artifacts. Standalone Design at claude.ai/design has a separate organization setting. See [Design access](https://support.claude.com/en/articles/14604416-get-started-with-claude-design) and the [admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans).
2. Record the chosen surface: conversation with Output > Design, an Artifacts Design template, Claude Code, or standalone claude.ai/design. Confirm the selected system instead of assuming the same default across all surfaces.
3. For a React product system, open Claude Code in the approved focused repository. Run `/design-login` to authorize design-system access, then `/design-sync [hint]` to convert and upload the tokens and components. The hint is optional. First-time verification can take hours for a large source package. Confirm the destination system, imported component names, and source revision before feature work. See the [command reference](https://code.claude.com/docs/en/commands).
4. For a brand system, create it in chat from approved assets. Integrated systems live in Settings > Design systems. Existing standalone systems can migrate through the Design sidebar banner; inspect the cleaned guide, tokens, and components before using them. See [system setup](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design).
5. Standalone setup uses organization onboarding, asset import, review, and the Published toggle. Integrated publication and organization-default selection are separate decisions. Keep this experiment in draft unless the owner authorizes broader system publication.
6. For `/design [brief]`, confirm Claude Code v2.1.265 or later, an enabled Design template, and a claude.ai-backed session signed in with `/login`. API-key-only sessions cannot publish artifacts. Cloud-provider and restricted organization configurations have documented exclusions. Open the returned artboards in a desktop browser and test required interaction behavior. The CLI reference describes artboards; do not assume parity with a standalone interactive prototype. See [artifact requirements](https://code.claude.com/docs/en/artifacts).

The current reviewed docs support `/design-login`; they do not require manual registration of the Claude Design MCP endpoint before these commands. Remove that registration from the default setup path without claiming the endpoint is retired. If a command is missing or authorization fails, record version, provider, plan, enabled template, and error before changing configuration.

Before uploads, confirm persistent-storage and retention requirements, Design's unsupported data residency, and the new Artifacts restrictions for CMEK, ZDR, and HIPAA-ready organizations. Standalone Design lacks audit logs; integrated artifact records have different coverage. See the [Artifacts admin guide](https://support.claude.com/en/articles/16994751-artifacts-admin-guide-for-team-and-enterprise-plans).

Usage draws from the existing Claude allowance. Record an interrupted import or generation as incomplete, with the exact error and partial artifact; do not count it as a passing system test.

## 6. Validate before publishing the system

Generate three known screens:

1. A settings form.
2. A dense operational table.
3. A confirmation flow.

For a ten-element sample on each screen, classify visible elements as:

- Exact reuse.
- Valid composition.
- Cosmetic match without component identity.
- Invented.
- Unverifiable.

The system passes when sampled elements are exact reuse or valid composition, or the exception is explicitly documented and approved. Test one correction across regeneration before publishing the system to the organization.

## 7. Map SDS to Data Pipeline Studio

### Reuse

- Buttons and canvas controls: Button, IconButton, Tooltip.
- Inspector fields: InputField, SelectField, TextareaField, CheckboxField, RadioGroup, SwitchField, SliderField.
- Form semantics: Field, Label, Description, FieldError, Fieldset.
- Inspector structure: Accordion, Tabs, Text.
- Preview foundation in code: Table, Search, Tag, Pagination.
- Menus and dialogs: Menu, ListBox, Dialog.
- Status and feedback: Notification, Tag, semantic color roles, icons.
- Layout: Flex, Grid, Section and the current application shell.

### Product-specific extensions

- `PipelineNode`.
- `PipelinePort`.
- `PipelineEdge`.
- `CanvasToolbar` container and graph navigation model.
- `NodeInspectorShell` and schema orchestration.
- `DataPreviewSheet` and product data-grid behavior.
- `FileDropzone`.
- `ColumnMappingRow` and staged importer flow.
- `RunProgressSummary` and operational run-state model.

The August inspection found a React Table primitive and only a Table icon in the checked-in Figma metadata. Recheck the chosen revision and working file. Treat the Figma grid as unverified until that inspection establishes a reusable component or a product extension.

## 8. Use semantic tokens

Use the semantic `@color`, `@size`, and `@typography` collections. Do not introduce raw palette values or arbitrary spacing in feature work.

Limit new tokens to graph-specific needs that the existing system cannot express, such as:

- Canvas grid and surface roles.
- Edge and port interaction states.
- Node operational status surfaces.
- Canvas focus treatment.
- Node geometry and port hit-area dimensions.

Each new token needs a semantic purpose, derivation from existing primitives where possible, an owner, and a design-system review disposition.

## 9. Connect the separate Figma branch

Figma recommends its Claude Code plugin, which bundles the remote server and skills:

```sh
claude plugin install figma@claude-plugins-official
```

If the team uses manual setup, the official alternative is:

```sh
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

Start a new Claude Code session, use `/mcp` to select Figma and authenticate through OAuth, and confirm the connection. The manual command defaults to local scope; use user scope only if the team wants it across projects. The guidance refresh did not install or authenticate these tools. See [remote setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/).

1. Use `use_figma` with the working-file URL for native writing. It needs a Full seat and edit permission on an existing file. Current limits include a 20kb output response per call, no image assets or custom fonts, and manual component publication before Code Connect completes. See [write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/).
2. Use `generate_figma_design` to capture live UI into editable layers. Any seat can use this path in Drafts; an existing file outside Drafts needs Full plus edit permission. Check instances and variable bindings after capture before claiming library reuse. See [code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/).
3. Check the authenticated seat and current read quotas before a large inventory. MCP access, native writing, capture, and Code Connect eligibility are separate checks.

## 10. Preserve a baseline and inspect the export

Export the reviewed baseline before trying an alternative. Design has no version history yet; a request to save the project is not evidence of reliable restoration. Record an artifact link, export time, source revision, and export hash where a local file exists.

The Design help guide lists ZIP, PDF, PPTX, HTML, and Claude Code handoff; Google Slides is standalone-only. Claude Code `/design` specifically documents artboard PNG/PDF. Inspect the available controls on the chosen surface. For Code handoff, inventory the actual files, chat, README, and decisions received, test intended recipient access, and supply missing team artifacts. Do not assume the entire state matrix transfers automatically.

## 11. Setup exit criteria

- [ ] The public source is untouched.
- [ ] The working Figma file is editable by the connected account.
- [ ] Repository and working-file revisions are recorded.
- [ ] Components, tokens, stories, and Code Connect mappings are inspectable.
- [ ] The focused package excludes unrelated or sensitive material.
- [ ] All three known-screen tests pass and one correction persists in a neighboring state.
- [ ] The selected surface, organization, plan, installed version, and provider are recorded.
- [ ] Import/upload destination and system selection are confirmed.
- [ ] Figma account, read/write eligibility, quota, and Code Connect status are recorded separately.
- [ ] A reviewed baseline export is preserved and opens.
- [ ] Export contents and recipient access are inspected; missing content is assigned.
- [ ] Documentation claims and runtime observations have separate evidence fields.
- [ ] Product-specific gaps are named before generation.
- [ ] A design-system owner approves publication or records why the system remains a draft.

## Official references

- [Figma SDS repository](https://github.com/figma/sds)
- [Code Connect quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Figma MCP introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/)
- [Anthropic design-system setup](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)
- [Anthropic Claude Design getting started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)

## Check the system in each tool

The companion application uses `figma/sds` commit `05525f75192a3aa5d5690c5e41277ebd19d2efe1` for its React Button, InputField, SelectField, Dialog, Tag, and Table primitives. Pin your chosen revision before importing the system.

After sync, generate the three known screens in Claude Design and inspect their component and token mappings. Apply a correction and confirm that it persists. In Figma, inspect the matching component instances and variable bindings in your working copy. Confirm Code Connect eligibility separately. Export the reviewed prototype and check that the intended recipient can open the complete handoff.
