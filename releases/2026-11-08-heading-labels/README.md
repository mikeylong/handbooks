# Mandatory subsection heading policy repair

Production AI Engineering emitted visible decimal subsection labels and its legacy HTML/PDF validators explicitly required them. The shared reader rule was optional. The renderer now emits title-only subsection headings, preserving chapter markers, source IDs and links. The shared reader policy is mandatory; site builds reject HTML/Markdown regressions; collection CI inspects the current reader, Markdown and both PDFs of every published handbook. Negative tests cover independent formats, outlines, wrapped uppercase PDF body headings, and broken links.

All five books receive new stable patch editions. Substantive manuscript content and research checkpoints are unchanged. Previous edition changelogs remain in retained editions, rather than being repeated in the new presentation-only edition.

## Validation before publication

- Full collection validation passed, including all five exact release packages and heading checks across five readers, five Markdown files and ten PDFs.
- All 888 PDF pages were rendered with Poppler and Apple PDFKit. Complete overviews, all chapter openers and representative content pages were visually reviewed; per-book reports bind the exact PDF hashes.
- Managed Linux Chromium job 1f7ba01a passed all five readers, responsive/theme/navigation/fallback checks and all 15 exact saved downloads. Exported evidence verified; guest and runtime deleted.
- Source-scope comparison passed. Existing release assets, historical evidence, retained routes and the unrelated dirty original checkout were preserved; see preservation-check.json.
- Failed preparation/validation attempts remain in the durable task directory at /Users/mike/handbooks/weekly-reviews/2026-11-08-heading-labels.

The frozen generation toolkit archive is the exact archive bound to the candidate/browser inputs. validation-toolkit.zip additionally strengthens the PDF text guard against uppercase and wrapped headings without changing generated publication bytes. Both are retained.

Final hosted CI, deployment and live-publication evidence are recorded in the task report after release; this document records prepublication validation only.
