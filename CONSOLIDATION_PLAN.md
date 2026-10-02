# Consolidate the handbooks into one repository

Status: approved for execution in a new task on 2026-10-02. Mike directly authorized execution and preauthorized migration operations within `/Users/mike/handbooks`, on the `mikeylong` GitHub account, and in Vercel for `handbooks.surfaces.systems` and retirement of `handbooks.mikelong.ai`. The latter normalizes the typo in the authorization message. Preserve the recovery, validation, review, and rollback requirements below. Do not request repeat approval for the scoped operations, including repository creation, history import, commits, pushes, PRs, protected merges, deployment, legacy publishing retirement, and archival of former handbook repositories. Preauthorization does not permit bypassing protections or deleting preserved history and release assets.

## Outcome

Use one private GitHub repository, proposed as `mikeylong/handbooks`, with its canonical checkout at `/Users/mike/handbooks`. Keep the existing book, toolkit, and site folders. Version the root catalog, instructions, scripts, and configuration alongside the books. New work uses one repository and one review workflow.

The sole supported public website is `handbooks.surfaces.systems`. Stage, deploy, and validate only its existing Surfaces Vercel project. Retire legacy handbook publishing targets; do not maintain a second production host. Each handbook retains its own edition number and approved PDFs. Consolidation changes repository ownership and build wiring; it does not revise manuscripts, rebuild PDFs, or approve unpublished books.

## Intended layout

```text
/Users/mike/handbooks/                   one private Git repository
├── .github/workflows/                  collection CI
├── AGENTS.md                           collection instructions
├── README.md                           setup and routine commands
├── CONSOLIDATION_PLAN.md
├── catalog.json                        locations and publication eligibility
├── package.json                        build, preview, and validation commands
├── requirements.txt                    collection Python dependencies
├── scripts/                            collection validation and release tools
├── production-ai-engineering/
├── ai-consulting/
├── ai-evaluation/
├── claude-design/
├── candidates/
│   ├── assets/                         retained frozen assets
│   └── poisonous-mushrooms/
├── drafts/ai-product-design/
├── publish-evidence-backed-handbook/    specimen, templates, styles, and tooling
├── site/                               shared UI and public website build
├── migration/                          selected reports tracked; recovery data ignored
└── deployments/                        selected reports tracked; runtime data ignored
```

The Product Design application scaffold at `/Users/mike/ai-product-design-curriculum` remains a separate application project. Its handbook outline remains inside this collection. Existing compatibility links and historical task locations remain usable. No files move into iCloud-synced storage.

## Verified starting point

Inspected on 2026-10-02. All eight canonical repositories are clean on `main`. Recheck their state immediately before implementation; this snapshot is not a release gate.

| Folder | Current repository | Baseline commit |
| --- | --- | --- |
| production-ai-engineering | production-ai-engineering-book | `1ac55ab66a10ba9a446bface1824cb292c52cee6` |
| ai-consulting | ai-consulting-playbook | `fe59574e6c821481870167dd4659c41f2a4c0d25` |
| ai-evaluation | ai-evaluation-field-guide | `50e6b1e0279b3db0f0b9d41dec8e4fd1a96ba14a` |
| claude-design | claude-design-field-guide | `292399808de0b0c5df616c5912a7fa1cf39269e1` |
| candidates/poisonous-mushrooms | poisonous-mushrooms-handbook | `ece50e4f000ff1bbbe0f99a27accd08aaba37b91` |
| drafts/ai-product-design | ai-product-design-handbook | `ab2dc0f505310765e6f12484e4b7571acd044875` |
| publish-evidence-backed-handbook | publish-evidence-backed-handbook | `8d88ae4e7c1823ede8ec9b819ce0808e0f095ab1` |
| site | handbooks-site | `2d414d1e056a323b0dccbba6ce86f14d2b0c1c52` |

Current dependencies to replace:

1. `site/library.json` pins three external repositories and commits.
2. `site/scripts/book-sources.mjs` downloads those commits from GitHub and requires unique repositories.
3. Reader builders, publication metadata, and validators assume book-specific GitHub repository and release URLs.
4. The root instructions and `scripts/validate-repositories.py` require independent repositories and prohibit a root Git repository.
5. The Surfaces Vercel project currently builds the separate `handbooks-site` repository. Legacy handbook deployment connections must be retired.
6. Legacy scheduled reviews and task worktrees may address former repository roots or remotes. Inventory their exact configuration before changing ownership.

Engineering currently has linked worktrees at:

1. `/Users/mike/handbooks/ai-consulting/candidate-2026-10-01/site-repository`.
2. `/Users/mike/handbooks/migration/2026-10-02-independent-repositories/engineering`.
3. `/Users/mike/production-ai-engineering-book-margin-fix`.

## Phase 1: Record the baseline and recovery copies

1. Refresh repository state: commits, remotes, branches, tags, uncommitted files, worktrees, compatibility links, and task attachments. Identify active editors, builds, review workers, and deployment jobs before changing Git ownership.
2. Record hashes for approved PDFs, manuscripts, reader bodies, artwork, specimen files, and other frozen build inputs. Include private drafts and existing local-only history without publishing them.
3. Save restorable Git bundles or mirrors for all eight repositories, original Git metadata, and an inventory of tracked, ignored, and untracked files. Store recovery copies under an explicitly ignored migration directory. Verify bundles and test a restore.
4. Record the Surfaces Vercel project configuration, Git connection, deployed SHA, aliases, build settings, and known-good production deployment ID. Inventory legacy handbook deployment connections for retirement without including them in the supported build or QA matrix. Keep credentials and environment files out of reports and Git.
5. Verify that the Surfaces Vercel team can deploy from a private collection repository with the existing account access and hosting plan. Resolve any access limitation before importing histories; do not make private drafts public as a workaround.
6. Save a small baseline of all public routes, downloads, repository/release links, and current site output. Record existing failures separately.

Exit condition: every original repository and local file set has a verified recovery path. No originals have been removed or replaced.

## Phase 2: Assemble the monorepo in isolation

1. Build a disposable migration checkout before altering `/Users/mike/handbooks`. Preserve existing relative paths when importing all eight projects.
2. Import history from disposable copies, preferably by filtering each project's history into its retained directory. Namespace historical tags to prevent collisions. Preserve original commits in the recovery bundles and existing GitHub repositories, and record old-to-new commit mappings when filtering rewrites SHAs.
3. Inspect imported history as well as the current tree for secrets, private runtime data, large files, obsolete automation, and accidental duplicate active packages. A private repo still must exclude credentials. Check hosting file-size limits before choosing how to store any oversized approved artifact.
4. Add root docs, configuration, scripts, and this plan. Use an explicit staging list. Do not bulk-stage entire deployment or migration folders.
5. Add ignore rules for caches, environments, dependencies, proof renders, disposable builds, historical worktrees, and recovery copies. Explicitly retain approved PDFs, required reader packages, specimen files, canonical evidence, and frozen artwork. Avoid a blanket ignore of `output/` that would lose released PDFs.
6. Verify that the tracked tree contains ordinary files rather than submodules or nested Git links. Preserve frozen book assets without deduplicating fonts, illustrations, or styles during this migration.
7. Prepare the private `mikeylong/handbooks` remote after confirming the name is available. Implementation is authorized. Use the required fresh `mikeylong` account preflight for every GitHub operation.

Exit condition: one complete candidate checkout contains all intended content, usable history, and root files. Original repositories and public hosting remain operational.

## Phase 3: Simplify builds, metadata, and CI

1. Make `catalog.json` the collection inventory for directories and publication eligibility. Retain per-book release manifests and edition metadata as the authority for that book's approved package.
2. Have the website resolve local book folders from the catalog. Remove GitHub tarball fetching, source caches, independent-repository assertions, and the redundant external commit-pin list in `site/library.json`. Set catalog public URLs, canonical links, sitemap entries, generator defaults, and publishing guidance to `https://handbooks.surfaces.systems`.
3. Keep publication approval explicit. Published output must use approved HTML/PDF packages and declared asset hashes. A draft edit or newly generated reader must not become public merely because it lands on `main`. Check the HTML and artwork identities alongside the existing PDF checks.
4. Update reader generators and publication validators at their authoritative sources. Replace repository-specific checks with collection ownership, valid local paths, approved versions, hashes, and public-link checks. Preserve published reader bodies and PDF bytes.
5. Replace the root-Git prohibition with checks that every active source folder belongs to the root repository, expected files are tracked, and active source directories contain no child `.git` metadata or Git submodules. Historical worktrees and recovery data are explicitly excluded from that active-source check.
6. Update root and toolkit guidance that still assumes independent book repositories. Keep routine commands simple: `npm run validate`, `npm run build`, and `npm run preview`. Do not add a repository bootstrap or multi-repo synchronization tool.
7. Consolidate hosted CI at the root. Run collection validation, the existing published-book release checks, the site build, and existing navigation, search, and theme tests. Preserve existing draft validation commands where supported; report known baseline failures separately.
8. Audit scheduled reviews and release scripts to replace book-specific Git roots and remotes with collection ownership while retaining file paths. Preserve their review-only or release authority. Disable obsolete automation only after an equivalent replacement is verified, without generating new editions during the move.

Exit condition: a fresh clone builds and validates using tracked inputs and documented dependencies. The site requires no access to the former book repositories to obtain its source packages.

## Phase 4: Keep editions and public releases usable

1. Retain current book versions: Production AI Engineering v1.4.0, Evaluation v1.0.0, and Consulting v1.0.0. Do not bump an edition solely for repository consolidation when its distributed PDF is unchanged.
2. Use namespaced future release tags, such as `ai-consulting/v1.0.1`, in the collection repo. The tag identifies a collection commit; the corresponding book manifest identifies the released PDF and approved reader package.
3. Continue serving approved PDFs from the website. New edition details and versioned download paths must remain accessible without GitHub authentication. Private GitHub release pages cannot be the reader's download destination.
4. Update reader front matter and shared UI to remove inaccessible private source/release links. Preserve existing Surfaces reader and download paths and historical GitHub assets. New links must distinguish edition information on the website from private source access.
5. Test the published book list against an explicit allowlist. Claude Design, both mushroom candidates, the Product Design outline, internal evidence, and runtime records stay outside public output. Keeping the repository private does not by itself prevent a website build from exposing drafts.

Exit condition: public readers can reach every current handbook and PDF, release links work without authentication, and no draft or internal file appears in public output.

## Phase 5: Review and stage hosting

1. Push the isolated candidate to the private collection repo on a focused `codex/` migration branch. Require proportional hosted checks and one focused review. Fix actionable in-scope findings and rerun affected checks.
2. Validate private-repo integration for the existing Surfaces Vercel project. Confirm the team has access and that its settings can build `site/` with access to sibling handbook folders. Set the working directory and build/output paths explicitly; test Vercel's ability to read the sibling folders before choosing `site/` as a project root.
3. Stage the reviewed exact commit in the Surfaces project before changing production. Compare all approved PDF hashes and reader body/art identities against the baseline. Allow only intended changes to release links and hosting metadata.
4. Check gallery and all three readers on desktop and mobile: navigation, search, downloads, Light/Dark/System appearance, persistence, fonts, illustrations, and public release links. Verify the output inventory excludes private drafts and internal files.
5. Verify the concrete staged result before production cutover. Production deployment and former repository archival are preauthorized; proceed when the stated checks pass without requesting repeat approval.

Exit condition: hosted CI and focused review pass, the Surfaces staging deployment passes the targeted checks, and the exact candidate is ready for an authorized production switch.

## Phase 6: Switch local ownership and production

1. Arrange a short pause for writes by active tasks. Refresh the baseline and include any intervening work before installing the candidate.
2. Test the Git-metadata relocation and worktree repair procedure on copies first. Preserve linked worktree branches and any edits. Move original child Git metadata into ignored recovery storage, repair historical worktree references, and verify those worktrees remain usable. Do not remove linked worktrees or move their files to achieve a clean tree.
3. Install the verified root Git repository at `/Users/mike/handbooks` and reconcile only intended files against the candidate tree. All existing canonical book folders keep their paths. Each active book, toolkit, and site folder must resolve to the root Git repository.
4. Preserve historical task attachments. Check whether existing Codex task repository context needs rebinding or a documented recovery path before removing child ownership. Keep historical worktrees outside the new tracked tree.
5. With release authorization, merge through required checks and protections, connect the Surfaces Vercel project to the collection repo, and deploy the reviewed commit. Verify the actual deployed SHA, `handbooks.surfaces.systems`, routes, downloads, and appearance controls. Disconnect legacy handbook Git deployment connections and disable their scheduled or CI publishing jobs. Remove legacy handbook-only aliases after the Surfaces checks pass; preserve unrelated websites and project history.
6. Return the root checkout to clean `main`, tracking `origin/main`, with `HEAD == origin/main` and zero ahead/behind. Confirm the rollback assets remain available.

Exit condition: routine work uses one canonical repository; the sole supported host runs the verified collection commit, and legacy publishing jobs are disabled; original files and task links remain usable.

## Phase 7: Retire previous repositories

1. Record the new canonical source location in old repository READMEs or descriptions and add links from historical releases to the canonical edition details on the website without removing their assets.
2. Remove obsolete write-producing workflows and Git deployment connections after their replacements are verified. Audit integrations that still expect the toolkit or site to have separate remotes.
3. Archive the eight former repositories under the existing preauthorization after the new workflow and dependent references are verified. Preserve their original histories, tags, and release assets. Do not delete them as part of consolidation.
4. Keep Git recovery copies and local-only evidence according to an explicit retention decision. Future changes to handbooks, shared UI, and the toolkit all happen in the collection repo.

Exit condition: one active GitHub repo supports ongoing work; historical repositories remain available for existing references and audit.

## Rollback

1. Before local cutover, discard the isolated candidate and leave the current setup running.
2. If local cutover fails, restore the original Git metadata and worktree references from verified recovery copies. Reconcile migration-time edits explicitly; never overwrite intervening user work.
3. If hosting fails, restore the recorded Surfaces Git connection and build settings, then promote its recorded known-good production deployment. Verify `handbooks.surfaces.systems` and approved PDF hashes after rollback. Do not reactivate retired publishing targets during rollback.
4. Keep the former repositories writable until local and hosted cutover have passed. Archive them last so rollback does not depend on unarchiving or reconstructing source.

## Completion evidence

Implementation is complete when the migration report establishes:

1. A private collection repo exists, and a fresh clone contains all intended canonical source and root files.
2. The eight former source roots resolve to `/Users/mike/handbooks`; no active child repository or submodule remains.
3. Original histories are recoverable, imported history is usable, and original-to-imported commit mappings are recorded.
4. Approved PDFs, reader bodies, artwork, private drafts, specimen files, and selected historical evidence are preserved.
5. Collection CI and focused review pass. A deliberate private-draft publication attempt and altered approved artifact are rejected by negative tests that exercise the publication allowlist and artifact hash checks.
6. `handbooks.surfaces.systems` runs the reviewed collection commit, and public readers can reach every approved book and download without private GitHub access. Canonical links and the sitemap reference this host only. Legacy publishing connections and jobs are disabled; former hosts are outside the supported QA matrix.
7. Existing task worktrees, compatibility links, and review automation are verified or have an explicitly documented unresolved dependency. An unresolved dependency prevents a claim of full completion.
8. Old repository archival is reported accurately as completed or blocked by a specific dependency. No source or release asset has been deleted.
9. The canonical root is clean on `main`, tracking `origin/main`, with zero ahead/behind and `HEAD == origin/main`.

## Execution order

Complete baseline and recovery work first, then assemble and validate the candidate, review and stage hosting, apply the existing release authorization, switch local ownership and production, and archive the old repositories last. Keep each migration phase independently reviewable and stop on a specific failed exit condition.

The execution task starts with Phase 1. Repository creation, history import, local Git ownership changes, deployment, and archival are authorized but have not yet been performed at this handoff.
