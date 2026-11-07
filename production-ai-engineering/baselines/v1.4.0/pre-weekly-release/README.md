# Production AI Engineering

**A practical handbook for building reliable AI systems.**

Production AI Engineering is for software engineers and technical leaders turning promising AI ideas into products people can depend on.

The book looks at the decisions that matter between a successful demo and a real product: what to build, what to measure, what can go wrong, and how to know when the system is ready.

**Current release:** Version 1.4.0 · September 30, 2026
<!-- production-pdf-sha256: dbed169d2eb2fe6f14d43c9f72fac59113fc6de0f2a42d63de36cd75602128c0 -->

[Read the book (PDF)](./output/pdf/production-ai-engineering-v1.4.0-2026-09-30.pdf)

This repository owns only Production AI Engineering: its manuscript, reader, illustrations, automation and approved PDF editions.

Validate and build with Node.js 22 and Poppler:

```sh
npm run validate:release
npm run build
```

The reader package is written to `output/reader/`. The approved PDF is copied without rebuilding it.

The gallery and shared appearance code live in https://github.com/mikeylong/handbooks-site. That site builds from pinned commits in each handbook’s own repository. AI Evaluation lives in https://github.com/mikeylong/ai-evaluation-field-guide and AI Consulting lives in https://github.com/mikeylong/ai-consulting-playbook.
