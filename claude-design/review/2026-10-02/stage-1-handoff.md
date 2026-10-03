# Stage 1 handoff: Claude Design guidance refresh

The editable guidance now uses official documentation accessed October 2, 2026, replacing the August 5 product-guidance cutoff. Stage 1 implements the source refresh. The fictional Data Pipeline Studio workflow still needs hands-on testing in stage 2. No PDF was rebuilt and no publication is approved.

## Canonical source and review paths

The canonical book is `/Users/mike/handbooks/claude-design`. `/Users/mike/claude-design-field-guide` resolves to that directory. The collection catalog lists this title as `pdf-draft`; the retained PDF is not an approved previous edition.

| Changed canonical file | Main change |
|---|---|
| `/Users/mike/handbooks/claude-design/Claude_Design_Field_Guide_Source.md` | Integrated/standalone setup, command semantics, exports, Figma boundaries, governance, historical SDS labels, embedded templates/checklists |
| `/Users/mike/handbooks/claude-design/Simple_Design_System_Setup.md` | Copy/read/write access, Code Connect eligibility, built-in Design commands, surface prerequisites, separate Figma setup, baseline/export inspection |
| `/Users/mike/handbooks/claude-design/Claude_Design_Prompt_Pack.md` | Setup prerequisite, three system tests, draft authority, bundle inspection before edits, native-write/capture distinction |
| `/Users/mike/handbooks/claude-design/Claude_Design_Validation_Checklist.md` | Availability and observation fields, three system tests, baseline/export proof, tool-specific Figma checks |
| `/Users/mike/handbooks/claude-design/Claude_Design_Handoff_Template.md` | Surface/system/version/provider evidence, export inventory, access result, missing-content owners, repository edit scope, Figma branch evidence |
| `/Users/mike/handbooks/claude-design/README.md` | Product purpose and fictional-example limits; separates refreshed Markdown from retained August artifacts |
| `/Users/mike/handbooks/claude-design/Claude_Design_Field_Guide_README.md` | Source-candidate status and isolated-build instructions that preserve the original PDF |

All handoff evidence lives in `/Users/mike/handbooks/claude-design/review/2026-10-02/`:

1. [Claim ledger](./claim-ledger.md) and [machine-readable mappings](./claim-ledger.json) contain 18 official source records and 25 claim mappings, access dates, relevant source locations, limits, and accepted versus unresolved evidence.
2. [Baseline manifest](./baseline-manifest.json), [baseline source copies](./baseline-source/), and [preservation report](./preservation-report.json) establish artifact identity before and after edits.
3. [Exact source patch](./stage-1-source.patch), [exact source change record](./source-change-record.json), and [change explanation](./source-change-record.md) separate text changes from interpretation.
4. [Official source snapshots](./official-source-snapshots/manifest.json) record retrieval URLs, timestamps, HTTP status, and SHA-256 for all 18 sources. Raw HTML is stored beside the manifest for later rechecking.
5. [Source consistency results](./source-consistency-report.json), [validation script](./validate-stage1.py), and [editorial check record](./editorial-check-record.md), and [resolved consistency findings](./consistency-review.md) record the stage 1 checks.
6. [Isolated source candidate](./stage-1-candidate/manifest.json) freezes the seven revised Markdown files with hashes. It contains no candidate PDF; use a separate complete build copy in stage 3.

## Changes that affect the experiment

1. Record whether a test uses a conversation/Artifacts Design template, Claude Code `/design`, or standalone claude.ai/design. Enterprise Design, Design systems, and standalone access are separate controls.
2. Use `/design-login` and `/design-sync [hint]` for the documented React conversion/upload path. The optional hint names the system. First verification may take hours. Manual Design MCP registration is removed from required setup; no endpoint-retirement claim is made.
3. `/design` is documented in the CLI as artboards and requires v2.1.265+, an enabled template, and an artifact-capable claude.ai session. Broad Design help describes more extensive design/import/export behavior. Test interactivity and parity by surface.
4. Default handoff files/chat/README are documented, but actual export contents and recipient access must be inspected. Supply missing team-owned fixtures, state contracts, mappings, and tests before implementation.
5. Keep a reviewed baseline export outside the design session. The product does not yet provide version history.
6. Read access, native `use_figma` writing, `generate_figma_design` capture, and Code Connect have different eligibility rules. Captured editable layers do not establish component instances or variable bindings.
7. SDS component counts, node IDs, and the code/Figma Table discrepancy remain labeled August findings. Stage 2 must pin and re-inspect its chosen repository revision and working copy.

## Stage 2 questions and pass conditions

Every item below is unverified by stage 1. The priority describes the consequence of a failed test, not a measured product defect.

| Priority | Test / assumption | Required evidence and pass condition |
|---|---|---|
| High | Correct account, plan, provider, version, surface and system | Record actual prerequisites and tenant controls without exposing secrets. A valid Design/system destination is accessible; otherwise record exact blocker and an authorized fallback surface. |
| High | React system conversion/upload | Run the bounded approved `/design-login` and `/design-sync` workflow. Record package/revision, destination, duration/result, sample component/token identities and gaps. An error or partial upload does not pass. |
| High | Artboard/prototype behavior | Generate a bounded baseline on the selected surface. Execute required interactions and recovery states. Record screenshots plus action/results. If `/design` is static, use an appropriate authorized interactive path and preserve the distinction. |
| High | Three known-screen tests and correction persistence | Settings form, dense table, confirmation flow. Sample ten elements each, classify reuse/composition/cosmetic/invented/unverifiable, then regenerate a neighboring corrected state. All samples resolve or have approved scoped exceptions. |
| High | One connected worked-example journey | Import fixture, mapping repair, source node, valid connection, preview provenance, invalid connection/cycle rejection, save/run/failure/repair/re-run. Keep simulated behavior labeled and independent from production proof. |
| High | Real export/handoff | Record export surface/format/time, inventory, hashes for local files, file/chat/README completeness and authorized recipient access. Read the bundle before edits. No missing decision or fixture forces implementation to guess. |
| Medium | Baseline preservation and alternatives | Export a reviewed version, generate an alternative, and verify the baseline can still be opened. Record actual restore behavior; do not infer history from a save request. |
| Medium | Comments and coordinated state | Exercise one targeted comment/change, inspector/canvas/preview consistency, and viewport layouts. If a comment fails, record chat fallback and result. |
| Medium | Figma branch if needed | Pin SDS revision and inspect the editable working copy. Record `whoami`/seat/plan/file access, tool availability, mapping format and sample. For capture, verify layers versus actual instances/bindings. If unavailable, report this branch as blocked or out of scope; do not fail all Claude Design guidance automatically. |
| Medium | Governance and team handoff coverage | Confirm storage, retention, residency, special configurations, external-sharing scope, and audit coverage for the chosen surface with the owner. No organization settings or publishing/default changes are implied. |

The exact CSV rows and expected malformed-row results are not included in the current source package. Stage 2 must create and freeze a deterministic fixture in its isolated experiment, record expected transformations, and retain the same records across importer, preview, validation, and run evidence. The fixture remains a planned test input until stage 2 creates and exercises it.

No system publication, organization-default change, production repository release, third-party deployment, or new public handbook is authorized by this handoff. Stage 2 may test the separately authorized worked example; this chat does not begin it.

## Stage 1 validation and preservation

Stage 1 passes 47 source, evidence, scope, and preservation checks, with no failed source checks. The final status is recorded in [source-consistency-report.json](./source-consistency-report.json). Its source checks cover fences/directives, chapter and diagram markers, local links, obsolete default setup instructions, three-test consistency, claim mappings, evidence snapshots, authorized file scope, Git HEAD, and baseline preservation. The prose scanner is a candidate-finding tool; the editorial review triages its findings rather than treating zero hits as a pass.

The baseline manifest contains 352 files. Seven Markdown sources are authorized changes; the other 345 baseline files must remain byte-for-byte unchanged. This includes the retained PDF, ZIP, 22 artwork files, generation/QA records, builders, and 314 existing collection artifacts selected for preservation. The collection baseline covers PDFs in the existing public books and public/dist assets under site; it is not a claim to hash every collection file. The scoped book diff supplies the complementary source check. During final validation, the shared checkout also contained unrelated changes in `publish-evidence-backed-handbook/assets/reader/reader.css`, `publish-evidence-backed-handbook/references/specimen/manifest.json`, and `publish-evidence-backed-handbook/scripts/pdf-browser-check.mjs`. This stage did not edit those files. They are preserved and excluded from the saved source patch; no globally clean checkout is claimed.

Original PDF SHA-256: `4da564de91223f86c5d1e0fcf48e173bc99d4d3d057e96e917c46da6173e93cf`.

Original ZIP SHA-256: `e04ea1d93012ca2e77471907706661fb61ed6aa0be07edf36526e964c1abef8c`.

No live Claude Design/Code/Figma workflow test, PDF rebuild, PDF text comparison, Poppler/PDFKit rendering, push, merge, deployment, or publication was run. Those omissions are intentional stage boundaries. Stage 1 source checks do not establish workflow success or release readiness.

## Stage 3 packaging constraints to retain

The unchanged builder ignores frontmatter edition metadata and prints `August 2026 | Version 1.0`; chapter source-note numbers also need alignment with the new references. The unchanged validator fixes 109 pages and old chapter page locations. Before a later candidate is called ready, resolve those generator-owned labels and validation assumptions in the isolated build path, use a candidate-specific page map, and run the toolkit PDF/visual gates. Do not validate a new PDF against the August page map or overwrite the original PDF.

The catalog status is `pdf-draft`. There is no approved previous edition: edition/changelog decision is first-edition `not-applicable`. Any later comparison with the retained August PDF belongs to a peer-draft review record. Added integrated setup and command-prerequisite coverage suggest a minor content revision if a version is eventually assigned, but no release version or production approval is assigned here.
