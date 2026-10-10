# AI Consulting Playbook

This repository owns this handbook’s editable source, illustrations, review evidence, reader and released PDF.

Validate the approved release and build its reader:

```sh
npm run validate
```

Requires Node.js 22 and Poppler (`pdfinfo` and `pdftotext`). No npm packages are needed. The build writes only `output/reader/`; it copies the approved PDF rather than rebuilding it. The published reader is https://handbooks.surfaces.systems/ai-consulting/.

The approved edition is v1.0.1. Its exact PDF, page count and SHA-256 are in `release-manifest.json`. The collection at https://github.com/mikeylong/handbooks assembles approved local packages and adds shared appearance and gallery navigation. Previous edition downloads remain available at their released URLs.

For a new authoring candidate, use Python 3.12 with the dependencies listed in `build-manifest.json`, then run `python source/build_handbook.py --theme light --output output/candidates/daytime.pdf` and `python source/build_reader.py`. The manuscript is in the PDF builder. This creates a candidate requiring its own manifest, comparisons, PDF validation, visual proof and publication authorization. Do not rebuild an approved PDF during promotion.

`RELEASE_REVIEW.md`, `AUDIT.md`, `CHANGE_REPORT.md` and `qa/` preserve the review evidence and source-access limits. Their original paths and preparation statements describe the review at that time. `REPOSITORY_MIGRATION.md` records the repository extraction. Historical local draft files remain in `work/` and `outputs/`, outside the approved package tracked here.
