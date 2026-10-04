# Local teaching handoff

The package teaches the fixed fixture journey in README.md. Its origin is a manually assembled local example, with no Claude Design export, chat history, or native Figma file. The field guide's source-of-truth hierarchy applies to real product work; this baseline has only simulated product behavior.

1. `src/model.mjs` governs graph rules, parsing, normalization, validation, previews, import, and simulated run results.
2. `src/main.jsx` composes the route, product shell, node inspector, importer, graph controls, preview, and test controls.
3. `public/fixtures/expected-results.json` is the frozen fixture contract. `src/model.test.mjs` checks it with exact IDs, row errors and counts.
4. `../sds/src/ui/primitives/` contains the pinned SDS primitives. Product composites are local teaching code and have no approved shared-library owner or production import path.
5. `../review/2026-10-02/stage-2-evidence/` contains actual local Chromium actions, screenshots, returned Claude Code inspections, and build/test logs. `../review/2026-10-02/stage-2-test-matrix.md` distinguishes these results from unavailable external checks.

No private project files, organization settings, or server APIs are needed. A developer can implement and test this local contract without guessing the input records, required mapping, source identity, first intended failure, repair, or expected successful output. A production implementation still needs the host application's real permissions, persistence, APIs, component ownership, concurrent-edit behavior, data provenance, telemetry and assistive-technology review.
