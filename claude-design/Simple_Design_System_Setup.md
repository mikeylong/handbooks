# Simple Design System Setup for Claude Design

This setup keeps the public Community source untouched, pairs the working Figma file with Figma's React implementation, and gives Claude Design a focused source package.

## 1. Create the working Figma file

1. Open the supplied [Simple Design System Community file](https://www.figma.com/design/AIulMBySUibjRtykdngCUp/Simple-Design-System--Community-?node-id=3-5).
2. Choose **Open in Figma** if the Community preview opens first.
3. Choose **Make a copy**.
4. Save the copy in Drafts or the project that will own the experiment.
5. Record both links:
   - Provenance: the original Community URL.
   - Working file: the new editable `/design/<fileKey>/...` URL.
6. Confirm the account used by connected tools can edit the working file.

Do not publish or modify the public Community source. A working copy is required because public view access does not necessarily give connected tools permission to read metadata, variables, or components.

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

Record the repository revision used for the project.

## 3. Connect the duplicated file to Code Connect

The SDS repository uses `documentUrlSubstitutions` in `figma.config.json`. A fresh Community copy should retain component node IDs.

1. Clone or copy the SDS repository into the approved development environment.
2. Update the file keys in the URLs in `figma.config.json` so they point to the working Figma copy.
3. Leave node IDs unchanged unless components were intentionally detached and recreated.
4. Configure Figma authentication locally according to the official Code Connect documentation.
5. Publish or validate mappings through the team's normal Code Connect process.
6. Confirm a sample component returns the expected import, props, snippet, and source path.

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

## 5. Connect Claude Design from Claude Code

Anthropic's current documented MCP setup is:

```sh
claude mcp add --scope user --transport http claude-design https://api.anthropic.com/v1/design/mcp
```

Then:

1. Run `/design-login`.
2. Run `/design-sync` to pull the design system into the workflow.
3. Confirm the synchronized system uses the intended working file and code package.

Verify these commands against current Anthropic documentation before a production rollout; Claude Design is beta and the setup may change.

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

The React repository contains a Table primitive. The checked-in Figma component metadata does not list a Table component, only a Table icon. Treat the Figma data grid as a product extension until the working file is inspected and proves otherwise.

## 8. Use semantic tokens

Use the semantic `@color`, `@size`, and `@typography` collections. Do not introduce raw palette values or arbitrary spacing in feature work.

Limit new tokens to graph-specific needs that the existing system cannot express, such as:

- Canvas grid and surface roles.
- Edge and port interaction states.
- Node operational status surfaces.
- Canvas focus treatment.
- Node geometry and port hit-area dimensions.

Each new token needs a semantic purpose, derivation from existing primitives where possible, an owner, and a design-system review disposition.

## 9. Setup exit criteria

- [ ] The public source is untouched.
- [ ] The working Figma file is editable by the connected account.
- [ ] Repository and working-file revisions are recorded.
- [ ] Components, tokens, stories, and Code Connect mappings are inspectable.
- [ ] The focused package excludes unrelated or sensitive material.
- [ ] Known-screen validation passes.
- [ ] Product-specific gaps are named before generation.
- [ ] A design-system owner approves publication or records why the system remains a draft.

## Official references

- [Figma SDS repository](https://github.com/figma/sds)
- [Code Connect quickstart](https://developers.figma.com/docs/code-connect/quickstart-guide/)
- [Figma MCP introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/)
- [Anthropic design-system setup](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)
- [Anthropic Claude Design getting started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)
