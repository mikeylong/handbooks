# Voice rewrite review

Edition: **Production AI Engineering: A Handbook for Building Reliable LLM Systems**  
Author: **Michael Long**  
Voice profile: **write-like-mike, longer-form prose**

## Pass 1 — Full rewrite

The complete manuscript was rewritten in Mike's direct, practical voice. The pass covered the cover and front matter, all 26 numbered sections, 12 chapter openers and decks, section source notes, appendix framing, bibliography, and index navigation. It preserved the field guide's claims, qualifiers, controls, examples, tables, formulas, citations, and source boundaries.

## Pass 2 — Independent review

Three separate reviews checked the work:

- **Voice:** whole-manuscript rhythm, directness, repeated constructions, vague openers, generic AI language, and source-note phrasing.
- **Technical fidelity:** section, table, list, checklist, code-block, URL, citation, bibliography, index, and illustration parity.
- **PDF composition:** every rendered page, including the cover, contents, running heads, chapter art, tables, page breaks, appendix, bibliography, and index.

The review found no semantic drift. It did identify prose that still sounded academic or generic, along with several stranded paragraphs and split section endings. Those findings became the input to the final pass.

## Pass 3 — Final manuscript and PDF

The final pass changed the book title to the more direct **Production AI Engineering**, confirmed the byline as **Michael Long**, removed the inaccurate adaptation claim, and resolved every voice finding. It added one intentional `Release gates` subhead to make the evaluation controls easier to scan. The rest of the technical structure remains intact.

The PDF was then rebuilt through a stable two-pass page-map process. Tables and lists were kept readable, split lead paragraphs were repaired, short closing material was rebalanced, the quantization methods section was moved to a fresh page, and the final learning-order section received a natural page break. Appendix and index running heads were corrected. Production captions, rules, and background treatments were removed from all twelve illustration pages. The section 1 system flow and the structured-output validation sequence are rendered as source-locked inline vector diagrams from Mermaid source instead of printed as raw markup. The generic text-schematic fallback was removed. Each remaining non-code technical block now has a format matched to its meaning: a context-budget definition list; a cache-key composition; a staged latency budget; a KV-footprint factor equation; a source-locked eligible-failure flow diagram with labeled transitions and terminal branches; a source-locked RAG topology connecting ingestion, shared lexical and vector indexes, identity and ACL filters, retrieval, reranking, context packing, cited answers, and abstention; grouped golden-record fields; a parent-child trace tree; and a journey-cost model that separates hosted and self-hosted inference. The JSON response envelope is presented as frameless, black-and-white syntax-highlighted code.

## Final verification

- 26 numbered sections and 15 subheads
- 11 tables, 89 rows, and 308 cells
- 238 list items and 31 checklist items
- 1 code example, 7 editorial examples, 2 rendered Mermaid diagrams, 1 fallback-flow diagram, and 1 RAG-flow diagram
- 66 source URL occurrences across 43 unique sources
- 30 citation markers and 43 bibliography entries
- 97 index entries
- 12 black-and-white pointillist chapter illustrations
- 74 A5 pages, 80 outline entries, 730 internal links, and 77 external-link annotations
- Tagged PDF with embedded fonts, correct metadata, and no blank or sparse body pages

Final manuscript SHA-256: `71dd4e68235ac708c23772f74cb6750023f2524ba3833e33efd1da8bf5b7fb87`  
Final PDF SHA-256: `331651468640d2472ba5d3ed038d948efccf33c804bc6d83b2e04eaad2b065a9`
