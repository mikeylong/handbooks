# Weekly handbook review

The Codex automation runs every Monday at 9:00 a.m. in the Mac's local time zone.

Each run:

1. copies the canonical handbook into an isolated candidate directory;
2. searches current primary sources for additions, deprecations, corrections, and material gaps;
3. tracks accessible and blocked sources;
4. creates a candidate PDF with a run-unique candidate-version suffix;
5. produces exact source and PDF-text diffs;
6. runs structural, PDF, citation, index, and visual checks;
7. writes a final review task and report without changing the published edition.

Run artifacts are stored under `output/candidates/<timestamp>/`. Each run includes the candidate PDF, `exact-changes.patch`, `change-report.md`, `changes.json`, `sources.md`, `sources.json`, `blocked-sources.md`, `review-status.json`, and validation logs.

The research agent can edit only the manuscript and declarative citation/index JSON. The build and validation toolchain is snapshotted before research and never made writable to that agent. A final reviewer writes into a separate proof directory, and before/after hashes detect any candidate or production drift.

The automation ID is `weekly-production-ai-handbook-review`. Its worker is `automation/run-weekly-handbook-review.sh`.

The task uses authorized access and public alternatives for gated sources. It does not bypass paywalls, authentication, CAPTCHAs, or permission boundaries.
