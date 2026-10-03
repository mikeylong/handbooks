# Exact source change record

The seven canonical Markdown files contain the October 2 guidance candidate. The original PDF, ZIP, artwork, generation records, builder and validator are unchanged. [The exact patch](./stage-1-source.patch) and [before/after hunk record](./source-change-record.json) establish every accepted wording change.

The collection lists this book as pdf-draft. First-edition changelog comparison is not-applicable; the August PDF is a peer draft. A later content version may warrant a minor revision for added setup coverage. No release version is assigned.

| Group | Category and reader consequence | Claim mappings |
|---|---|---|
| G1 | Correction or clarification. Separate documented capabilities from worked-example proof and identify surface/availability requirements. Reader chooses a supported surface and records prerequisites before generating. | C01, C02, C05, C23, C25 |
| G2 | Correction or clarification. Use current built-in command semantics and separate React, brand, migration and standalone setup. Reader scopes conversion/upload and does not require unsupported manual endpoint registration. | C03, C04, C06, C07 |
| G3 | Addition. Turn documented export/handoff expectations into an observed inventory and access check before edits. Engineering receives actual decisions and files, with missing content assigned. | C08, C09, C24 |
| G4 | Correction or clarification. Carry no-version-history and tool limits into baseline preservation and prompt behavior. Alternatives preserve an exported, opened reviewed baseline. | C10, C11 |
| G5 | Correction or clarification. Separate integrated and standalone governance, usage, and audit coverage. Tenant requirements are confirmed with the owner without inferring event-history coverage. | C13, C14, C12, C02 |
| G6 | Correction or clarification. Use documented Figma remote native-write and capture paths with their different seat/file limits. Reader can identify eligibility failures and inspect layer/component identity. | C15, C16, C17, C18, C19 |
| G7 | Correction or clarification. Distinguish Code Connect eligibility/formats and label SDS metadata by its historical cutoff. Reader pins and samples the selected mapping/code/file revision. | C20, C21, C22 |
| G8 | Correction or clarification. Align prompts, gate table and checklist: three known-screen tests, applicable branches, and Hold for missing identity. A named owner does not substitute for evidence; unrelated setup branches can be not applicable with reasons. | C24 |
| G9 | Correction or clarification. Separate candidate Markdown from retained August PDF/ZIP and prevent accidental canonical rebuild. Reader can find current guidance while original artifacts remain untouched. | C23, C24 |

Direct source URLs and limitations for each group appear in the JSON record and [claim ledger](./claim-ledger.md). Each file record contains baseline/candidate SHA-256, exact old/new text, line locations, and semantic group references. Group references explain the hunk; the exact patch remains authoritative for which words changed.

## Changed files

| Canonical filename | Exact change blocks | Candidate SHA-256 |
|---|---:|---|
| [Claude_Design_Field_Guide_Source.md](/Users/mike/handbooks/claude-design/Claude_Design_Field_Guide_Source.md) | 33 | `7ef21a139250c6fa993ead76036d747b029857981ca408c5b8a21e76b5539c0a` |
| [Simple_Design_System_Setup.md](/Users/mike/handbooks/claude-design/Simple_Design_System_Setup.md) | 13 | `0ed3132d5677ac06a341ab1eb5fd9bf29baac3da5d706f30723dc21b4c0f4517` |
| [Claude_Design_Prompt_Pack.md](/Users/mike/handbooks/claude-design/Claude_Design_Prompt_Pack.md) | 9 | `df05b30c3abd9ef25255e24bd8f1fa75b3ef70de76e344b45db7c9bea25a96f9` |
| [Claude_Design_Validation_Checklist.md](/Users/mike/handbooks/claude-design/Claude_Design_Validation_Checklist.md) | 6 | `fdd1e42e0ebe31660f3a60d314b3bdb2baa10b470870a48045c44342000626f1` |
| [Claude_Design_Handoff_Template.md](/Users/mike/handbooks/claude-design/Claude_Design_Handoff_Template.md) | 2 | `b65b279e68bd29ca9fa6bdab2f5c1a878c64384b6fcdbc5528ce2233c1a8fdf5` |
| [README.md](/Users/mike/handbooks/claude-design/README.md) | 3 | `a29ab13e82a2524b2f6342daaad313dd35e2774474757269d766b4735ad6b125` |
| [Claude_Design_Field_Guide_README.md](/Users/mike/handbooks/claude-design/Claude_Design_Field_Guide_README.md) | 4 | `b57335aac19b3f0e7eafefb0df237dc3d35a2319bf5975cd1394bd4449107973` |

## Preserved and deferred

1. The baseline manifest and preservation report cover all 38 original book files plus 314 selected collection artifacts. Seven book Markdown files changed; 345 protected baseline files retain their bytes.
2. No artwork preparation, PDF generation, ZIP packaging, publication, push, merge, or deployment ran. No new illustration, page map, or release approval is implied.
3. The unchanged builder prints the August cover edition and contains chapter source-note references. The validator expects the original 109-page layout. Stage 3 must resolve those assumptions in an isolated candidate, with toolkit PDF gates and independent renders before any readiness claim.
4. Stage 2 must test the surface, sync, component identity, interactions, baseline export, and actual handoff described in [stage-1-handoff.md](./stage-1-handoff.md). Documentation support is not observed success.
