# Publication decision

**Recommendation: approve this first-publication candidate for release.** Version 1.0.0, October 1, 2026, 138 pages. This recommendation is based on editorial and artifact evidence. Publication authority has not been granted or exercised.

The exact PDF SHA-256 is:

```text
4a7055b53ec4e4db7dbafacb6895513b055b4adeb02354c9f38fe53999ed92b2
```

## Candidate evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Canonical source and baseline preserved | Passed | `build-manifest.json`; preserved baseline in the candidate run |
| Claims, freshness and inspection limits | Passed within disclosed scope | `evidence/source-ledger.md`; 28 primary-source entries |
| Full manuscript review and follow-up repairs | Passed | `AUDIT.md`; `evidence/reader-review-after.md` |
| Cohorts and monthly arithmetic | Passed | `qa/arithmetic.json` |
| First-edition changelog state | Passed | `changelog-decision.json`; no changelog surfaces |
| Strict PDF structure, trim, fonts, links, labels and outline | Passed | `qa/validation.json`; `qa/structure.json` |
| Twelve required opener images | Passed | One opaque raster paint per opener, no masks, at least 240 effective ppi |
| Complete two-renderer proof | Passed with two accepted Low observations | All 138 pages rendered in Poppler and Apple PDFKit; all 18 contact sheets reviewed; 51 critical pages reviewed in full-size paired detail |
| Frozen art provenance and repeat build | Passed | Original August generation prompts, selected files and normalization hashes; identical repeated PDF SHA |
| Hosted reader completeness and publication front | Passed locally | `qa/reader-parity.json`; `qa/site-checks.txt` |
| Desktop/mobile Light/Dark/System and printing | Passed locally | `qa/browser-review.json`; all 60 figure checks, 48 opener contexts, white print and exact PDF download |
| Shared appearance and navigation regression | Passed locally | `qa/browser-regression.json`; all three books, colored transparent fixture, no-JS and blocked storage |
| Appearance menu after owner feedback | Passed locally | `qa/appearance/review.json`; gallery and all three readers at 320/390/768/1280px, keyboard/focus, persistence, System, print and in-app browser |
| Deployed reader and promoted artifact | Pending publication authorization | Verify the deployed page and exact PDF hash after the approved release |

The complete proof images remain in the run's `qa/poppler`, `qa/pdfkit`, `qa/detail`, `qa/proof-sheets` and `qa/browser` folders. `qa/visual-review.json` binds the renderer files to the candidate hash.

## Deliberate limits

Read the source-access limitations in `AUDIT.md` before approval. The manuscript discloses them and does not use blocked bodies as verified support for changed factual claims. The two accepted Low visual observations are compact-table word wrapping and a heavier Apple serif rasterization. Browser verification used Chromium on desktop and a mobile viewport; it is not a physical-device or assistive-technology certification.

The cover's Monday 9 AM Pacific review cadence starts October 5, 2026. It is a review policy, not a claim that an automation has been created. The release URL records the intended `ai-consulting-v1.0.0` tag; it does not exist yet.

## Scope awaiting approval

Publish the exact candidate PDF and reader together. Promote the local Consulting source, frozen art, metadata, manifests and gallery entry into the canonical site repository through a reviewed change. Include the shared artwork-preservation repair, compact appearance menu and search-label fallback, plus focused validation updates. Preserve the Production and Evaluation PDFs and their edition metadata.

After authorization, run the GitHub account preflight, commit and push the isolated scope, complete one focused PR review and required checks, then merge under repository protections. Create the Consulting release/tag and deploy the same reviewed site. Verify both public handbook hosts, desktop/mobile appearance and the downloaded PDF hash. Until those steps are completed, the candidate remains local and unpublished.

The earlier browser reports retain the original artwork and reader checks. `qa/appearance/review.json` supplies the final menu interaction proof; it supersedes their native-selector checks.
