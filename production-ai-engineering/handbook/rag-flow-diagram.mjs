import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT || resolve(import.meta.dirname,'../../publish-evidence-backed-handbook');
const {renderFixedFlowDiagram}=await import(pathToFileURL(resolve(toolkit,'scripts/fixed-flow-diagrams.mjs')));
const EXPECTED_LINES = [
  "Ingestion | Sources | parse and preserve structure | authorize, version, and chunk",
  "Shared index | lexical and vector indexes",
  "Query and answer | Query + identity | filters + lexical/dense candidates | fusion and reranking | deduplicate and context-pack | answer with claim-level citations or abstain",
];


const BINDINGS = {
  "text1": "Retrieval-augmented generation dataflow",
  "text2": "The ingestion lane preserves source structure, authorizes and versions chunks, and writes lexical and vector indexes to a shared datastore. In the query lane, identity-based tenant and document filters converge with that shared index before candidate retrieval. Candidates are fused, reranked, deduplicated, and packed into context before the system either answers with claim-level citations or abstains.",
  "text3": "INGESTION",
  "text4": "Sources",
  "text5": "Parse and preserve",
  "text6": "structure",
  "text7": "Authorize, version,",
  "text8": "and chunk",
  "text9": "Shared index",
  "text10": "lexical and vector",
  "text11": "indexes",
  "text12": "QUERY AND ANSWER",
  "text13": "Query + identity",
  "text14": "Tenant + document",
  "text15": "ACL filters",
  "text16": "AUTHORIZED QUERY + SHARED INDEX",
  "text17": "Lexical/dense",
  "text18": "candidates",
  "text19": "Fusion and reranking",
  "text20": "Deduplicate and",
  "text21": "context-pack",
  "text22": "Answer with claim-level",
  "text23": "citations",
  "text24": "Abstain",
  "text25": "Retrieval-augmented generation dataflow diagram",
  "text26": "Sources",
  "text27": "Parse and preserve structure",
  "text28": "Authorize, version, and chunk",
  "text29": "Shared index: lexical and vector indexes",
  "text30": "Query + identity",
  "text31": "Tenant + document ACL filters",
  "text32": "lexical/dense candidates",
  "text33": "fusion and reranking",
  "text34": "deduplicate and context-pack",
  "text35": "Answer with claim-level citations",
  "text36": "Abstain"
};
export function renderRagFlowDiagram(lines) {
 return renderFixedFlowDiagram("rag",lines,{expected:EXPECTED_LINES,bindings:BINDINGS});
}
