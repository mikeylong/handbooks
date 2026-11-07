# AI Evaluation Field Guide

**Current release:** Version 1.0.1 · November 7, 2026 · 103 pages

[Read the handbook](https://handbooks.surfaces.systems/ai-evaluation/) · [Edition and downloads](https://handbooks.surfaces.systems/ai-evaluation/editions/v1.0.1/)

This repository owns this handbook’s editable source, illustrations, review evidence, reader and released PDF.

Validate the approved release and build its reader:

```sh
npm run validate
```

Requires Node.js 22 and Poppler (`pdfinfo` and `pdftotext`). No npm packages are needed. Release validation checks the frozen PDF pair, exact source comparison and retained review proof. The published reader is https://handbooks.surfaces.systems/ai-evaluation/.

The approved edition is v1.0.1. Its exact PDF, page count and SHA-256 are in `release-manifest.json`. GitHub releases are in this repository. The collection site assembles approved local packages and adds shared appearance and gallery navigation.

For a new authoring candidate, use Python 3.12 with the dependencies in `source/requirements.txt`, then run `python source/build_handbook.py --theme light --output output/candidates/daytime.pdf` and `python source/build_reader.py`. The manuscript is in the PDF builder. This creates a candidate requiring its own manifest, comparisons, PDF validation, visual proof and publication authorization. Do not rebuild an approved PDF during promotion.

`qa/release-review.md`, `qa/validation.json`, `qa/page-map.json` and `evidence/` preserve the review evidence and source-access limits. Their original paths and preparation statements describe the review at that time. `REPOSITORY_MIGRATION.md` records the repository extraction. Historical local draft files remain in `work/` and `outputs/`, outside the approved package tracked here.
