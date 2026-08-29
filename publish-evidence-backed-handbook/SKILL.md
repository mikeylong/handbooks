---
name: publish-evidence-backed-handbook
description: Research, create, revise, compare, validate, and prepare releases for evidence-backed PDF handbooks when editorial quality, a canonical visual system, exact change reporting, or cross-renderer reliability matters. Use for handbook production and maintenance, not generic one-off PDFs or publishing without explicit authorization.
---

# Publish Evidence-Backed Handbook

Produce a candidate handbook whose claims, editorial decisions, visual system, edition changes, and PDF behavior can all be audited. Treat research, authorship, candidate generation, release approval, and publication as separate scopes of authority.

## Non-negotiable contract

- Work from an editable canonical source. Never hand-edit a generated PDF.
- Preserve the target project's approved voice and visual system. Use this package's specimen as the default system only when no different house style governs the project.
- Before layout or illustration work, visually render `references/specimen/canonical-handbook-specimen.pdf`, consult `references/specimen/canonical-page-map.json`, and read `references/design-system.md`.
- When the governing visual system calls for raster illustration, prefer original art made with the host's image-generation skill. If generation is missing or unavailable and the user did not require original art, use only the provenance-gated public-domain or openly licensed fallback in `references/open-image-fallback.md`. Do not substitute deterministic SVG, HTML, CSS, or programmatic geometry for an illustration; reserve those methods for diagrams and other code-native visuals.
- Use primary or otherwise authoritative sources for factual updates. Record direct links, access dates, claim mappings, and limitations.
- Build into an isolated candidate location. Do not replace a production source or PDF, create a release, push, deploy, publish, bill, or contact readers without explicit authorization for that action.
- Compare the candidate with the approved previous edition at both source and extracted-PDF-text levels. If no approved previous edition exists, record the edition decision as first-edition `not-applicable`; a peer candidate may be compared for review, but it must not be presented as an approved edition.
- Include a final-page changelog only when reader-facing content changed. If the result is exactly `The handbook's reader-facing content is unchanged.`, omit the changelog page and its navigation entries.
- Validate the actual PDF, not only its source or build exit code. Require visual review and structural checks, including opaque illustration objects without masks or soft masks.
- Treat selected illustration files as frozen build inputs. Record acquisition mode and mode-specific provenance: prompt, references, and generation path for generated art; item page, creator, source, license, credit, and modifications for open-web art. Always record normalization and hashes before claiming the PDF build is reproducible.
- If any required phase fails, name the failed phase and evidence path. Do not claim the candidate or release is ready.

## Choose the operating mode

1. **Create or redesign:** establish the manuscript contract, then use the bundled design system or an explicitly supplied governing system.
2. **Research or update:** preserve the approved design and voice; change only claims supported by the evidence ledger.
3. **Build or repair:** preserve reader-facing wording unless content changes are explicitly in scope; repair the generator or PDF structure rather than patching the final artifact.
4. **Compare or review:** remain read-only unless fixes are requested; report exact and semantic changes separately.
5. **Release or publish:** proceed only with explicit release authority after every candidate gate passes.

## Workflow

### 1. Establish the contract

Identify the canonical source, previous approved PDF, candidate output path, intended audience, governing style, research cutoff, and authorized mutations. Record any unavailable or gated inputs before work begins.

### 2. Load only the references needed

- For layout, typography, illustrations, or templates, read `references/design-system.md` and inspect the canonical specimen.
- When new illustration is required or existing illustration is being replaced, read `references/illustration-workflow.md`. If its preferred image-generation path is missing or unavailable, or the user explicitly requests sourced open art, also read `references/open-image-fallback.md`.
- For authoring or substantive revision, read `references/editorial-quality.md`.
- For external research or claim changes, read `references/research-and-evidence.md`.
- For edition comparison, changelogs, versioning, or publication, read `references/edition-and-release.md`.
- Before calling a candidate ready, read `references/quality-gates.md`.

### 3. Research and edit

Build a claim-level source ledger before changing factual content. Distinguish direct evidence, author synthesis, inference, and unresolved uncertainty. Never use an inaccessible source as verified support merely because its title or snippet appears relevant.

### 4. Acquire and freeze required illustration

Classify the art change before acquisition. A create or redesign under the bundled visual system requires chapter-opener raster illustration. A text-only update preserves approved art, and a build repair replaces art only when the illustration defect is in scope. Follow `references/illustration-workflow.md`: prefer generation, then use the documented open-image fallback only when generation is missing or unavailable, or when the user explicitly requests sourced open art. Inspect and select each image, normalize it into an opaque project asset, and record mode-specific provenance and hashes. If neither path yields a license-compatible, accurate, style-matched asset, fail the illustration gate. Never conceal the missing capability with a vector stand-in.

### 5. Build reproducibly

Generate the PDF from the frozen manuscript, styles, and selected illustration assets using a recorded toolchain. Determinism begins after creative asset selection; it does not replace that selection. Stabilize any page map before finalization. Add metadata, outlines, page labels, running furniture, and links through the generator or a reproducible post-processing step. Preserve the input PDF version when post-processing uses features from that version.

### 6. Compare editions

When an approved previous edition exists, first build a comparison candidate without a newly generated changelog. Use `scripts/compare-editions.py` or an equivalent exact comparison, passing the previous-edition and candidate-specific page maps. The exact PDF-text patch must retain all surfaces, while the reader-facing decision must compare substantive content after excluding changelog pages and derivative navigation surfaces. Keep machine diffs separate from the human change ledger. Classify every accepted reader-facing change as an addition, deprecation or removal, or correction or clarification, and attach its rationale and direct sources. When no approved previous edition exists, record a first-edition `not-applicable` decision; keep any peer-candidate comparison in a separate review ledger.

### 7. Decide, then rebuild

Run `scripts/decide-changelog.py` against the exact comparison and accepted ledger when an approved previous edition exists. When reader-facing content changed, rebuild with a concise final-page changelog from accepted ledger entries. When it did not change, rebuild with no changelog page or navigation entry. For a first edition, use a `not-applicable` decision with no changelog surfaces; do not falsely label peer-candidate differences as unchanged edition content. A production-only rendering or compatibility fix may still warrant a patch release, but it does not create a reader-facing changelog entry.

Generate a candidate-specific page map after pagination stabilizes. Never validate a release candidate against the specimen page map.

### 8. Validate and inspect

Run `scripts/validate-pdf.py` in `candidate` profile with the final PDF, candidate-specific page map, and changelog decision. The page map must mark every required illustration placement so validation fails when an opener has no raster image, more than one image paint, a mask, or insufficient effective resolution. Re-run edition comparison on that final PDF and confirm the decision remains stable. Then render every page with `scripts/render-proof.py`, inspect a full contact sheet, and compare representative candidate pages with the specimen roles in the page map. Use `scripts/render-pdfkit.swift` when Apple PDFKit evidence matters. Automated checks do not replace perceptual review in at least two independent PDF renderers when cross-viewer support matters.

### 9. Report or release

Return the candidate PDF and direct paths to the source ledger, exact diffs, change report, validation report, visual proof, and release manifest. State the recommended version bump, gated-source limitations, failed or unverified checks, and whether production remained unchanged. Release only after separate authorization.

## Fallbacks and edge cases

- When new raster illustration is required but image generation is missing or unavailable, try the provenance-gated open-image fallback unless the user explicitly requires original generated art or forbids web acquisition.
- When generation exists but is not authorized, use sourced open art only when that acquisition is separately within the user's authorized scope; otherwise stop.
- If no candidate has a verified reusable license, sufficient resolution, accurate subject, and perceptual fit with the governing system, preserve any valid partial manuscript and report the failed illustration gate; do not claim candidate readiness.
- When approved frozen art already exists and the authorized task is text-only or a non-art repair, preserve its bytes and do not call image generation.
- When a project-specific visual system conflicts with the bundled specimen, record the project system as governing and follow it.
- When selected art from either acquisition mode fails accuracy, style, opacity, resolution, placement, rights, credit, or PDF paint checks, iterate or stop; never weaken the gate.

## Behavior patterns

- **New illustrated handbook:** inspect the governing specimen, prefer one generated image per required placement, or acquire one verified open image per placement when generation is unavailable; select and freeze assets, then build and validate from those files.
- **Text-only update:** revise evidence-backed prose and ledgers, preserve illustration hashes, rebuild, compare, and validate.
- **Non-art PDF repair:** fix the editable source or generator, preserve reader-facing wording and art hashes, and omit a reader-facing changelog when substantive content is unchanged.
- **Read-only review:** inspect source, page map, validation, and rendered proof; do not mutate or regenerate assets.

## Runtime execution

These instructions describe capabilities, not branded agent tools. Use the host environment's available browser, renderer, shell, research, and file APIs. All package paths are relative to this directory. Runtime adapters may explain invocation, but must not redefine the editorial, design, evidence, validation, or release contract.

Use Python 3.9 or newer in an isolated environment, install `requirements.txt`, and run `scripts/preflight.py` before canonical builds. Use `scripts/package-skill.py` for a normalized distribution archive. If both approved illustration acquisition paths are unavailable or fail their gates, report the missing gate instead of silently weakening it.
