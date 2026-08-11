# Project authority

Use this reference to distinguish current product truth from rollout assumptions. Reinspect the named files before relying on counts, dates, links, or release status because generated artifacts can change.

## Product authority

- `README.md` describes the current public product surfaces and links to the companion site and PDF.
- `output/pdf/production-ai-engineering.pdf` is the current published PDF artifact.
- `handbook/index.html` is the generated companion site. Do not hand-edit it for rollout work.
- `handbook/build-handbook.mjs` and `handbook/app.js` define generation and client behavior. Inspect only unless the user separately authorizes product implementation.
- `automation/README.md` defines the weekly candidate-review process.
- `automation/automation.toml` is schedule authority.
- `automation/memory.md` records completed automation activity when present.

## Current baseline to verify

At the skill's creation on July 19, 2026:

- The README described the full illustrated handbook as publicly readable and linked directly to the PDF.
- The PDF was described as a 74-page A5 edition with bookmarks, citations, and an index.
- The weekly automation ran Monday at 9:00 a.m. local time.
- Each automation run created an isolated candidate and review evidence without changing the published edition.
- The site and PDF could publish together only after manual approval.

Treat those as a dated baseline, not permanent truth. A paid rollout must explicitly decide what remains public, what becomes subscriber-only, and what URL replaces every direct public download.

## Product promise versus candidate content

- A claim about the current book must be supported by the published handbook or PDF.
- A claim about a future update may describe the process and cadence, but must not imply that an unapproved candidate has shipped.
- Candidate research, draft citations, and review reports are internal evidence until promoted through the existing manual gate.
- Marketing may quote or adapt published material, but should link claims back to the published source and clearly label excerpts.

## Rollout file boundary

Place durable rollout work under `marketing/`:

- `marketing/rollout-state.md` — current stage, decisions, assumptions, approvals, and next action.
- `marketing/launch-brief.md` — approved offer, audience, rollout steps, owners, and launch gates.
- `marketing/scorecard.md` — metric definitions, targets, observations, and decisions.
- `marketing/campaigns/` — dated draft campaign bundles containing no recipient PII.

Do not place email lists, customer names, payment data, credentials, private interview transcripts, or exported analytics with personal identifiers in the repository.

## Evidence labels

Label material decisions with one of these markers:

- **Fact:** confirmed in a current authority file or observable system.
- **Evidence:** directly observed customer behavior or sanitized research.
- **Assumption:** reversible working choice made to keep planning moving.
- **Decision:** explicitly approved choice with approver and date.
- **Unknown:** unresolved input that may block a gate.
