const EXPECTED_LINES = [
  "Ingestion | Sources | parse and preserve structure | authorize, version, and chunk",
  "Shared index | lexical and vector indexes",
  "Query and answer | Query + identity | filters + lexical/dense candidates | fusion and reranking | deduplicate and context-pack | answer with claim-level citations or abstain",
];

export function renderRagFlowDiagram(lines) {
  const sourceLines = lines.map((line) => line.trim()).filter(Boolean);
  const missing = EXPECTED_LINES.filter((line) => !sourceLines.includes(line));
  if (missing.length) {
    throw new Error(`RAG-flow source changed; missing: ${missing.join(" | ")}`);
  }
  const unknown = sourceLines.filter((line) => !EXPECTED_LINES.includes(line));
  if (unknown.length) {
    throw new Error(`RAG-flow source changed; unsupported: ${unknown.join(" | ")}`);
  }
  if (sourceLines.some((line, index) => line !== EXPECTED_LINES[index])) {
    throw new Error("RAG-flow source changed; the ingestion and query order must remain stable");
  }

  return `
<figure class="rag-flow-diagram" role="region" aria-label="Retrieval-augmented generation dataflow diagram" tabindex="0">
  <svg viewBox="0 0 760 400" role="img" aria-labelledby="rag-flow-title rag-flow-description">
    <title id="rag-flow-title">Retrieval-augmented generation dataflow</title>
    <desc id="rag-flow-description">The ingestion lane preserves source structure, authorizes and versions chunks, and writes lexical and vector indexes to a shared datastore. In the query lane, identity-based tenant and document filters converge with that shared index before candidate retrieval. Candidates are fused, reranked, deduplicated, and packed into context before the system either answers with claim-level citations or abstains.</desc>
    <defs>
      <marker id="rag-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="rag-arrowhead" />
      </marker>
    </defs>

    <text class="rag-lane-label" x="24" y="16">INGESTION</text>
    <line class="rag-lane-rule" x1="126" y1="12" x2="736" y2="12" />

    <g class="rag-lines" aria-hidden="true">
      <path class="rag-arrow" data-from="S" data-to="P" d="M144 76 H162" />
      <path class="rag-arrow" data-from="P" data-to="C" d="M324 76 H342" />
      <path class="rag-arrow" data-from="C" data-to="I" d="M518 76 H540" />
    </g>

    <g class="rag-stage rag-ingestion-stage" data-label="Sources" transform="translate(28 38)">
      <text class="rag-stage-title" x="0" y="18">Sources</text>
      <line class="rag-stage-rule" x1="0" y1="38" x2="110" y2="38" />
    </g>

    <g class="rag-stage rag-ingestion-stage" data-label="Parse and preserve structure" transform="translate(168 32)">
      <text class="rag-stage-title" x="0" y="16"><tspan x="0">Parse and preserve</tspan><tspan x="0" dy="20">structure</tspan></text>
      <line class="rag-stage-rule" x1="0" y1="44" x2="150" y2="44" />
    </g>

    <g class="rag-stage rag-ingestion-stage" data-label="Authorize, version, and chunk" transform="translate(348 32)">
      <text class="rag-stage-title" x="0" y="16"><tspan x="0">Authorize, version,</tspan><tspan x="0" dy="20">and chunk</tspan></text>
      <line class="rag-stage-rule" x1="0" y1="44" x2="164" y2="44" />
    </g>

    <g class="rag-datastore-node" data-label="Shared index: lexical and vector indexes" transform="translate(540 24)">
      <path class="rag-datastore" d="M6 14 V82 C6 91 39 98 89 98 C139 98 172 91 172 82 V14" />
      <ellipse class="rag-datastore-rim" cx="89" cy="14" rx="83" ry="11" />
      <text class="rag-datastore-title" x="89" y="42" text-anchor="middle">Shared index</text>
      <text class="rag-datastore-detail" x="89" y="65" text-anchor="middle"><tspan x="89">lexical and vector</tspan><tspan x="89" dy="18">indexes</tspan></text>
    </g>

    <text class="rag-lane-label" x="24" y="156">QUERY AND ANSWER</text>
    <line class="rag-lane-rule" x1="171" y1="152" x2="617" y2="152" />
    <line class="rag-lane-rule" x1="641" y1="152" x2="736" y2="152" />

    <g class="rag-lines" aria-hidden="true">
      <path class="rag-arrow" data-from="Q" data-to="F" d="M166 224 H204" />
      <path class="rag-arrow rag-merge-input" data-from="F" data-to="R" d="M412 224 H458" />
      <path class="rag-arrow rag-index-link rag-merge-input" data-from="I" data-to="R" d="M629 122 V166 H458 V224" />
      <path class="rag-junction-link" d="M462 224 H494" marker-end="url(#rag-flow-arrow)" />
      <circle class="rag-junction" cx="458" cy="224" r="4" />

      <path class="rag-arrow rag-turn" data-from="R" data-to="U" d="M724 224 H730 V314 H714" />
      <path class="rag-arrow" data-from="U" data-to="D" d="M504 314 H430" />

      <path class="rag-branch" d="M334 317 V336 M164 336 H568" />
      <path class="rag-arrow rag-terminal-link" data-from="D" data-to="A" d="M164 336 V345" />
      <path class="rag-arrow rag-terminal-link" data-from="D" data-to="X" d="M568 336 V345" />
    </g>

    <g class="rag-stage rag-query-stage" data-label="Query + identity" transform="translate(28 186)">
      <text class="rag-stage-title" x="0" y="18">Query + identity</text>
      <line class="rag-stage-rule" x1="0" y1="38" x2="132" y2="38" />
    </g>

    <g class="rag-stage rag-query-stage" data-label="Tenant + document ACL filters" transform="translate(210 180)">
      <text class="rag-stage-title" x="0" y="16"><tspan x="0">Tenant + document</tspan><tspan x="0" dy="20">ACL filters</tspan></text>
      <line class="rag-stage-rule" x1="0" y1="44" x2="196" y2="44" />
    </g>

    <g class="rag-merge-note" aria-hidden="true">
      <text x="458" y="250" text-anchor="middle">AUTHORIZED QUERY + SHARED INDEX</text>
    </g>

    <g class="rag-stage rag-query-stage" data-label="lexical/dense candidates" transform="translate(500 180)">
      <text class="rag-stage-title" x="0" y="16"><tspan x="0">Lexical/dense</tspan><tspan x="0" dy="20">candidates</tspan></text>
      <line class="rag-stage-rule" x1="0" y1="44" x2="218" y2="44" />
    </g>

    <g class="rag-stage rag-query-stage" data-label="fusion and reranking" transform="translate(510 276)">
      <text class="rag-stage-title" x="0" y="18">Fusion and reranking</text>
      <line class="rag-stage-rule" x1="0" y1="38" x2="198" y2="38" />
    </g>

    <g class="rag-stage rag-query-stage" data-label="deduplicate and context-pack" transform="translate(244 270)">
      <text class="rag-stage-title" x="0" y="16"><tspan x="0">Deduplicate and</tspan><tspan x="0" dy="20">context-pack</tspan></text>
      <line class="rag-stage-rule" x1="0" y1="44" x2="180" y2="44" />
    </g>

    <g class="rag-outcome rag-answer-outcome" data-label="Answer with claim-level citations" transform="translate(164 350)">
      <circle class="rag-outcome-marker" cx="0" cy="0" r="5" />
      <text class="rag-outcome-title" x="0" y="19" text-anchor="middle"><tspan x="0">Answer with claim-level</tspan><tspan x="0" dy="17">citations</tspan></text>
    </g>

    <g class="rag-outcome rag-abstain-outcome" data-label="Abstain" transform="translate(568 350)">
      <circle class="rag-outcome-marker" cx="0" cy="0" r="5" />
      <text class="rag-outcome-title" x="0" y="19" text-anchor="middle">Abstain</text>
    </g>
  </svg>
</figure>`;
}
