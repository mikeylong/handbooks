const EXPECTED_RELATIONSHIPS = [
  "R[Model response] --> T[Inspect transport status, finish reason, refusal, and incomplete state]",
  "T --> P[Parse]",
  "P --> V[Validate raw structure and reject unknown fields]",
  "V --> N[Apply explicitly allowed normalization]",
  "N --> RV[Revalidate normalized schema and domain invariants]",
  "RV --> A[Authorize the exact subject, resource, and action]",
  "A --> E[Execute or publish]",
  "E --> C[Verify the postcondition]",
];

const STEPS = [
  {
    id: "T",
    number: "01",
    label: "Inspect transport status, finish reason, refusal, and incomplete state",
    action: "Inspect response state",
    detail: "Response state and finish reason; continue only if usable",
  },
  {
    id: "P",
    number: "02",
    label: "Parse",
    action: "Parse",
    detail: "Decode the returned payload",
  },
  {
    id: "V",
    number: "03",
    label: "Validate raw structure and reject unknown fields",
    action: "Validate raw structure",
    detail: "Reject unknown fields",
  },
  {
    id: "N",
    number: "04",
    label: "Apply explicitly allowed normalization",
    action: "Normalize",
    detail: "Apply only explicitly allowed transforms",
  },
  {
    id: "RV",
    number: "05",
    label: "Revalidate normalized schema and domain invariants",
    action: "Revalidate normalized output",
    detail: "Check the schema and domain invariants again",
  },
  {
    id: "A",
    number: "06",
    label: "Authorize the exact subject, resource, and action",
    action: "Authorize the exact action",
    detail: "Bind the subject, resource, and action",
  },
  {
    id: "E",
    number: "07",
    label: "Execute or publish",
    action: "Execute or publish",
    detail: "Perform the authorized effect",
  },
  {
    id: "C",
    number: "08",
    label: "Verify the postcondition",
    action: "Verify the postcondition",
    detail: "Confirm the resulting state",
  },
];

const EDGES = [
  ["R", "T"],
  ["T", "P"],
  ["P", "V"],
  ["V", "N"],
  ["N", "RV"],
  ["RV", "A"],
  ["A", "E"],
  ["E", "C"],
];

const STEP_START_Y = 58;
const STEP_INTERVAL = 54;

function stepNode({ id, number, label, action, detail }, index) {
  const y = STEP_START_Y + index * STEP_INTERVAL;
  return `
    <g class="validation-node validation-step" data-step="${id}" data-label="${label}" transform="translate(0 ${y})">
      <line class="validation-step-tick" x1="48" y1="0" x2="72" y2="0" />
      <text class="validation-step-number" x="84" y="5">${number}</text>
      <text class="validation-step-title" x="122" y="-6">${action}</text>
      <text class="validation-step-detail" x="122" y="16">${detail}</text>
      <line class="validation-row-rule" x1="122" y1="28" x2="730" y2="28" />
    </g>`;
}

function edgePath([from, to], index) {
  const startY = index === 0 ? 25 : STEP_START_Y + (index - 1) * STEP_INTERVAL + 1;
  const endY = STEP_START_Y + index * STEP_INTERVAL;
  return `<path class="validation-spine-link" data-from="${from}" data-to="${to}" d="M48 ${startY} V${endY}" />`;
}

export function renderValidationFlowDiagram(source) {
  if (!/^flowchart\s+TD\s*$/m.test(source)) {
    throw new Error("The validation-flow renderer expects a Mermaid TD flowchart");
  }

  const sourceRelationships = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("flowchart"));
  const missing = EXPECTED_RELATIONSHIPS.filter((relationship) => !sourceRelationships.includes(relationship));
  if (missing.length) {
    throw new Error(`Validation-flow diagram source changed; missing: ${missing.join(" | ")}`);
  }
  const unknown = sourceRelationships.filter((relationship) => !EXPECTED_RELATIONSHIPS.includes(relationship));
  if (unknown.length) {
    throw new Error(`Validation-flow diagram source changed; unsupported: ${unknown.join(" | ")}`);
  }

  return `
<figure class="validation-flow-diagram">
  <svg viewBox="0 0 760 478" role="img" aria-labelledby="validation-flow-title validation-flow-description">
    <title id="validation-flow-title">From model response to verified outcome</title>
    <desc id="validation-flow-description">The mainline path inspects the response state and continues only when the response is usable. It parses the payload, validates its raw structure, applies only allowed normalization, revalidates the schema and domain invariants, authorizes the exact action, executes or publishes, and verifies the postcondition. Refused or incomplete responses do not proceed to parsing.</desc>
    <g class="validation-lines" aria-hidden="true">
      ${EDGES.map(edgePath).join("\n      ")}
    </g>

    <g class="validation-origin" data-step="R" data-label="Model response">
      <line class="validation-origin-rule" x1="48" y1="18" x2="66" y2="18" />
      <text x="76" y="22">MODEL RESPONSE</text>
    </g>

    ${STEPS.map(stepNode).join("\n")}
  </svg>
</figure>`;
}
