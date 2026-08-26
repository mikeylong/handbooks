export const INDEX_ENTRIES = [
  {
    "id": "abstention",
    "label": "Abstention",
    "sections": [
      12,
      15
    ],
    "seeAlso": [
      "degraded-mode",
      "grounding"
    ]
  },
  {
    "id": "access-control-lists",
    "label": "Access control lists (ACLs)",
    "sections": [
      14,
      19,
      20
    ],
    "seeAlso": [
      "authorization",
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "awq",
    "label": "Activation-aware Weight Quantization (AWQ)",
    "sections": [
      9
    ],
    "seeAlso": [
      "quantization",
      "weight-only-quantization"
    ]
  },
  {
    "id": "admission-control",
    "label": "Admission control",
    "sections": [
      6,
      7
    ],
    "seeAlso": [
      "kv-cache",
      "load-shedding",
      "quotas"
    ]
  },
  {
    "id": "agents-budgets",
    "label": "Agents, budgets",
    "sections": [
      12
    ],
    "seeAlso": [
      "token-budgets",
      "tool-budgets"
    ]
  },
  {
    "id": "agents-guardrails",
    "label": "Agents, guardrails",
    "sections": [
      12
    ],
    "seeAlso": [
      "harness-engineering",
      "agents-termination"
    ]
  },
  {
    "id": "agents-termination",
    "label": "Agents, termination conditions",
    "sections": [
      12,
      23
    ],
    "seeAlso": [
      "degraded-mode"
    ]
  },
  {
    "id": "answer-correctness",
    "label": "Answer correctness",
    "sections": [
      15,
      16
    ],
    "seeAlso": [
      "grounding",
      "evals-retrieval"
    ]
  },
  {
    "id": "source-attribution",
    "label": "Attribution, source",
    "sections": [
      3,
      14,
      15
    ],
    "seeAlso": [
      "citation-completeness",
      "citation-precision"
    ]
  },
  {
    "id": "authorization",
    "label": "Authorization",
    "sections": [
      2,
      11,
      19,
      20
    ],
    "seeAlso": [
      "access-control-lists",
      "least-privilege",
      "permission-boundaries"
    ]
  },
  {
    "id": "caching-exact",
    "label": "Caching, exact-response",
    "sections": [
      4
    ],
    "seeAlso": [
      "caching-prefix",
      "caching-semantic"
    ]
  },
  {
    "id": "caching-invalidation",
    "label": "Caching, invalidation",
    "sections": [
      4,
      20
    ],
    "seeAlso": [
      "freshness",
      "versioning"
    ]
  },
  {
    "id": "caching-isolation",
    "label": "Caching, isolation",
    "sections": [
      4,
      20
    ],
    "seeAlso": [
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "caching-prefix",
    "label": "Caching, prompt/prefix",
    "sections": [
      4,
      6
    ],
    "seeAlso": [
      "kv-cache"
    ]
  },
  {
    "id": "caching-semantic",
    "label": "Caching, semantic response",
    "sections": [
      4,
      20,
      23
    ],
    "seeAlso": [
      "caching-isolation",
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "calibration-data",
    "label": "Calibration data",
    "sections": [
      9
    ],
    "seeAlso": [
      "quantization"
    ]
  },
  {
    "id": "chunked-prefill",
    "label": "Chunked prefill",
    "sections": [
      5,
      7
    ],
    "seeAlso": [
      "continuous-batching",
      "prefill"
    ]
  },
  {
    "id": "chunking",
    "label": "Chunking",
    "sections": [
      14
    ],
    "seeAlso": [
      "rag"
    ]
  },
  {
    "id": "citation-completeness",
    "label": "Citation completeness",
    "sections": [
      15
    ],
    "seeAlso": [
      "claim-support-rate",
      "source-attribution"
    ]
  },
  {
    "id": "citation-precision",
    "label": "Citation precision",
    "sections": [
      15
    ],
    "seeAlso": [
      "grounding"
    ]
  },
  {
    "id": "claim-support-rate",
    "label": "Claim support rate",
    "sections": [
      15
    ],
    "seeAlso": [
      "answer-correctness",
      "citation-completeness"
    ]
  },
  {
    "id": "context-engineering",
    "label": "Context engineering",
    "sections": [
      2,
      3
    ],
    "seeAlso": [
      "context-manifest",
      "context-packing",
      "harness-engineering",
      "prompt-engineering"
    ]
  },
  {
    "id": "context-manifest",
    "label": "Context manifest",
    "sections": [
      3,
      17
    ],
    "seeAlso": [
      "observability",
      "versioning"
    ]
  },
  {
    "id": "context-packing",
    "label": "Context packing",
    "sections": [
      14,
      15
    ],
    "seeAlso": [
      "rag"
    ]
  },
  {
    "id": "continuous-batching",
    "label": "Continuous batching",
    "sections": [
      7
    ],
    "seeAlso": [
      "goodput",
      "paged-attention"
    ]
  },
  {
    "id": "cost-attribution",
    "label": "Cost attribution",
    "sections": [
      18
    ],
    "seeAlso": [
      "observability"
    ]
  },
  {
    "id": "dlp",
    "label": "Data loss prevention (DLP)",
    "sections": [
      19
    ],
    "seeAlso": [
      "permission-boundaries",
      "prompt-injection"
    ]
  },
  {
    "id": "decode",
    "label": "Decode",
    "sections": [
      5,
      7,
      8,
      9
    ],
    "seeAlso": [
      "inter-token-latency",
      "prefill"
    ]
  },
  {
    "id": "degraded-mode",
    "label": "Degraded mode",
    "sections": [
      13
    ],
    "seeAlso": [
      "fallback-chains",
      "model-routing"
    ]
  },
  {
    "id": "dense-retrieval",
    "label": "Dense retrieval",
    "sections": [
      14
    ],
    "seeAlso": [
      "embeddings",
      "hybrid-search",
      "vector-index"
    ]
  },
  {
    "id": "distillation",
    "label": "Distillation",
    "sections": [
      8,
      21
    ],
    "seeAlso": [
      "fine-tuning",
      "quantization"
    ]
  },
  {
    "id": "drift",
    "label": "Drift",
    "sections": [
      16,
      17,
      18
    ],
    "seeAlso": [
      "evals",
      "observability"
    ]
  },
  {
    "id": "embeddings",
    "label": "Embeddings",
    "sections": [
      14
    ],
    "seeAlso": [
      "dense-retrieval",
      "vector-index"
    ]
  },
  {
    "id": "evals",
    "label": "Evals",
    "sections": [
      16
    ]
  },
  {
    "id": "evals-adversarial",
    "label": "Evals, adversarial",
    "sections": [
      16,
      19
    ],
    "seeAlso": [
      "prompt-injection"
    ]
  },
  {
    "id": "evals-golden-sets",
    "label": "Evals, golden sets",
    "sections": [
      16
    ],
    "seeAlso": [
      "evals-regression"
    ]
  },
  {
    "id": "evals-human",
    "label": "Evals, human",
    "sections": [
      16
    ],
    "seeAlso": [
      "evals-llm-judge"
    ]
  },
  {
    "id": "evals-llm-judge",
    "label": "Evals, LLM-as-judge",
    "sections": [
      16
    ],
    "seeAlso": [
      "evals-human"
    ]
  },
  {
    "id": "evals-regression",
    "label": "Evals, regression",
    "sections": [
      16,
      23,
      24
    ],
    "seeAlso": [
      "evals-golden-sets"
    ]
  },
  {
    "id": "evals-retrieval",
    "label": "Evals, retrieval",
    "sections": [
      15
    ],
    "seeAlso": [
      "precision-at-k",
      "recall-at-k"
    ]
  },
  {
    "id": "fallback-chains",
    "label": "Fallback chains",
    "sections": [
      10,
      13,
      23
    ],
    "seeAlso": [
      "degraded-mode",
      "model-routing"
    ]
  },
  {
    "id": "fine-tuning",
    "label": "Fine-tuning",
    "sections": [
      21
    ],
    "seeAlso": [
      "distillation",
      "icl",
      "rag"
    ]
  },
  {
    "id": "fp8",
    "label": "FP8",
    "sections": [
      9
    ],
    "seeAlso": [
      "quantization"
    ]
  },
  {
    "id": "freshness",
    "label": "Freshness",
    "sections": [
      14,
      15,
      23,
      24
    ],
    "seeAlso": [
      "caching-invalidation"
    ]
  },
  {
    "id": "function-calling",
    "label": "Function calling",
    "see": "tool-calling"
  },
  {
    "id": "golden-sets",
    "label": "Golden sets",
    "see": "evals-golden-sets"
  },
  {
    "id": "goodput",
    "label": "Goodput",
    "sections": [
      7,
      22
    ],
    "seeAlso": [
      "continuous-batching",
      "slos"
    ]
  },
  {
    "id": "gptq",
    "label": "GPTQ",
    "sections": [
      9
    ],
    "seeAlso": [
      "int4",
      "quantization",
      "weight-only-quantization"
    ]
  },
  {
    "id": "grounding",
    "label": "Grounding",
    "sections": [
      14,
      15,
      16
    ],
    "seeAlso": [
      "claim-support-rate",
      "rag"
    ]
  },
  {
    "id": "gqa",
    "label": "Grouped-query attention (GQA)",
    "sections": [
      6
    ],
    "seeAlso": [
      "kv-cache",
      "mqa"
    ]
  },
  {
    "id": "hallucination",
    "label": "Hallucination",
    "sections": [
      23
    ],
    "seeAlso": [
      "grounding",
      "tool-calling"
    ]
  },
  {
    "id": "harness-engineering",
    "label": "Harness engineering",
    "sections": [
      2
    ],
    "seeAlso": [
      "agents-guardrails",
      "context-engineering"
    ]
  },
  {
    "id": "hybrid-search",
    "label": "Hybrid search",
    "sections": [
      14
    ],
    "seeAlso": [
      "dense-retrieval",
      "rrf",
      "reranking"
    ]
  },
  {
    "id": "idempotency",
    "label": "Idempotency",
    "sections": [
      11,
      23,
      24
    ],
    "seeAlso": [
      "tool-receipts"
    ]
  },
  {
    "id": "icl",
    "label": "In-context learning (ICL)",
    "sections": [
      21
    ],
    "seeAlso": [
      "context-engineering",
      "fine-tuning"
    ]
  },
  {
    "id": "indirect-prompt-injection",
    "label": "Indirect prompt injection",
    "sections": [
      19,
      23
    ],
    "seeAlso": [
      "prompt-injection",
      "rag"
    ]
  },
  {
    "id": "int4",
    "label": "INT4",
    "sections": [
      9
    ],
    "seeAlso": [
      "awq",
      "gptq"
    ]
  },
  {
    "id": "int8",
    "label": "INT8",
    "sections": [
      9
    ],
    "seeAlso": [
      "quantization"
    ]
  },
  {
    "id": "inter-token-latency",
    "label": "Inter-token latency (ITL)",
    "sections": [
      5,
      7,
      17,
      22
    ],
    "seeAlso": [
      "decode",
      "tail-latency",
      "ttft"
    ]
  },
  {
    "id": "kv-cache",
    "label": "KV cache",
    "sections": [
      4,
      6,
      7
    ],
    "seeAlso": [
      "gqa",
      "mqa",
      "paged-attention"
    ]
  },
  {
    "id": "kv-cache-quantization",
    "label": "KV cache, quantization",
    "sections": [
      6
    ],
    "seeAlso": [
      "quantization"
    ]
  },
  {
    "id": "least-privilege",
    "label": "Least privilege",
    "sections": [
      11,
      19
    ],
    "seeAlso": [
      "authorization",
      "permission-boundaries"
    ]
  },
  {
    "id": "load-shedding",
    "label": "Load shedding",
    "sections": [
      6,
      7
    ],
    "seeAlso": [
      "admission-control",
      "degraded-mode"
    ]
  },
  {
    "id": "mrr",
    "label": "Mean reciprocal rank (MRR)",
    "sections": [
      15
    ],
    "seeAlso": [
      "evals-retrieval"
    ]
  },
  {
    "id": "model-routing",
    "label": "Model routing",
    "sections": [
      13
    ],
    "seeAlso": [
      "degraded-mode",
      "fallback-chains"
    ]
  },
  {
    "id": "mqa",
    "label": "Multi-query attention (MQA)",
    "sections": [
      6
    ],
    "seeAlso": [
      "gqa",
      "kv-cache"
    ]
  },
  {
    "id": "multi-tenant-isolation",
    "label": "Multi-tenant isolation",
    "sections": [
      20
    ],
    "seeAlso": [
      "access-control-lists",
      "caching-isolation",
      "quotas"
    ]
  },
  {
    "id": "ndcg",
    "label": "Normalized discounted cumulative gain (nDCG)",
    "sections": [
      15
    ],
    "seeAlso": [
      "evals-retrieval"
    ]
  },
  {
    "id": "observability",
    "label": "Observability",
    "sections": [
      17
    ],
    "seeAlso": [
      "cost-attribution",
      "drift",
      "traces-spans"
    ]
  },
  {
    "id": "paged-attention",
    "label": "PagedAttention",
    "sections": [
      6,
      7
    ],
    "seeAlso": [
      "continuous-batching",
      "kv-cache"
    ]
  },
  {
    "id": "permission-boundaries",
    "label": "Permission boundaries",
    "sections": [
      19
    ],
    "seeAlso": [
      "authorization",
      "least-privilege"
    ]
  },
  {
    "id": "precision-at-k",
    "label": "Precision@k",
    "sections": [
      15
    ],
    "seeAlso": [
      "recall-at-k",
      "reranking"
    ]
  },
  {
    "id": "prefill",
    "label": "Prefill",
    "sections": [
      4,
      5,
      6,
      7
    ],
    "seeAlso": [
      "chunked-prefill",
      "caching-prefix",
      "ttft"
    ]
  },
  {
    "id": "prompt-engineering",
    "label": "Prompt engineering",
    "sections": [
      2
    ],
    "seeAlso": [
      "context-engineering",
      "harness-engineering"
    ]
  },
  {
    "id": "prompt-injection",
    "label": "Prompt injection",
    "sections": [
      19,
      23
    ],
    "seeAlso": [
      "dlp",
      "indirect-prompt-injection"
    ]
  },
  {
    "id": "quantization",
    "label": "Quantization",
    "sections": [
      8,
      9
    ],
    "seeAlso": [
      "awq",
      "fp8",
      "gptq",
      "int4",
      "int8",
      "kv-cache-quantization"
    ]
  },
  {
    "id": "quotas",
    "label": "Quotas",
    "sections": [
      6,
      7,
      20
    ],
    "seeAlso": [
      "admission-control",
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "recall-at-k",
    "label": "Recall@k",
    "sections": [
      15
    ],
    "seeAlso": [
      "precision-at-k",
      "evals-retrieval"
    ]
  },
  {
    "id": "rrf",
    "label": "Reciprocal rank fusion (RRF)",
    "sections": [
      14
    ],
    "seeAlso": [
      "hybrid-search"
    ]
  },
  {
    "id": "repair-loops",
    "label": "Repair loops",
    "sections": [
      10
    ],
    "seeAlso": [
      "schema-validation",
      "structured-outputs"
    ]
  },
  {
    "id": "reranking",
    "label": "Reranking",
    "sections": [
      14,
      15
    ],
    "seeAlso": [
      "hybrid-search",
      "rag"
    ]
  },
  {
    "id": "rag",
    "label": "Retrieval-augmented generation (RAG)",
    "sections": [
      14,
      21
    ],
    "seeAlso": [
      "chunking",
      "freshness",
      "grounding"
    ]
  },
  {
    "id": "schema-validation",
    "label": "Schema validation",
    "sections": [
      10,
      11
    ],
    "seeAlso": [
      "structured-outputs",
      "tool-contracts"
    ]
  },
  {
    "id": "slos",
    "label": "Service-level objectives (SLOs)",
    "sections": [
      1,
      5,
      7,
      24
    ],
    "seeAlso": [
      "goodput",
      "tail-latency"
    ]
  },
  {
    "id": "speculative-decoding",
    "label": "Speculative decoding",
    "sections": [
      8
    ],
    "seeAlso": [
      "decode",
      "quantization"
    ]
  },
  {
    "id": "structured-outputs",
    "label": "Structured outputs",
    "sections": [
      10
    ],
    "seeAlso": [
      "repair-loops",
      "schema-validation"
    ]
  },
  {
    "id": "tail-latency",
    "label": "Tail latency",
    "sections": [
      5,
      17,
      22
    ],
    "seeAlso": [
      "inter-token-latency",
      "slos",
      "ttft"
    ]
  },
  {
    "id": "ttft",
    "label": "Time to first token (TTFT)",
    "sections": [
      5,
      7,
      17,
      22
    ],
    "seeAlso": [
      "prefill",
      "tail-latency"
    ]
  },
  {
    "id": "token-budgets",
    "label": "Token budgets",
    "sections": [
      3,
      12
    ],
    "seeAlso": [
      "agents-budgets",
      "context-engineering"
    ]
  },
  {
    "id": "tool-budgets",
    "label": "Tool budgets",
    "sections": [
      12
    ],
    "seeAlso": [
      "agents-budgets"
    ]
  },
  {
    "id": "tool-calling",
    "label": "Tool calling",
    "sections": [
      11
    ],
    "seeAlso": [
      "idempotency",
      "tool-contracts"
    ]
  },
  {
    "id": "tool-contracts",
    "label": "Tool contracts",
    "sections": [
      1,
      2,
      11
    ],
    "seeAlso": [
      "authorization",
      "schema-validation"
    ]
  },
  {
    "id": "tool-receipts",
    "label": "Tool execution receipts",
    "sections": [
      11,
      23
    ],
    "seeAlso": [
      "idempotency"
    ]
  },
  {
    "id": "traces-spans",
    "label": "Traces and spans",
    "sections": [
      17
    ],
    "seeAlso": [
      "observability"
    ]
  },
  {
    "id": "vector-index",
    "label": "Vector index",
    "sections": [
      14,
      20
    ],
    "seeAlso": [
      "dense-retrieval",
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "versioning",
    "label": "Versioning",
    "sections": [
      2,
      3,
      4,
      10,
      11,
      14,
      16,
      17,
      18
    ],
    "seeAlso": [
      "context-manifest",
      "evals",
      "observability"
    ]
  },
  {
    "id": "weight-only-quantization",
    "label": "Weight-only quantization",
    "sections": [
      9
    ],
    "seeAlso": [
      "awq",
      "gptq",
      "int4"
    ]
  },
  {
    "id": "deterministic-tools",
    "label": "Deterministic tools",
    "sections": [
      11
    ],
    "seeAlso": [
      "tool-calling",
      "tool-contracts"
    ]
  },
  {
    "id": "kv-cache-reservation",
    "label": "KV cache, reservation",
    "sections": [
      6
    ],
    "seeAlso": [
      "admission-control",
      "kv-cache",
      "quotas"
    ]
  },
  {
    "id": "mcp-version-negotiation",
    "label": "MCP version negotiation",
    "sections": [
      11,
      13
    ],
    "seeAlso": [
      "tool-contracts",
      "versioning"
    ]
  },
  {
    "id": "model-lifecycle",
    "label": "Model lifecycle",
    "sections": [
      13
    ],
    "seeAlso": [
      "degraded-mode",
      "versioning"
    ]
  },
  {
    "id": "processing-geography",
    "label": "Processing geography",
    "sections": [
      13,
      20
    ],
    "seeAlso": [
      "multi-tenant-isolation",
      "permission-boundaries"
    ]
  },
  {
    "id": "provider-resolved-identity",
    "label": "Provider-resolved identity",
    "sections": [
      20
    ],
    "seeAlso": [
      "authorization",
      "multi-tenant-isolation"
    ]
  },
  {
    "id": "server-side-request-forgery",
    "label": "Server-side request forgery (SSRF)",
    "sections": [
      19
    ],
    "seeAlso": [
      "authorization",
      "permission-boundaries"
    ]
  },
  {
    "id": "serving-engine-security",
    "label": "Serving-engine security",
    "sections": [
      20
    ],
    "seeAlso": [
      "continuous-batching",
      "multi-tenant-isolation"
    ]
  }
];
