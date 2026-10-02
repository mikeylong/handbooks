# AI Consulting Playbook

Version 1.0.0, October 1, 2026. A 138-page handbook for turning an AI opportunity into a governed decision and clean handoff.

Build the website from the repository root:

```sh
npm run build
```

Node 22 is sufficient for the static build. The result is `output/site`, including `/ai-consulting/` and the exact versioned PDF download. To serve it locally on an unused port:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory output/site
```

Open `http://127.0.0.1:8000/ai-consulting/`.

## Source and review evidence

1. `source/build_handbook.py` is the editable manuscript and PDF generator.
2. `source/layout_reference.py` is the frozen layout; `source/fonts` contains the fonts and licenses.
3. `source/build_reader.py` generates HTML from the same manuscript and preserves the authored diagrams.
4. `assets/chapter-art/illustration-manifest.json` records acquisition, transforms and hashes.
5. `release-manifest.json` identifies the exact released PDF, page count and illustration hashes.
6. `RELEASE_REVIEW.md`, `AUDIT.md` and `CHANGE_REPORT.md` retain the candidate review, accepted observations and source-access limits. Their candidate authorization statements describe that historical review. Publication status is recorded on the linked GitHub release.
7. `qa/appearance/review.json` verifies the final shared appearance menu. Earlier browser reports retain the content and artwork checks.

## Rebuild for a new candidate

The reviewed PDF used Python 3.12.14, ReportLab 4.4.9, Pillow 12.3.0 and pypdf 6.10.0. Install Poppler for diagram conversion and PDF text checks. From this book directory:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r source/requirements.txt
.venv/bin/python source/build_handbook.py
.venv/bin/python source/refresh_manifest.py
.venv/bin/python source/build_reader.py
```

These commands regenerate the versioned PDF, manifest, page map, extracted text and reader. The reader also uses the Production reader source in this repository. Preserve the released artifact before preparing another edition, and keep manuscript, metadata, manifest and reader changes together. A changed PDF requires a new publication decision; a successful rebuild does not approve it.

## Verify

From the repository root, with Poppler installed:

```sh
npm run validate:release
npm run validate:evaluation
npm run validate:consulting
npm run validate:front-pages
```

The checks verify the released PDFs, frozen art, reader download and hosted publication details. The Consulting structural and visual reports are in `qa`. Complete two-renderer proof was reviewed for the exact manifest hash. Any PDF change requires fresh complete Poppler and Apple PDFKit rendering and visual review. Any reader or theme change requires affected browser proof, including Light, Dark, System, keyboard controls, mobile navigation, printing and the exact PDF download.

For a new structural PDF review, use the collection's `publish-evidence-backed-handbook` validator in candidate mode with that edition's page map and changelog decision. The first edition has no previous approved edition and no changelog surfaces.
