# Handbooks site

Build the gallery and check every reader:

```sh
npm run validate:front-pages
```

Requires Node.js 22, npm, tar and network access to the public book repositories on GitHub. No npm packages or GitHub credentials are needed. The build writes `output/site/` and downloads source snapshots into ignored `.cache/books/`. It copies approved PDFs; it never regenerates them.

This repository owns the gallery, shared reader appearance, navigation and hosting at https://handbooks.mikelong.ai and https://handbooks.surfaces.systems. Each handbook owns its manuscript, illustrations, evidence and releases in its own repository:

- Production AI Engineering: https://github.com/mikeylong/production-ai-engineering-book
- AI Evaluation Field Guide: https://github.com/mikeylong/ai-evaluation-field-guide
- AI Consulting Playbook: https://github.com/mikeylong/ai-consulting-playbook

`library.json` pins each public book to an exact Git commit and approved PDF hash. Updating a title means reviewing its own repository, validating the exact PDF and reader, and updating that pin. The build rejects duplicate book repositories, mutable Git references, wrong repository/release links, changed PDF bytes, incomplete publication fronts and missing shared appearance controls.

To preview locally, run `npm run preview` and open http://127.0.0.1:4181/. Reuse the existing preview if that port is already serving the handbooks. The collection root `/Users/mike/handbooks` remains outside Git.

The shared appearance and gallery code were extracted from the previously public Production AI Engineering site at commit `39d2d281653ac72642813569bc03e9b68b85397d`. Book source and review evidence are not committed here. Both existing Vercel projects publish this site repository.
