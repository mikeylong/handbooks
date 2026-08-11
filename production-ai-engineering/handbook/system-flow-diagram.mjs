const EXPECTED_RELATIONSHIPS = [
  "U[User request] --> I[Identity, tenant, policy]",
  "I --> R[Router and admission control]",
  "R --> C[Context builder]",
  "C --> M[Model inference]",
  "M --> V[Parse and validate]",
  "V -->|answer| X[Response or degraded UX]",
  "V -->|tool proposal| P[Authorize and execute]",
  "P --> C",
  "D[(Authorized data)] --> C",
  "K[(Caches and memory)] --> C",
  "T[Tool contracts] --> C",
  "O[Traces, metrics, costs] -. observes .-> R",
  "O -. observes .-> C",
  "O -. observes .-> M",
  "O -. observes .-> V",
  "O -. observes .-> P",
  "E[Evals and release gates] -. improve .-> R",
  "E -. improve .-> C",
  "E -. improve .-> M",
  "E -. improve .-> V",
];

export function renderSystemFlowDiagram(source) {
  if (!/^flowchart\s+LR\s*$/m.test(source)) {
    throw new Error("The system-flow renderer expects a Mermaid LR flowchart");
  }

  const sourceRelationships = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("flowchart"));
  const missing = EXPECTED_RELATIONSHIPS.filter((relationship) => !sourceRelationships.includes(relationship));
  if (missing.length) {
    throw new Error(`System-flow diagram source changed; missing: ${missing.join(" | ")}`);
  }
  const unknown = sourceRelationships.filter((relationship) => !EXPECTED_RELATIONSHIPS.includes(relationship));
  if (unknown.length) {
    throw new Error(`System-flow diagram source changed; unsupported: ${unknown.join(" | ")}`);
  }

  return `
<figure class="system-flow-diagram" role="region" aria-label="Production AI system flow diagram" tabindex="0">
  <svg viewBox="0 0 760 590" role="img" aria-labelledby="system-flow-title system-flow-description">
    <title id="system-flow-title">Production AI system flow</title>
    <desc id="system-flow-description">A request passes through identity and policy, routing, context construction, model inference, and validation. Validation returns a response or sends a tool proposal to authorization and execution. Tool results return to context. Authorized data, caches, and tool contracts feed context. Observability watches the operating path, while evaluations improve it.</desc>
    <defs>
      <marker id="system-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" class="diagram-arrowhead" />
      </marker>
    </defs>

    <g class="diagram-lines" aria-hidden="true">
      <path class="diagram-arrow" data-from="U" data-to="I" d="M380 56 V74" />
      <path class="diagram-arrow" data-from="I" data-to="R" d="M380 118 V136" />
      <path class="diagram-arrow" data-from="R" data-to="C" d="M380 180 V198" />
      <path class="diagram-arrow" data-from="C" data-to="M" d="M380 250 V272" />
      <path class="diagram-arrow" data-from="M" data-to="V" d="M380 316 V334" />

      <path class="diagram-branch" d="M380 378 V404 M135 404 H625" />
      <path class="diagram-arrow" data-from="V" data-to="X" d="M135 404 V426" />
      <path class="diagram-arrow" data-from="V" data-to="P" d="M625 404 V426" />
      <text class="diagram-edge-label" x="190" y="397">answer</text>
      <text class="diagram-edge-label" x="520" y="397">tool proposal</text>

      <path class="diagram-arrow diagram-loop" data-from="P" data-to="C" d="M740 450 H759 V188 H448 V198" />

      <path class="diagram-resource-link" data-from="D" data-to="C" d="M196 202 H244" />
      <path class="diagram-resource-link" data-from="K" data-to="C" d="M196 224 H244" />
      <path class="diagram-resource-link" data-from="T" data-to="C" d="M196 246 H244" />
      <path class="diagram-resource-collector" d="M244 202 V246 M244 224 H272" />

      <path class="diagram-control-rail" d="M230 520 H260 V414" />
      <path class="diagram-control-line" data-from="O" data-to="R" d="M260 394 V234 M260 214 V144 H266" />
      <path class="diagram-control-tick" data-from="O" data-to="C" d="M260 208 H266" />
      <path class="diagram-control-tick" data-from="O" data-to="M" d="M260 282 H266" />
      <path class="diagram-control-tick" data-from="O" data-to="V" d="M260 344 H266" />
      <path class="diagram-control-tick" data-from="O" data-to="P" d="M260 486 H525 V480" />

      <path class="diagram-control-rail" d="M530 520 H500 V494" />
      <path class="diagram-control-rail" d="M500 478 V414" />
      <path class="diagram-control-rail" d="M500 394 V200" />
      <path class="diagram-control-line" data-from="E" data-to="R" d="M500 176 V144 H494" />
      <path class="diagram-control-tick" data-from="E" data-to="C" d="M500 208 H494" />
      <path class="diagram-control-tick" data-from="E" data-to="M" d="M500 282 H494" />
      <path class="diagram-control-tick" data-from="E" data-to="V" d="M500 344 H494" />
    </g>

    <g class="diagram-node diagram-node-main" data-label="User request" transform="translate(272 16)">
      <rect width="216" height="40" rx="2" />
      <text x="108" y="25" text-anchor="middle">User request</text>
    </g>

    <g class="diagram-node diagram-node-main" data-label="Identity and policy" transform="translate(272 74)">
      <rect width="216" height="44" rx="2" />
      <text x="108" y="19" text-anchor="middle" class="diagram-node-label">IDENTITY AND POLICY</text>
      <text x="108" y="35" text-anchor="middle" class="diagram-node-detail">Tenant, authorization, policy</text>
    </g>

    <g class="diagram-node diagram-node-main" data-label="Router" transform="translate(272 136)">
      <rect width="216" height="44" rx="2" />
      <text x="108" y="19" text-anchor="middle" class="diagram-node-label">ROUTER</text>
      <text x="108" y="35" text-anchor="middle" class="diagram-node-detail">Admission and model route</text>
    </g>

    <g class="diagram-node diagram-node-main" data-label="Context builder" transform="translate(272 198)">
      <rect width="216" height="52" rx="2" />
      <text x="108" y="21" text-anchor="middle" class="diagram-node-label">CONTEXT BUILDER</text>
      <text x="108" y="39" text-anchor="middle" class="diagram-node-detail diagram-node-detail-tight">Instructions, state, evidence, tools</text>
    </g>

    <g class="diagram-node diagram-node-main" data-label="Model inference" transform="translate(272 272)">
      <rect width="216" height="44" rx="2" />
      <text x="108" y="19" text-anchor="middle" class="diagram-node-label">MODEL INFERENCE</text>
      <text x="108" y="35" text-anchor="middle" class="diagram-node-detail">Generate a proposal</text>
    </g>

    <g class="diagram-node diagram-node-main" data-label="Parse and validate" transform="translate(272 334)">
      <rect width="216" height="44" rx="2" />
      <text x="108" y="19" text-anchor="middle" class="diagram-node-label">PARSE AND VALIDATE</text>
      <text x="108" y="35" text-anchor="middle" class="diagram-node-detail diagram-node-detail-tight">Syntax, schema, semantics, policy</text>
    </g>

    <g class="diagram-node diagram-node-terminal" data-label="Response or degraded UX" transform="translate(20 426)">
      <rect width="230" height="48" rx="2" />
      <text x="115" y="29" text-anchor="middle" class="diagram-node-label">RESPONSE OR DEGRADED UX</text>
    </g>

    <g class="diagram-node diagram-node-terminal" data-label="Authorize and execute" transform="translate(510 426)">
      <rect width="230" height="48" rx="2" />
      <text x="115" y="29" text-anchor="middle" class="diagram-node-label">AUTHORIZE AND EXECUTE</text>
    </g>

    <g class="diagram-resources" aria-label="Context inputs">
      <text class="diagram-group-label" x="18" y="176">CONTEXT INPUTS</text>
      <g class="diagram-resource" data-label="Authorized data"><text x="18" y="206">Authorized data</text></g>
      <g class="diagram-resource" data-label="Caches and memory"><text x="18" y="228">Caches and memory</text></g>
      <g class="diagram-resource" data-label="Tool contracts"><text x="18" y="250">Tool contracts</text></g>
    </g>

    <g class="diagram-control" data-label="Observability" transform="translate(20 506)">
      <path class="diagram-control-rule" d="M0 0 H210" />
      <text x="0" y="22" class="diagram-node-label">OBSERVABILITY</text>
      <text x="0" y="43">Traces, metrics, costs</text>
      <text x="0" y="63" class="diagram-node-detail">Watches routing through execution</text>
    </g>

    <g class="diagram-control" data-label="Evaluation" transform="translate(530 506)">
      <path class="diagram-control-rule" d="M0 0 H210" />
      <text x="0" y="22" class="diagram-node-label">EVALUATION</text>
      <text x="0" y="43">Evals and release gates</text>
      <text x="0" y="63" class="diagram-node-detail">Improves routing through validation</text>
    </g>
  </svg>
</figure>`;
}
