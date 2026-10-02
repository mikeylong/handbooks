# Handbook migration: October 1, 2026

The collection now lives at `/Users/mike/handbooks`. Six titles are cataloged: one published handbook, three PDF drafts, one handbook with two unapproved candidate variants, and one curriculum outline.

## Transfers

| Original location | Collection location | Handling |
| --- | --- | --- |
| `/Users/mike/production-ai-engineering-book` | `production-ai-engineering/` | Full repository moved; original path is a compatibility symlink |
| `/Users/mike/claude-design-field-guide` | `claude-design/` | Full repository moved; original path is a compatibility symlink |
| `/Users/mike/Codex/2026-08-04/ev/{assets,work,outputs}` | `ai-evaluation/` | Authoring folders moved; original component paths are compatibility symlinks |
| `/Users/mike/Codex/2026-08-11/cre/{work,outputs}` | `ai-consulting/` | Authoring folders moved; original component paths are compatibility symlinks |
| Publishing toolkit mushroom candidate fixtures and PDFs | `candidates/poisonous-mushrooms/{generation-a,generation-b}/` | Working copies transferred; tracked fixtures and repository preserved |
| Publishing toolkit print styles and fonts | `candidates/assets/design-system/` | Verified snapshot preserves the candidates' existing relative style imports |
| `/Users/mike/ai-product-design-curriculum/docs` | `drafts/ai-product-design/docs/` | Documents moved with a compatibility symlink; application scaffold remains in place |

The dated task folders retain their unrelated and historical scratch files. The Production AI move preserved the entire directory, including local dependencies and historical build data. No files were deleted to reduce storage.

## Repairs

1. Consulting now imports the sibling Evaluation builder through a relative path.
2. Both mushroom builders write to their own candidate output directories and resolve the existing sibling publishing toolkit. `HANDBOOK_PUBLISHING_TOOLKIT` provides an explicit override.
3. Git worktree repair ran after moving the Production AI checkout. The existing linked worktree still resolves its common repository and retains its original HEAD.
4. The installed weekly review automation now uses `/Users/mike/handbooks/production-ai-engineering/`. Its schedule, model, reasoning effort, project target, and review policy remain unchanged. Its historical v1.3.1 protected-PDF reference was retained; edition-policy changes are outside this migration.

## Validation

| Check | Result |
| --- | --- |
| Transfer inventory | Every recorded entry matched immediately after transfer |
| Final collection check | PASS: 50,993 preserved entries checked, three repaired builder paths verified |
| Repository identity | Original HEADs, remotes, and worktree status retained; linked worktree resolves |
| Production AI | Gallery build, handbook validation, and release contract passed; published PDF checksum unchanged |
| Claude Design | Isolated rebuild: 109 pages; text matches original; PDF geometry, links, and artwork validation passed |
| AI Evaluation | Isolated rebuild: 94 pages; text matches original; bounds, required content, and links passed |
| AI Consulting | Isolated rebuild: 128 pages; text matches original |
| Mushroom Generation A | Isolated rebuild: 20 pages; text matches original; structural PDF and illustration checks passed |
| Mushroom Generation B | Isolated rebuild: 20 pages; text matches original; structural PDF and illustration checks passed |
| Weekly review | Runtime preflight passed; no weekly research or finalization run was launched |
| Localhost reader | Gallery opens the reader; latency search returns results; close and browser Back restore the gallery |
| Local and live routes | Gallery, reader, and published PDF return HTTP 200 and match the migrated build byte for byte |

All PDF rebuilds went into `validation/`; the existing released and candidate PDFs were preserved. Rebuild checks do not approve draft publication. The structural mushroom checks do not establish new visual or Apple PDFKit approval.

[Collection validation](validation/collection.json), [PDF build checks](check-pdf-build.py), [HTTP checks](validation/site-http.json), [original inventory](inventory.json), and [path changes](build-path-changes.json) retain the verification evidence. The source inventory excludes Git metadata from the final content comparison and verifies repository identity separately; the rebuilt public-site output is checked through its routes.

## Open the workspace

Add `/Users/mike/handbooks` through Codex's Add project control. Project registration was not completed automatically: the available app tools cannot add a project, and computer control of Codex is blocked.

The former Production AI project path is now a compatibility symlink. Terminal commands and existing file references resolve through it, but Codex's sandbox rejects a symlinked writable root. Open the new collection path for future work rather than continuing in an old-path sandbox.

The live gallery, existing book URL, and PDF URL remain unchanged. No repository was renamed or pushed, no deployment was created, and no draft was added to the public gallery. The localhost preview serves the rebuilt public output from the new location at `http://localhost:4181/`.
