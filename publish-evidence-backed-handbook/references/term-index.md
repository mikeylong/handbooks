# Term index contract

Use the Production AI Engineering index pattern: alphabetical letter groups, one term per entry, compact linked printed-page references, two columns on wide screens and in PDFs, and one column on narrow screens. Use the shared `term-index`, `index-columns`, `index-group`, `index-term` and `index-pages` reader classes. Do not present an index as paragraphs containing many terms or long quoted section-title links.

Books own `source/index-terms.json`, with `entries` containing a plain `term` and a nonempty list of source `sections`. Numeric source IDs remain internal; worksheets may use `tool-a` and `tool-b`. Terms must be unique. Render the index through shared `TermIndex(book_root)` from `scripts/term_index.py`, after a normal index heading and a short page-reference explanation.

The ReportLab runtime binds source section identities before title formatting and notifies the index of their final printed page labels on each build pass. The index rebuilds until pagination is stable, then fails for unresolved targets. Never hard-code page numbers in a manuscript. Each page reference links to its corresponding section. One entry's repeated references to the same printed page are deduplicated.

The HTML renderer reads the exact edition PDF's outlines and page labels. It resolves entries to the existing HTML section anchors and includes the full destination title in the accessible link name. Visible index links remain compact page numbers. PDF and HTML must agree with the actual distributed edition, not an earlier page map or a source-only assumption.

Run `scripts/test-term-index.py` to verify pagination shifts, structured entries and invalid source rejection. Run `scripts/validate-term-index.py --book BOOK --html FINAL_HTML --pdf DAYTIME --pdf LATE_NIGHT` against final generated and downloaded artifacts. Reject packed paragraph indexes, missing/duplicate/unsorted terms, wrong alphabetical groups, empty destinations, long quoted reference labels, broken anchors and stale printed-page numbers. Preserve existing editions; a rebuild does not authorize publication.
