# AI Evaluation Field Guide

First public edition: **1.0.0 · October 1, 2026 · 100 pages**.

[Read online](https://handbooks.mikelong.ai/ai-evaluation/) or [download the reviewed PDF](output/pdf/ai-evaluation-v1.0.0-2026-10-01.pdf).

This guide takes a beginner through an evaluation brief, behavior contract, evidence sets, graders, statistical interpretation, launch decisions, and production monitoring. It includes 12 chapters, 12 worksheets, a guided capstone, and 25 sources.

From the repository root, validate the frozen release with:

```sh
npm run validate:evaluation
npm run build
```

Validation requires Node.js and Poppler (`pdfinfo` and `pdftotext`). It verifies the PDF's manifest digest, measured page count, complete chapters and worksheets, source count, frozen illustrations, reader links, and identical download. `qa/validation.json` records the deeper PDF structural review for that exact digest.

For an authoring revision, use Python with ReportLab, pypdf, pdfplumber, and Pillow. The preserved fonts are in `source/fonts`. Build the reader from the same authored flowables with `python3 books/ai-evaluation/source/build_reader.py`; its two diagrams use Poppler. Rebuilding a PDF creates a candidate that needs a new manifest and the full structural, reader, visual, and cross-renderer review before publication. Do not rebuild during promotion.

The previous 94-page PDF was an unpublished draft. Its comparison evidence remains in the local handbook workspace. This edition has no edition changelog because it is the first public release.
