# Handbooks workspace

This private collection uses one `mikeylong/handbooks` repository. Keep existing book, toolkit, and site paths. Former repositories are historical archives.

- Work in the selected book directory. Preserve original histories, recovery copies, and linked worktrees during the approved Git ownership migration.
- All active source folders belong to the root repository. Do not create nested repositories or submodules. Retained historical worktrees and migration recovery data are ignored.
- Use catalog.json for locations and publication status. Production AI Engineering, AI Evaluation and AI Consulting are currently in the public gallery at handbooks.surfaces.systems. Moving or rebuilding a draft does not approve publication.
- Preserve released PDFs, evidence, illustrations, generation records, and historical review outputs. Build migration checks into migration/2026-10-01/validation instead of overwriting released PDFs.
- The mushroom folders are working copies of tracked publishing-toolkit fixtures. Preserve the original fixtures and toolkit Git history. The toolkit lives at publish-evidence-backed-handbook/ inside this workspace; the old /Users/mike/publish-evidence-backed-handbook path remains a compatibility link. HANDBOOK_PUBLISHING_TOOLKIT can override its location.
- The AI Product Design outline lives here; its application scaffold remains in /Users/mike/ai-product-design-curriculum.
- Keep outputs outside iCloud-synced Documents/Desktop. Preserve the original-location compatibility links while existing tasks and references use them.
- For GitHub operations, inspect and verify the required active gh account immediately before each command. Personal repositories use mikeylong; DevClarity owners use mlong-devclarity.

- The only supported handbook publishing target is handbooks.surfaces.systems. Future handbook builds, canonical URLs, deployments, and live QA must use the Surfaces project. Do not publish to legacy handbook hosts. Preserve unrelated websites; retirement of legacy handbook deployment connections is part of CONSOLIDATION_PLAN.md.

## Handbook skill

For handbook creation, research, revision, comparison, validation, or release preparation, use [publish-evidence-backed-handbook](publish-evidence-backed-handbook/SKILL.md). Read the references needed for the selected mode, and preserve each handbook's governing voice, design system, and authorization boundaries.

## Repository ownership

The approved target is one active private Git repository at `/Users/mike/handbooks`, including books, toolkit, site, and root files. Keep each book's manuscript, evidence, edition metadata, and released PDF package in its own folder. Preserve the former repositories as historical archives after verified cutover; do not delete their histories or releases. The following list records the pre-migration repositories, not a requirement to retain separate active repos.

- Production AI Engineering: `production-ai-engineering/`, mikeylong/production-ai-engineering-book.
- AI Evaluation: `ai-evaluation/`, mikeylong/ai-evaluation-field-guide.
- AI Consulting: `ai-consulting/`, mikeylong/ai-consulting-playbook.
- Claude Design: `claude-design/`, mikeylong/claude-design-field-guide.
- Mushroom candidates: `candidates/poisonous-mushrooms/`, private mikeylong/poisonous-mushrooms-handbook.
- Product Design outline: `drafts/ai-product-design/`, private mikeylong/ai-product-design-handbook.

The shared gallery, navigation, reader chrome and appearance implementation currently live in `site/`, formerly the separate mikeylong/handbooks-site repository. The approved migration folds this folder into the collection repo and replaces external source fetching with approved local book packages. Public source/release links must remain usable without private-repository access. Preserve historical drafts, review records, original releases and task worktree links. All scoped migration, protected merge, deployment, legacy publishing retirement, and former-repository archival operations are preauthorized by Mike's direct execution request; do not request repeat approval for them. Never bypass protections or publish unapproved drafts.
