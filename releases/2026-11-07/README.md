# Handbook releases — November 7, 2026

Four handbooks receive stable updates from the shared November 2 evidence review. AI Consulting 1.0.1 remains unchanged after review; its approved PDF pair and Markdown edition are retained.

| Handbook | Edition | Pages | Update |
| --- | --- | ---: | --- |
| [Production AI Engineering](https://handbooks.surfaces.systems/production-ai-engineering/editions/v1.4.1/) | 1.4.1 | 99 | Cache pricing and lifetime, service-tier controls, speculative decoding policy, judge probes, monitoring coverage, prediction-time provenance, and provider storage checks. |
| [AI Evaluation](https://handbooks.surfaces.systems/ai-evaluation/editions/v1.0.1/) | 1.0.1 | 103 | Rubric counterfactuals, paired credential-attack controls, persistent-memory slices, monitoring coverage, and prediction-time provenance. |
| [Claude Design](https://handbooks.surfaces.systems/claude-design/editions/v2.1.4/) | 2.1.4 | 54 | Conversations and Artifacts walkthrough, standalone migration/export checks, and verified Code Connect context. The existing exercise and Figma starter retain their bytes and historical scope. |
| [AI-Native Organization](https://handbooks.surfaces.systems/ai-native-organization/editions/v1.1.1/) | 1.1.1 | 52 | Bounded organizational coordination case, explicit dependency and decision owners, and measurements for a local trial. |
| [AI Consulting](https://handbooks.surfaces.systems/ai-consulting/editions/v1.0.1/) | 1.0.1 | 142 | Reviewed unchanged. No new editorial changelog or version bump. |

Every current reader offers Markdown, Daytime PDF, and Late night PDF downloads. Prior edition routes and artifact bytes remain retained. The approved stable PDF hashes, research cutoff, evidence identity, and managed Chromium proof are recorded in `release-record.json`; per-book source comparisons and validation receipts live beside each book's edition QA.

All four changed PDF pairs passed structural and appearance validation, full Poppler and Apple PDFKit rendering, and visual review. The complete assembled five-reader site passed managed Linux Chromium checks for responsive layout, System/Light/Dark behavior, fallback behavior, navigation and exact saved download bytes. Browser guest and runtime deletion and evidence verification all passed. Historical failed attempts remain preserved in local review evidence; they were not relabeled as passing attempts.

The frozen generation runtime and its pinned Python requirements are included as `generation-toolkit.zip`. PDF artifacts were promoted by exact hash without rebuilding during publication.
