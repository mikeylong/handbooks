# Stage 1 claim ledger

Official sources accessed October 2, 2026. Previous cutoff: August 5, 2026. Documentation supports the guidance below; stage 1 contains no live Claude Design, Claude Code, or Figma workflow observations.

## Sources

### A1: Get started with Claude Design

[Anthropic source](https://support.claude.com/en/articles/14604416-get-started-with-claude-design). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Where you can use Claude Design; Export and share; Usage and pricing; Known limitations.

Limit: Live help article; relative update time only. General Design guidance may not describe every /design artifact. Disposition: accepted.

### A2: Set up your design system in Claude Design

[Anthropic source](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Create a design system; Manage your design systems; Set up a design system at claude.ai/design.

Limit: Integrated and standalone instructions coexist. Migration and cleanup were not executed. Disposition: accepted.

### A3: Artifacts admin guide for Team and Enterprise plans

[Anthropic source](https://support.claude.com/en/articles/16994751-artifacts-admin-guide-for-team-and-enterprise-plans). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Templates; custom roles; design systems; Monitor usage; Data handling and privacy.

Limit: Artifact-level compliance recording is distinct from standalone audit logs. Actual tenant settings unobserved. Disposition: accepted.

### A4: Claude Design admin guide for Team and Enterprise plans

[Anthropic source](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Turn on Claude Design for your organization.

Limit: Article explicitly scopes standalone settings separately from integrated Artifacts controls. Disposition: accepted.

### A5: Commands

[Anthropic source](https://code.claude.com/docs/en/commands). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Built-in commands: /design, /design-login, /design-sync.

Limit: CLI reference is more specific than broad product/help wording. Version and provider requirements documented, not tested. Disposition: accepted.

### A6: Share session output as artifacts

[Anthropic source](https://code.claude.com/docs/en/artifacts). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Start from a Slides, Design, or Docs template; Draft a design canvas; Availability; Review the audit log.

Limit: A /design artifact is documented as artboards. Do not infer interactive prototype/export parity from standalone Design. Disposition: accepted.

### A7: Using Claude Design for prototypes and UX

[Anthropic source](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Connecting your codebase; Hand off to Claude Code.

Limit: Original claude.com tutorial redirects here. Default bundle contents documented; export manifest still unobserved. Disposition: accepted.

### A8: Claude Design product page

[Anthropic source](https://claude.com/product/design). Accessed 2026-10-02. Official product/maintainer source. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: FAQ: plans; access; design systems.

Limit: Broad all-paid-plans wording says admins must enable. Prefer precise plan defaults in A1-A4. Marketing claims are not quality proof. Disposition: contextual.

### A9: Introducing Claude Design by Anthropic Labs

[Anthropic source](https://www.anthropic.com/news/claude-design-anthropic-labs). Accessed 2026-10-02. Official product/maintainer source. Complete relevant text via web tool. Publication/update: 2026-04-17 (historical launch).

Evidence location: Handoff to Claude Code; Export anywhere.

Limit: Historical launch context; does not govern current setup or plan controls. Disposition: contextual.

### F1: Figma MCP Server: Introduction

[Figma source](https://developers.figma.com/docs/figma-mcp-server/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: How to connect.

Limit: Use current remote tools and skills. Capability documentation does not prove library reuse in a generated file. Disposition: accepted.

### F2: Set up the remote server (recommended)

[Figma source](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Claude Code: plugin and manual setup.

Limit: Setup commands were not installed or authenticated in this stage. Disposition: accepted.

### F3: Write to canvas

[Figma source](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Get started; Current limitations.

Limit: Full seat and file edit permission required; image assets and custom fonts unsupported; 20kb output response limit; manual component publication before Code Connect completes. Disposition: accepted.

### F4: Code to canvas

[Figma source](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Get started; Supported Clients.

Limit: Drafts exception permits any seat; existing file outside Drafts needs Full plus edit permission. Capture is distinct from library identity. Disposition: accepted.

### F5: Rate limits & access

[Figma source](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Who can access; permission errors.

Limit: Limits vary by seat/plan and may change. HTML text flattens quota table ambiguously; no exact Dev/Full quota transcribed. Runtime whoami and current table must be checked. Disposition: accepted.

### F6: Code Connect: Introduction

[Figma source](https://developers.figma.com/docs/code-connect/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Availability; Template files; Legacy framework-specific APIs.

Limit: Dev or Full on Organization/Enterprise. Template approach recommended; existing SDS mappings are separate versioned inputs. Disposition: accepted.

### F7: Getting started with Code Connect CLI

[Figma source](https://developers.figma.com/docs/code-connect/quickstart-guide/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Before you begin; Requirements; Write template files.

Limit: Node 18+ and Code Connect Write/File content Read token scopes. Publishing mappings is an external write requiring project authority. Disposition: accepted.

### F8: Code Connect integration

[Figma source](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/). Accessed 2026-10-02. Official documentation. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: CLI mappings; UI mappings.

Limit: CLI snippets can omit imports if source/imports missing. UI mappings do not include full snippets by default. Disposition: accepted.

### F9: Simple Design System (alpha)

[Figma source](https://github.com/figma/sds). Accessed 2026-10-02. Official product/maintainer source. Complete relevant text via web tool. Publication/update: Not stated in inspected current body.

Evidence location: Structure; Connecting this repo to a duplicated Figma file.

Limit: README rechecked; historical 396-component inventory and node IDs not re-measured. Stage 2 must pin and inspect its chosen revision. Disposition: accepted.

## Claims

| ID | Guidance and targets | Support | Evidence and limits |
|---|---|---|---|
| C01 | Design is available in conversations, Artifacts and standalone; record which surface is used. Targets: Orientation; README; Setup. | A1, A8 | Documentation. No surface opened in stage 1. |
| C02 | Pro/Max/Team defaults and Enterprise enablement; Design, Design systems, and standalone controls are separate. Targets: Before you begin; Chapter 3; Setup; Checklist. | A1, A2, A3, A4 | Documentation. Tenant access and role assignment untested; A8 is less precise. |
| C03 | /design-login authorizes /design-sync; /design-sync converts and uploads React systems, with optional hint and potentially hours for first verification. Targets: Chapter 3; Setup; Prompt pack. | A5, A2 | Documentation. Upload effects and code conversion fidelity untested. Manual Design MCP registration is absent from current reviewed instructions; no claim that endpoint is retired. |
| C04 | /design drafts artboards, requires v2.1.265+, enabled Design template and artifact-capable session. Targets: Chapter 3; Setup; Prompt pack. | A5, A6 | Documentation. Broad A1 /design import/export/sync wording is not a detailed CLI contract. |
| C05 | Claude Code artifact publishing requires claude.ai login, supported plan/provider/policy; API-key-only sessions cannot publish. Targets: Before you begin; Setup; Checklist. | A6, A5 | Documentation. No credentials, settings or provider were changed. |
| C06 | React product systems use /design-sync; brand systems can be created in chat; manage Settings > Design systems. Targets: Chapter 3; Setup. | A2 | Documentation. Import correctness and exact source component reuse require samples. |
| C07 | Standalone organization onboarding/Published and integrated migration/default selection are separate paths. Targets: Chapter 3; Setup; Checklist. | A2, A3 | Documentation. No system published, default set, or migration performed. |
| C08 | Design exports include ZIP/PDF/PPTX/HTML and Code handoff; Google Slides is standalone-only; /design artboard PNG/PDF is a separate documented export. Targets: Chapter 9; Setup; Prompt pack; Handoff. | A1, A6 | Documentation. Actual export controls and usable package require stage 2; no native Figma export established. |
| C09 | Tutorial documents default bundle with files, chat and README plus URL prompt and Web option. Inspect actual contents before handoff. Targets: Chapter 9; Handoff; Checklist. | A7, A1 | Documentation. Default bundle content not observed; exactness and recipient access untested. |
| C10 | No Design version history yet; save request is documented but export reviewed baseline independently. Targets: Chapter 3; Prompt pack; Checklist. | A1 | Documentation plus author practice. No guarantee of reliable restore, complete history or conflict resolution. |
| C11 | Comments, multi-editor reliability, large repositories, mobile editing and incomplete imports have documented limits. Targets: Appendix E; Setup; Checklist. | A1 | Documentation. No runtime incidence tested. |
| C12 | Usage shares Claude limits, with no separate Design allowance; billing differs by Enterprise arrangement. Targets: Appendix E; Setup. | A1, A3 | Documentation. No price or tenant allowance inferred. |
| C13 | Persistent assets, unsupported Design residency and special-configuration restrictions need tenant review. Targets: Before you begin; Appendix E; Checklist. | A3 | Documentation. Tenant governance requirements unobserved. |
| C14 | Standalone audit logs unsupported; integrated artifact-level compliance recording is documented separately. Targets: Appendix E; Handoff. | A3, A6 | Documentation. Do not interpret as complete edit/comment event auditability. |
| C15 | Remote Figma plugin bundles server/skills; manual HTTP endpoint with /mcp OAuth is supported. Targets: Setup; Chapter 10. | F1, F2 | Documentation. No installation/authentication executed. |
| C16 | Figma read permission differs from native write; use_figma requires Full seat and edit permission for existing files. Targets: Chapter 2; Chapter 10; Setup; Prompt pack. | F3, F5 | Documentation. Historical Community account denial is not a universal editor-only read requirement. |
| C17 | Native write limits include 20kb responses, no image assets/custom fonts, manual component publication. Targets: Chapter 10; Appendix E; Setup. | F3 | Documentation. Limits are tool-specific, not blanket limits on all Figma workflows. |
| C18 | Code-to-canvas uses generate_figma_design; any seat in Drafts, Full+edit outside Drafts. Targets: Chapter 10; Setup; Prompt pack. | F4 | Documentation. Editable layers alone do not establish component instances or variable bindings. |
| C19 | Figma MCP quotas depend on seat/plan; check whoami and live limits. Targets: Setup; Checklist; Appendix E. | F5 | Documentation. No exact quota copied from ambiguous flattened table. |
| C20 | Code Connect eligibility differs from MCP access; template CLI is recommended, existing SDS mappings remain versioned. Targets: Chapter 2; Setup. | F6, F7, F9 | Documentation. No mapping publication or parser migration authorized here. |
| C21 | Code Connect CLI and UI supply different detail; sample imports/props/snippets rather than assume uniform completeness. Targets: Chapter 2; Handoff; Checklist. | F8 | Documentation. Actual sample response required. |
| C22 | SDS README still documents substitution URLs and file-key changes; verify node IDs in selected copy. Targets: Chapter 2; Setup; Appendix D. | F9, F7 | Documentation plus author practice. 396 components/19 pages and Table/Figma discrepancy retained as August snapshot, not current measurement. |
| C23 | Data Pipeline Studio is a fictional teaching scenario; worked example has not been executed by this refresh. Targets: Orientation; README; companion README. | A7 | Author scope statement. No prior rejected scaffold can serve as workflow evidence. |
| C24 | Keep export/import inspection separate from permission to edit a repository or publish a system. Targets: Prompt pack; Handoff; Checklist. | A5, A3 | Author practice. Guide prompts describe future authorized workflows; this stage only changes source. |
| C25 | Broad Design help and narrow CLI artboard guidance differ; test interactive behavior and export parity by surface. Targets: Orientation; Chapter 3; stage 2 handoff. | A1, A5, A6 | Unresolved documentation scope. Do not claim those surfaces are equivalent. |

## Research decisions

1. Prefer the current CLI command reference for command semantics. General Design help supports broader product intent, while the CLI pages specify artboard output and prerequisites. Surface parity remains an open test.
2. Keep /design-login because the current official command reference documents it. Remove manual registration of the Design MCP endpoint from required setup because current reviewed setup pages do not require it. Absence does not prove deprecation or endpoint failure.
3. Correct blanket editor-only Figma read claims. Preserve the historical access denial as an August observation; record read and write eligibility separately.
4. Keep the historical SDS metadata inventory labeled by cutoff. The README was reread, but its component dataset and the working file were not re-inventoried.
5. Treat secondary search results and user-reported GitHub issues as discovery only. No current capability claim depends on their bodies.
6. No dated post-August event is inferred from relative help-center update timestamps. The ledger records the observed current documentation, not an invented release date.
7. The old plans-access-and-permissions URL redirected without useful body; rate-limits-and-access returned a tool error. The official introduction linked the accessible rate-limits-access page used as F5.
