# Machine-readable Markdown export

Every hosted handbook requires a Markdown edition next to the PDF choices in the gallery, cover, sidebar, reader end, and edition page. The shared `scripts/markdown-downloads.mjs` runtime derives it from the exact assembled reader body, preserving prose, headings, lists, tables (including one-column worksheets), prompts, code, links, and semantic diagram text. This supports books authored in Markdown and books authored through code. Source HTML and output hashes bind the generated edition; the download filename and immutable route include the content version. `writeMarkdownEdition` is called by approved, collection, and review builders. Missing Markdown identity fails the shared download checks.

For an authored manuscript export with detailed source line mapping, use the additional route below. Published downloads use the catalog publication status, separately from artifact approval. Private drafts retain their candidate status. A format addition does not approve publishing a new content edition.

Export from the editable manuscript into a separate candidate directory. Use `scripts/export-machine-markdown.py`; keep the manuscript unchanged.

```sh
python3 scripts/export-machine-markdown.py \
  --source /local/book/manuscript.md \
  --output /local/book/review/machine-readable/handbook.md \
  --diagram workflow-loop=/local/book/source/diagrams/WorkflowLoop.json \
  --native-status unverified
```

Supply one `--diagram ID=JSON_PATH` argument for each diagram directive in the manuscript. Unsupported directives, missing diagrams, inconsistent chapter headings, and unclosed prompts or code fences fail the export.

The Markdown uses one document title, numbered chapter headings, a linked contents list, fenced prompt text, and tables for diagram nodes and edges. Shell blocks, prose, source links, and existing tables retain their text. Callouts and worksheets become labeled sections that retain their body content and tables. Page breaks are removed. Chapter purposes become visible text.

The adjacent `.index.json` records chapter and section identities, Markdown line ranges, original source lines, prompt tools and bodies, command blocks, diagram semantics, stop-condition excerpts, transformations, and source/output SHA-256 hashes. Stop-condition excerpts are retrieval aids. Read the complete section and prompt before interpreting a condition. The index does not turn the handbook into an executable workflow.

Validate the final export with a Markdown parser. Compare every prompt and command block with the manuscript, verify all source body lines are copied or accounted for by an explicit transformation, and check contents links and line ranges. Keep a source-preservation check in the evidence record. Format validation does not verify the handbook's native-tool procedure or approve publication.
