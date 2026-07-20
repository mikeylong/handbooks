# Production AI Engineering

This workspace contains a current, production-oriented reference for building and operating LLM systems.

- [Production AI Engineering](./handbook/index.html) — the illustrated handbook source by Michael Long, designed first for the PDF edition and still readable on small screens.
- [Production AI Engineering — PDF edition](./output/pdf/production-ai-engineering.pdf) — a 74-page A5 edition with bookmarks, page labels, running heads, linked citations, a 43-source appendix, and a 97-term index.
- [AI Engineering Field Guide](./AI_ENGINEERING_FIELD_GUIDE.md) — the full operating model, decision rules, failure controls, metrics, and source trail.
- [Voice rewrite review](./handbook/VOICE_REWRITE_REVIEW.md) — the first-pass, review-pass, and final-pass record for the current edition.

The field guide supplies the handbook's working structure. Research papers, standards, security guidance, and product documentation support its technical claims. Rebuild the handbook after source edits with `node handbook/build-handbook.mjs`, then verify it with `node handbook/validate-handbook.mjs`.

Validate the finished PDF with `python handbook/validate-pdf.py output/pdf/production-ai-engineering.pdf` after installing `pypdf`, `pdfplumber`, and `reportlab`.

Both editions treat the model as one nondeterministic component inside a deterministic, observable, policy-enforced system. They are organized around four outcomes: quality, latency, cost, and reliability.
