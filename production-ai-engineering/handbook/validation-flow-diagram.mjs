import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT || resolve(import.meta.dirname,'../../publish-evidence-backed-handbook');
const {renderFixedFlowDiagram}=await import(pathToFileURL(resolve(toolkit,'scripts/fixed-flow-diagrams.mjs')));
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


const BINDINGS = {
  "text1": "From model response to verified outcome",
  "text2": "The mainline path inspects the response state and continues only when the response is usable. It parses the payload, validates its raw structure, applies only allowed normalization, revalidates the schema and domain invariants, authorizes the exact action, executes or publishes, and verifies the postcondition. Refused or incomplete responses do not proceed to parsing.",
  "text3": "MODEL RESPONSE",
  "text4": "Structured output validation flow diagram",
  "text5": "Model response"
};
export function renderValidationFlowDiagram(source) {
 return renderFixedFlowDiagram("validation",source,{expected:EXPECTED_RELATIONSHIPS,bindings:BINDINGS,steps:STEPS,edges:EDGES});
}
