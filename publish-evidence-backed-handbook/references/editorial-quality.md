# Editorial quality contract

## Voice

Write like an experienced practitioner explaining how to make decisions under production constraints. The voice is calm, precise, direct, and evidence-aware. Prefer concrete operating language over hype, futurism, vendor promotion, or motivational filler.

Use short declarative sentences when stating a rule. Use longer prose only to explain tradeoffs or causality. Define important terms on first use and preserve distinctions that change implementation decisions.

## Reader progress

Each chapter should help the reader perform a job:

- understand the system boundary;
- choose between meaningfully different approaches;
- recognize failure signals;
- implement a contract or control;
- measure whether the intervention worked.

Organize sections around decisions, not around an inventory of technologies. A strong sequence is: problem, deciding facts, operating model, implementation guidance, failure modes, measurements, and sources.

## Claims and synthesis

- Attach citations to factual, quantitative, standards-based, vendor-specific, or time-sensitive claims.
- Mark author synthesis when multiple sources are combined into a new framework, sequence, matrix, or recommendation.
- Label inference as inference. Do not present governance conclusions or expected behavior as documented guarantees.
- Preserve uncertainty when evidence is incomplete or sources conflict.
- Avoid invented quotations, statistics, benchmark results, customer stories, and implementation guarantees.

## Examples and practical tools

Examples should expose a real contract, state transition, budget, checklist, matrix, or failure path. Avoid examples that merely repeat surrounding prose in a box.

Code and schemas must be internally coherent and safe enough to teach from. State what is illustrative, pseudocode, provider-specific, or incomplete. Consequential actions require authorization, validation, idempotency, and result verification outside model prose.

## Editing standard

- Remove repeated introductions, throat-clearing, generic summaries, and adjacent sections that make the same point.
- Prefer exact nouns and verbs. Replace vague terms such as "optimize," "smart," or "best" with the measured outcome or constraint.
- Keep acronyms, capitalization, labels, and units consistent.
- Use parallel construction in lists and tables.
- Make every table's comparison axis explicit.
- Keep captions and headings descriptive rather than clever.
- Preserve a stable hierarchy and numbering scheme across editions.

## Acceptance questions

Before approving a section, confirm:

1. What decision or action becomes easier for the reader?
2. Which claims require sources, and are those sources direct and current enough?
3. What distinction would cause a different implementation choice?
4. What failure mode or tradeoff is easy to miss?
5. Does the example demonstrate the rule rather than decorate it?
6. Is synthesis clearly separated from documented fact?
7. Can any paragraph be removed without loss?
