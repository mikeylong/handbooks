# Production AI Engineering

This workspace contains a current, production-oriented reference for building and operating LLM systems.

- [Production AI Engineering companion site](./handbook/index.html) — the full illustrated handbook by Michael Long, with section search, chapter navigation, a direct PDF download, responsive reading layouts, and an automation-sourced countdown to the next version review.
- [Production AI Engineering — PDF edition](./output/pdf/production-ai-engineering.pdf) — a 74-page A5 edition with bookmarks, page labels, running heads, linked citations, a 43-source appendix, and a 97-term index.
- [AI Engineering Field Guide](./AI_ENGINEERING_FIELD_GUIDE.md) — the full operating model, decision rules, failure controls, metrics, and source trail.
- [Voice rewrite review](./handbook/VOICE_REWRITE_REVIEW.md) — the first-pass, review-pass, and final-pass record for the current edition.

The field guide supplies the handbook's working structure. Research papers, standards, security guidance, and product documentation support its technical claims. Rebuild the handbook after source edits with `node handbook/build-handbook.mjs`, then verify it with `node handbook/validate-handbook.mjs`.

The builder reads the active cadence in `automation/automation.toml` and the timezone and publication rule in `automation/release-policy.json`, then materializes `handbook/release-schedule.json`. The countdown marks the next candidate review. Site and PDF updates publish together only after manual approval.

Validate the finished PDF with `python handbook/validate-pdf.py output/pdf/production-ai-engineering.pdf` after installing `pypdf`, `pdfplumber`, and `reportlab`.

Both editions treat the model as one nondeterministic component inside a deterministic, observable, policy-enforced system. They are organized around four outcomes: quality, latency, cost, and reliability.

For local development, run `npm run dev` and visit `http://localhost:4173/handbook/`. The dependency-free development server disables asset caching and automatically reloads open handbook tabs when HTML, CSS, JavaScript, images, or the published PDF change. Press `Ctrl+C` in that terminal to stop it.
