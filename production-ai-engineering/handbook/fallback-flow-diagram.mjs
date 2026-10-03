import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT || resolve(import.meta.dirname,'../../publish-evidence-backed-handbook');
const {renderFixedFlowDiagram}=await import(pathToFileURL(resolve(toolkit,'scripts/fixed-flow-diagrams.mjs')));
const EXPECTED_LINES = [
  "Primary qualified model",
  "Compatible secondary provider/model",
  "Smaller read-only or lower-capability mode",
  "Terminal options | Deterministic result | Queued work | Human handoff",
];


const BINDINGS = {
  "text1": "Graceful fallback path for eligible failures",
  "text2": "An eligible failure moves from the primary qualified model to a contract-compatible secondary provider or model. A further eligible failure may move to a disclosed read-only or lower-capability mode. From there the system returns a deterministic result, queues the work, or hands it to a human. Safety refusals, authorization or policy denials, and semantic validation failures do not enter this chain.",
  "text3": "ELIGIBLE FAILURES ONLY",
  "text4": "eligible failure; contract preserved",
  "text5": "eligible failure; degraded mode disclosed",
  "text6": "TERMINAL OPTIONS",
  "text7": "Primary qualified model",
  "text8": "Compatible secondary provider/model",
  "text9": "Smaller read-only or lower-capability mode",
  "text10": "Deterministic result",
  "text11": "Queued work",
  "text12": "Human handoff",
  "text13": "Agent fallback state flow diagram",
  "text14": "Primary qualified model",
  "text15": "Compatible secondary provider/model",
  "text16": "Smaller read-only or lower-capability mode",
  "text17": "Deterministic result",
  "text18": "Queued work",
  "text19": "Human handoff"
};
export function renderFallbackFlowDiagram(lines) {
 return renderFixedFlowDiagram("fallback",lines,{expected:EXPECTED_LINES,bindings:BINDINGS});
}
