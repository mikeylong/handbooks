# Production AI Engineering

**A practical handbook for building reliable AI systems.**

Production AI Engineering is for software engineers and technical leaders turning promising AI ideas into products people can depend on.

The book looks at the decisions that matter between a successful demo and a real product: what to build, what to measure, what can go wrong, and how to know when the system is ready.

**Current release:** Version 1.4.2 · November 8, 2026
<!-- production-pdf-sha256: ee5b249c5f37d10f27787a23f7d5ce3f6046af8bfb1e07601d13a18f23c4b487 -->

[Read the book (PDF)](./output/pdf/production-ai-engineering-v1.4.2-2026-11-08.pdf)

This repository owns only Production AI Engineering: its manuscript, reader, illustrations, automation and approved PDF editions.

Validate and build with Node.js 22 and Poppler:

```sh
npm run validate:release
npm run build
```

The reader package is written to `output/reader/`. The approved PDF is copied without rebuilding it.

The gallery and shared appearance code live in https://github.com/mikeylong/handbooks-site. That site builds from pinned commits in each handbook’s own repository. AI Evaluation lives in https://github.com/mikeylong/ai-evaluation-field-guide and AI Consulting lives in https://github.com/mikeylong/ai-consulting-playbook.
