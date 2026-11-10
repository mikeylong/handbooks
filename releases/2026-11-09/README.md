# November 9, 2026 patch editions

Publish the explicitly approved Organization 1.1.3, Production AI Engineering 1.4.3 and Evaluation 1.0.3 artifacts. Consulting 1.0.2 and Claude Design 2.1.5 remain unchanged.

The common review cutoff is November 9 at 09:00 America/Los_Angeles; actual research began at 20:56:22Z. Cycle `265b873e-44bb-4dc1-8d77-7a2c8b3f5f8a`, ledger `73e0c7505a73dcdb64360e8e490e3167e7e7b44017afc03ee3429cca706de110`. Full public-scope review and checkpoint passed before this separately authorized publication.

- Organization adds an inherited-error handoff test, grounded in [collaborative intelligence research](https://arxiv.org/abs/2611.02633).
- Production separates monitoring coverage, review latency and escalation using [Anthropic measurements](https://www.anthropic.com/institute/measuring-pace-of-ai-development), and adds matched evaluation/production comparisons using [OpenAI research](https://alignment.openai.com/eval-production-behavior-gap). The changelog review-date correction cites the publisher's public review record.
- Evaluation adds teamwork, monitoring measures and matched production comparisons using those same sources, with book-specific guidance and study limitations.

Exact source/PDF patches, candidate-specific page maps, decisions and artifact validation are retained in each book's versioned QA directory. Both PDF appearances passed all-page Poppler and native PDFKit review. Managed Chromium jobs `0ddec271` and `e18ca0fa` passed the exact staged readers and downloads; all four evidence/cleanup flags are true. The complete `npm run validate` passed. Organization's reader restores the already-approved title-only headings and linked references without changing its manuscript or PDFs.

Generation uses the hash-bound frozen toolkit archive. Reader assembly uses the existing shared formatter at source commit e097c102145a5edab3f34a6acd46059e6ecd6a5f. Production preparation and finalization each remain exactly once. The 80 GiB VM budget, 10 GiB free-space floor, historical releases and every failed-run artifact remain preserved.

Live deployment identity and production URL/browser checks are separate final gates; this packet records pre-publication acceptance only.
