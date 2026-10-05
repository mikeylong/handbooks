# Handbooks

The private source collection for https://handbooks.surfaces.systems. One repository owns the books, publishing toolkit, site, catalog, and CI.

## Setup

Install Git, Node.js 22 or newer, Python 3.12 or newer, and Poppler (`pdfinfo` and `pdftotext`). Routine validation and site builds use the tracked approved packages and require no npm dependencies or former repositories.

```sh
npm run validate
npm run build
npm run preview
```

Preview serves `site/output/site` on http://127.0.0.1:4181. Optional manuscript and draft PDF builds use an isolated Python environment with `requirements.txt`; those builds are review work and do not approve publication.

## Published editions

Production AI Engineering v1.4.0, AI Evaluation v1.0.0, AI Consulting v1.0.0, and Claude Design v1.2.0 are the approved public packages. The catalog selects locations and public eligibility. Each book retains its release manifest, approved PDF, and `publication-package.json` with hashes for its frozen reader and assets. A changed package fails the build until a new edition is explicitly approved.

Public edition details and versioned downloads live on the website. Source access requires private GitHub access. New release tags use `<book-id>/v<version>` and identify a collection commit; the book's manifests identify the distributed artifacts.

## Ownership and recovery

Keep draft books, internal evidence, dependencies, build scratch data, and recovery archives outside public output. Work from the root repository and use explicit file paths when staging. Do not initialize child repositories. The separate `/Users/mike/ai-product-design-curriculum` application is outside this collection.

The migration report and original-to-imported SHA maps are under `migration/2026-10-02-consolidation/`. Local backups and former Git metadata are retained under its ignored `recovery/` folder until Mike explicitly authorizes a retention change. Preserve historical task locations, compatibility links, and linked worktrees.

Only the Surfaces Vercel project publishes this collection. Its project root is the repository root, build command is `npm run build`, and output directory is `site/output/site`. Legacy publishing remains retired during rollback.
