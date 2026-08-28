# Edition comparison and release policy

## Compare before summarizing

Use both forms of exact comparison:

1. Canonical-source diff establishes authoring changes.
2. Extracted-PDF-text diff establishes reader-facing wording and sequence changes after generation.

Also compare page count, page geometry, outlines, links, images, fonts, and metadata. Binary PDF hashes prove artifact identity but do not explain whether reader-facing content changed.

Use a two-stage build so the changelog cannot determine its own necessity:

1. Build a comparison candidate without a newly generated changelog.
2. Compare the previous edition and comparison candidate using their own page maps.
3. Exclude changelog pages and derivative contents, index, and changelog-bookmark surfaces only from the reader-facing decision projection. Preserve them in the exact raw PDF-text diff.
4. Decide the changelog from the substantive comparison and accepted ledger.
5. Rebuild the final candidate with the required changelog state.
6. Validate the actual final PDF against the decision, then re-run the comparison to prove the decision is stable.

The canonical specimen page map describes only the canonical design specimen. Every candidate needs its own stabilized page map with `artifactProfile: "candidate"`; page count and conditional roles must never be inferred from the specimen.

Keep machine diffs and semantic interpretation separate. An agent may classify accepted hunks, but must not describe an addition, removal, or correction that is absent from the exact evidence.

## Change ledger

For each accepted reader-facing change, record:

- category: `Addition`, `Deprecation or removal`, or `Correction or clarification`;
- target section and exact changed wording;
- reader impact;
- rationale;
- direct source URLs;
- source limitations;
- recommended version impact.

Rendering, metadata, compatibility, generator, and validation changes belong in the release report, not the reader-facing change ledger, unless they also alter content visible to the reader.

## Changelog rule

If the exact result is `The handbook's reader-facing content is unchanged.`, do not add a changelog page, contents entry, bookmark, or empty placeholder.

When reader-facing content changed, the changelog must:

- be the final PDF page;
- name the previous edition and publication date;
- summarize only accepted changes;
- use the three permitted categories;
- state why each change was warranted and include direct source links where the format permits;
- identify the compared previous PDF hash or release identifier.

## Recommended version bump

- **Patch:** corrections, clarifications, rendering repairs, compatibility fixes, and production-pipeline changes that do not materially expand the reader job.
- **Minor:** meaningful additive coverage, new chapters or practical tools, or deprecations/removals that preserve the handbook's overall contract.
- **Major:** a breaking change to audience, promise, structure, governing methodology, or canonical design system.

An unchanged-content artifact may still receive a patch release when the distributed PDF itself changes. Changelog omission and release versioning answer different questions.

## Authority boundaries

Candidate generation does not authorize replacement of the current PDF. Approval to replace a file does not authorize a commit, tag, push, hosted release, deployment, subscriber notification, or marketing outreach. Treat each as a separate mutation unless the user's instruction explicitly groups them.

Before release, identify the exact candidate by hash. Publish that exact artifact or stop. Never rebuild during promotion and assume equivalence.

The release gate must consume the changelog decision and inspect the actual candidate PDF. A passing ledger decision by itself is not evidence that the candidate obeys it.

## Release report

Report:

- candidate PDF path and SHA-256;
- previous PDF identity;
- exact source and PDF-text diff paths;
- semantic change ledger and direct sources;
- recommended version bump;
- structural, visual, and cross-renderer validation results;
- gated-source limitations;
- whether the canonical source and production PDF remained unchanged;
- every publication action actually completed and every action not run.
