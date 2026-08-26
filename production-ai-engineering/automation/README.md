# Weekly handbook review

The automation runs every Monday at 9:00 a.m. Mac local time, currently Pacific time.

Its primary job is to research live external sources for material production-AI industry updates, then produce a fully audited candidate handbook. It never edits or publishes the canonical handbook or production PDF.

The scheduled Codex task uses its native web tools for research. Two deterministic helpers surround that work:

1. `prepare-weekly-handbook-review.sh` creates the isolated run, snapshots the canonical manuscript, handbook, and fixed toolchain, exports the only three editable candidate files, records protected hashes, and resolves the last successful research checkpoint plus a seven-day overlap;
2. the already-running scheduled task searches current primary sources across model/API lifecycle, serving, context and retrieval, tools and agents, evals and observability, cost, safety, security, incidents, standards, and material original research;
3. it records every consulted, partially accessible, or blocked source and restricts accepted changes to accessible primary evidence;
4. `run-weekly-handbook-review.sh <exact-run-dir>` imports and validates those research artifacts, verifies candidate-only edit scope, and creates the exact source/data patch;
5. the finalizer creates a candidate-only changelog from validated changes, builds twice to stabilize pagination, validates the HTML and PDF, produces the PDF-text diff, and renders every physical page for proof;
6. the scheduled task then performs a read-only evidence, PDF, and release audit before reporting the result in the inbox.

Neither helper launches a nested Codex process or needs an unsandboxed execution exception. Preparation and finalization each run once; failures preserve the exact phase and log and are never retried automatically. Before building, the finalizer rejects any drift in the prepared handbook or toolchain snapshot and executes only the trusted canonical deterministic tools, never scripts from the research-writable run tree.

When live research finds no warranted reader-facing change, the candidate summary is exactly `The handbook's reader-facing content is unchanged.` and the PDF omits the changelog. Any validated change generates a populated changelog on its own dedicated physical final PDF page. The canonical `handbook/changelog.json` remains untouched; each candidate receives its own ledger tied to the candidate source hash and current production-PDF hash.

The exact PDF-text diff can still show generated-only differences for an unchanged candidate—its candidate run date and version suffix, line or page flow, and regenerated index page numbers. The final audit reports those separately and treats the source/data patch as the reader-facing change authority; any unexplained PDF-text difference fails review. The published edition keeps its publication date; a weekly candidate displays its own run date on the cover and in the sidebar.

Blocked or gated sources are reported with the access barrier, authorized methods attempted, legitimate public alternatives, and any resulting evidence limitation. The worker never bypasses a paywall, login, CAPTCHA, robots control, or permission boundary.

Each run is stored under `output/candidates/<timestamp>.<random-suffix>/`. The useful outputs are:

- `production-ai-engineering-<timestamp>.pdf`
- `run-summary.md`
- `status.txt`
- `change-report.md` and `changes.json`
- `coverage.json` and `release-recommendation.json`
- `sources.md`, `sources.json`, and `blocked-sources.md`
- `exact-changes.patch` and `review-status.json`
- `candidate-sha256.txt`
- `page-map.json`
- `previous-version.diff`
- `pdf-validation.log`
- `proof/manifest.txt`

If a phase fails, `status.txt` and `run-summary.md` name the exact failed phase and log. Partial artifacts are preserved, the candidate is not marked ready, and neither helper reruns itself. A per-run finalization sentinel rejects a second finalizer invocation.

The automation ID remains `weekly-production-ai-handbook-review` for continuity. Publication remains a separate manual decision after review.

## Production release contract

A candidate is not a release and does not change the root README. Every commit that updates `output/pdf/production-ai-engineering.pdf` also updates the README's visible version and publication date, the README's hidden PDF checksum, and `handbook/changelog.json`. The README keeps one stable link to the canonical PDF.

Run `npm run validate:release` before committing a release. The release-contract workflow repeats the check for pull requests, merge queues, and pushes to `main`. It verifies that the README identity matches the PDF cover, the hidden checksum matches the exact PDF, and the canonical changelog is aligned to the published PDF and manuscript. The GitHub rules for `main` should require this check and code-owner review so invalid releases cannot merge and the gate cannot be weakened without review.
