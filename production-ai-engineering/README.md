# Production AI Engineering

**A practical handbook for building reliable AI systems.**

Production AI Engineering is for software engineers and technical leaders turning promising AI ideas into products people can depend on.

The book looks at the decisions that matter between a successful demo and a real product: what to build, what to measure, what can go wrong, and how to know when the system is ready.

**Current release:** Version 1.4.3 · November 9, 2026
<!-- production-pdf-sha256: 9f2801cefd9096c09189445f537678229f96452865c175383dde0c7d6bc9ce92 -->

[Read the book (PDF)](./output/pdf/production-ai-engineering-v1.4.3-2026-11-09.pdf)

This repository owns only Production AI Engineering: its manuscript, reader, illustrations, automation and approved PDF editions.

Validate and build with Node.js 22 and Poppler:

```sh
npm run validate:release
npm run build
```

The reader package is written to `output/reader/`. The approved PDF is copied without rebuilding it.

The gallery and shared appearance code live in https://github.com/mikeylong/handbooks-site. That site builds from pinned commits in each handbook’s own repository. AI Evaluation lives in https://github.com/mikeylong/ai-evaluation-field-guide and AI Consulting lives in https://github.com/mikeylong/ai-consulting-playbook.
