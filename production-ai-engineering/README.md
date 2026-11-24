# Production AI Engineering

**A practical handbook for building reliable AI systems.**

Production AI Engineering is for software engineers and technical leaders turning promising AI ideas into products people can depend on.

The book looks at the decisions that matter between a successful demo and a real product: what to build, what to measure, what can go wrong, and how to know when the system is ready.

**Current release:** Version 1.4.4 · November 23, 2026
<!-- production-pdf-sha256: 663e99e0c12130808da297cd28a1d757e3fedbb0b12e58eaa115dd3c1d86d1f4 -->

[Read the book (PDF)](./output/pdf/production-ai-engineering-v1.4.4-2026-11-23.pdf)

This repository owns only Production AI Engineering: its manuscript, reader, illustrations, automation and approved PDF editions.

Validate and build with Node.js 22 and Poppler:

```sh
npm run validate:release
npm run build
```

The reader package is written to `output/reader/`. The approved PDF is copied without rebuilding it.

The gallery and shared appearance code live in https://github.com/mikeylong/handbooks-site. That site builds from pinned commits in each handbook’s own repository. AI Evaluation lives in https://github.com/mikeylong/ai-evaluation-field-guide and AI Consulting lives in https://github.com/mikeylong/ai-consulting-playbook.
