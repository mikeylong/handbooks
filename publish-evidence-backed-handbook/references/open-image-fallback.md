# Open-image fallback

Read this file only when a required raster illustration cannot use the preferred image-generation path because that capability is missing or unavailable, or when the user explicitly requests sourced open art. This is an acquisition fallback, not permission to lower the visual, factual, or PDF gates.

Do not use this path when the user explicitly requires original generated art, forbids web acquisition, or supplies a governing system that prohibits reused imagery. If web research or download access is also unavailable, fail the illustration gate.

## Discover candidates

Search public-domain and open-media collections whose individual items have stable description pages. Prefer, in order:

1. a project- or institution-supplied public-domain/open-access collection with explicit item-level reuse terms;
2. Wikimedia Commons file pages;
3. another reputable repository whose item page identifies the creator, source, and exact reusable license.

Keep the search bounded. Unless the user requests broader research, search Wikimedia Commons and no more than two relevant institutional collections per placement, then either select a passing candidate or report the failed gate and repositories searched.

A search result, image-search thumbnail, category page, social post, blog copy, or Wikipedia article is discovery evidence only. It is never the asset or the license record. Do not use generic commercial stock merely because a search filter labels it free.

For Wikimedia Commons, confirm that the asset is actually hosted on `commons.wikimedia.org`, then read the individual file-description page. Commons explains that each file can carry different reuse and credit requirements and that reusers should verify each copyright status:

- [Reusing content outside Wikimedia](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia)
- [Commons licensing policy](https://commons.wikimedia.org/wiki/Commons:Licensing)

## Verify rights before download

Record direct evidence for every candidate:

- item or file-description page URL;
- direct full-resolution original-file URL;
- work title, creator, creation date when supplied, and source institution;
- exact license name and version or the stated public-domain basis;
- license URL and any creator-specified credit line;
- access date;
- whether cropping, tonal adjustment, background cleanup, or other planned changes are allowed;
- material non-copyright restrictions noted by the source, such as personality, privacy, trademark, cultural, or jurisdiction-specific rights.

Prefer public domain or CC0. CC BY is acceptable when the handbook can provide attribution, the license link, and a change notice. CC BY-SA is acceptable only when the normalized or adapted asset and its distribution can satisfy the applicable share-alike terms. Treat other licenses as unresolved until their terms are reviewed for the intended handbook use.

Reject assets that are fair-use only, editorial-use only, noncommercial, no-derivatives, permission-by-request, missing a license, attributed only to an uploader when the creator differs, flagged for deletion or disputed rights, or unclear about the planned print and digital reuse. Do not infer a reusable license from age, search metadata, a repository name, or the phrase “free image.” If compatibility remains uncertain, stop and request rights review rather than claiming candidate readiness.

## Select for content and style

Rights clearance is necessary but not sufficient. Inspect the full-resolution original and require:

- an accurate subject supported by the item metadata and the handbook's evidence sources;
- no misleading species, anatomy, time period, location, or safety implication;
- perceptual fit with the governing illustration treatment at normal A5 viewing scale;
- sufficient crop latitude and pixels for at least 240 effective PPI at final size, preferably 300;
- no watermark, baked-in label, compression damage, or background that defeats the intended layout.

Prefer a historically compatible engraving or natural-history plate when the bundled monochrome system governs. Do not convert an arbitrary photograph into a pseudo-engraving and call that a style match. If no candidate passes content, style, and resolution review, fail the illustration gate.

For medical, safety, identification, procedural, or other consequential depictions, independently verify the subject against an authoritative handbook evidence source. Reject ambiguous or disputed imagery and never use an illustration as the sole evidence for a factual claim.

## Download, credit, and freeze

Download the full-resolution original into the isolated candidate; do not hotlink. Preserve that original byte-for-byte and create a separate normalized print asset. Make only transformations allowed by the license and record each one. Keep headings, captions, warnings, and explanatory labels in the editable handbook source.

The illustration manifest must identify `acquisitionMode: open-licensed-web` and include the shared asset fields from `illustration-workflow.md` plus:

- repository and item/file-description page;
- original-file URL;
- title, creator, date, and source institution when supplied;
- license/public-domain status, version or basis, and license URL;
- access date and exact attribution text;
- original download hash and normalized asset hash;
- every modification and the normalization command or transform;
- selection rationale connecting subject accuracy and visual fit to the governing system.

Add a reader-visible credit and license statement wherever the license requires it. For public-domain work, retain a provenance credit even when attribution is not legally required. The candidate is not ready if its source manifest and reader-facing credits disagree.
