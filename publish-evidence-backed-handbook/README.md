# Publish Evidence-Backed Handbook

**A reusable publishing standard for handbooks that need to stay accurate, coherent, and trustworthy over time.**

Most handbook workflows are good at producing a PDF once. Keeping the publication current is harder. Sources age. New material gets added without a clear reason. The visual system drifts. A PDF that looks right in one viewer can break in another. By the next edition, nobody can say exactly what changed or why.

Publish Evidence-Backed Handbook gives authors, editors, and teams using AI a shared standard for creating and maintaining technical publications. It connects research, writing, design, edition history, and release decisions so the final handbook can be inspected as carefully as it was written.

## What it helps you produce

- A reader-focused handbook organized around decisions, tradeoffs, failure modes, and practical action.
- Claims mapped to direct, authoritative sources.
- A coherent visual system that holds together across chapters and editions.
- Illustrations and diagrams that retain their intended form in print and common PDF viewers.
- A clear account of what changed, why it changed, and which sources warranted the update.
- A reviewable release candidate that leaves the current edition untouched until publication is approved.

## What it protects

| Publishing risk | Product standard |
| --- | --- |
| Claims become stale or unsupported | Factual updates are tied to direct sources, access dates, and known limitations. |
| New information turns into unnecessary content | Every proposed change must help the reader make a decision or take action. |
| The book slowly loses its visual identity | A canonical example PDF anchors typography, page rhythm, diagrams, illustrations, and back matter. |
| A PDF works in one viewer and fails in another | The finished artifact is reviewed for visual, structural, print, and cross-viewer quality. |
| Edition changes are difficult to explain | Each candidate is compared with the approved edition at both source and reader-facing levels. |
| Publishing overwrites trusted work | Candidate creation, approval, and publication remain separate decisions. |

## The design system is part of the product

The repository includes a [canonical handbook specimen](references/specimen/canonical-handbook-specimen.pdf). It is the visual reference for the full publication, including the cover, contents, chapter openers, narrative pages, tables, diagrams, source notes, index, and changelog.

The specimen gives an agent something concrete to inspect. Typography, spacing, hierarchy, illustration treatment, and page density do not have to be recreated from a written description or guessed from a few screenshots.

The default style is a restrained, monochrome A5 field guide: book-like, practical, and designed for sustained reading. A project with its own established visual system can use that system instead.

## Evidence comes before updates

A new industry announcement does not automatically belong in the handbook. Research becomes a candidate change only when the source is strong enough, the claim matters to the reader, and the proposed wording improves the publication.

The process keeps documented facts, author synthesis, inference, and unresolved uncertainty distinct. Partial or gated sources remain visible as limitations rather than being treated as verified support.

## A changelog readers can use

When reader-facing content changes, the handbook ends with a concise changelog covering:

- additions;
- deprecations or removals;
- corrections or clarifications.

Each entry explains what changed, why the change was warranted, and which sources support it. When the reader-facing content is unchanged, the handbook does not add an empty changelog page.

## Built for ongoing ownership

The same standard supports the full life of a handbook:

- creating a new publication;
- researching and updating an existing edition;
- repairing visual or PDF problems without rewriting the content;
- comparing editions and reviewing exact changes;
- preparing an approved candidate for release.

The package is platform-agnostic and can be adapted to the agent and publishing tools already in use.

## Who it is for

Publish Evidence-Backed Handbook is suited to authors, researchers, subject-matter experts, and product or engineering teams responsible for publications that readers rely on over time. Typical uses include technical field guides, operating handbooks, research-backed industry guides, and recurring publications that need a defensible update history.

## What success looks like

- Readers can tell what to do with the material.
- Factual claims can be traced to their sources.
- Synthesis and inference are labeled honestly.
- Every page feels like it belongs to the same book.
- Illustrations render as intended in supported viewers.
- Every edition has an exact, explainable history.
- The current publication remains unchanged until an approved candidate is ready to replace it.
