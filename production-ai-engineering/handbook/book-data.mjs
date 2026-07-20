export const CITATION_GROUPS = [
  {
    title: "Harness, context, outputs, and tools",
    entries: [
      {
        label: "CTX-01",
        citation: "Anthropic. \"Effective context engineering for AI agents.\" 29 September 2025.",
        url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
        accessed: true,
      },
      {
        label: "CTX-02",
        citation: "Liu, Nelson F., et al. \"Lost in the Middle: How Language Models Use Long Contexts.\" Transactions of the Association for Computational Linguistics 12 (2024): 157-173.",
        url: "https://aclanthology.org/2024.tacl-1.9/",
      },
      {
        label: "AGT-01",
        citation: "Anthropic. \"Building effective agents.\" 19 December 2024.",
        url: "https://www.anthropic.com/engineering/building-effective-agents",
        accessed: true,
      },
      {
        label: "TOOL-01",
        citation: "Anthropic. \"Writing effective tools for AI agents: using AI agents.\"",
        url: "https://www.anthropic.com/engineering/writing-tools-for-agents",
        accessed: true,
      },
      {
        label: "CACHE-01",
        citation: "OpenAI. \"Prompt caching.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/prompt-caching",
        accessed: true,
      },
      {
        label: "CACHE-02",
        citation: "Microsoft. \"Get cached responses of large language model API requests.\" Azure API Management documentation. Updated 24 February 2026.",
        url: "https://learn.microsoft.com/en-us/azure/api-management/llm-semantic-cache-lookup-policy",
        accessed: true,
      },
      {
        label: "OUT-01",
        citation: "OpenAI. \"Structured model outputs.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/structured-outputs",
        accessed: true,
      },
      {
        label: "OUT-02",
        citation: "JSON Schema. \"Creating your first schema.\"",
        url: "https://json-schema.org/learn/getting-started-step-by-step",
        accessed: true,
      },
      {
        label: "TOOL-02",
        citation: "OpenAI. \"Function calling.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/function-calling",
        accessed: true,
      },
      {
        label: "TOOL-03",
        citation: "Fielding, Roy, Mark Nottingham, and Julian Reschke. \"HTTP Semantics.\" RFC 9110, June 2022, section 9.2.2, \"Idempotent Methods.\"",
        url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods",
      },
      {
        label: "AUTH-01",
        citation: "Model Context Protocol. \"Authorization.\" Protocol specification, 18 June 2025.",
        url: "https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization",
        accessed: true,
      },
      {
        label: "AUTH-02",
        citation: "Model Context Protocol. \"Security Best Practices.\"",
        url: "https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices",
        accessed: true,
      },
    ],
  },
  {
    title: "Serving and compression",
    entries: [
      {
        label: "SERV-01",
        citation: "Kwon, Woosuk, et al. \"Efficient Memory Management for Large Language Model Serving with PagedAttention.\" SOSP 2023.",
        url: "https://arxiv.org/abs/2309.06180",
      },
      {
        label: "SERV-02",
        citation: "Yu, Gyeong-In, et al. \"Orca: A Distributed Serving System for Transformer-Based Generative Models.\" OSDI 2022.",
        url: "https://www.usenix.org/conference/osdi22/presentation/yu",
      },
      {
        label: "SERV-03",
        citation: "Agrawal, Amey, et al. \"Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve.\" OSDI 2024.",
        url: "https://www.usenix.org/conference/osdi24/presentation/agrawal",
      },
      {
        label: "SERV-04",
        citation: "vLLM Project. \"vLLM documentation.\"",
        url: "https://docs.vllm.ai/en/latest/",
        accessed: true,
      },
      {
        label: "SERV-05",
        citation: "OpenAI. \"Latency optimization.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/latency-optimization",
        accessed: true,
      },
      {
        label: "SPEC-01",
        citation: "Leviathan, Yaniv, Matan Kalman, and Yossi Matias. \"Fast Inference from Transformers via Speculative Decoding.\" ICML 2023.",
        url: "https://proceedings.mlr.press/v202/leviathan23a.html",
      },
      {
        label: "QUANT-01",
        citation: "Micikevicius, Paulius, et al. \"FP8 Formats for Deep Learning.\" arXiv:2209.05433, 2022.",
        url: "https://arxiv.org/abs/2209.05433",
      },
      {
        label: "QUANT-02",
        citation: "Xiao, Guangxuan, et al. \"SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models.\" ICML 2023.",
        url: "https://proceedings.mlr.press/v202/xiao23c.html",
      },
      {
        label: "QUANT-03",
        citation: "Lin, Ji, et al. \"AWQ: Activation-aware Weight Quantization for On-Device LLM Compression and Acceleration.\" MLSys 2024.",
        url: "https://proceedings.mlsys.org/paper_files/paper/2024/hash/42a452cbafa9dd64e9ba4aa95cc1ef21-Abstract-Conference.html",
      },
      {
        label: "QUANT-04",
        citation: "Frantar, Elias, et al. \"GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers.\" ICLR 2023.",
        url: "https://arxiv.org/abs/2210.17323",
      },
      {
        label: "DIST-01",
        citation: "Hinton, Geoffrey, Oriol Vinyals, and Jeff Dean. \"Distilling the Knowledge in a Neural Network.\" arXiv:1503.02531, 2015.",
        url: "https://arxiv.org/abs/1503.02531",
      },
    ],
  },
  {
    title: "Retrieval and evaluation",
    entries: [
      {
        label: "RAG-01",
        citation: "Lewis, Patrick, et al. \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.\" NeurIPS 2020.",
        url: "https://papers.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html",
      },
      {
        label: "RAG-02",
        citation: "Elastic. \"Hybrid search.\" Elastic documentation.",
        url: "https://www.elastic.co/docs/solutions/search/hybrid-search",
        accessed: true,
      },
      {
        label: "RAG-03",
        citation: "Microsoft. \"Grounding Data Design for AI Workloads on Azure.\" Azure Well-Architected Framework.",
        url: "https://learn.microsoft.com/en-us/azure/well-architected/ai/grounding-data-design",
        accessed: true,
      },
      {
        label: "RETR-01",
        citation: "Thakur, Nandan, et al. \"BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models.\" NeurIPS 2021 Datasets and Benchmarks.",
        url: "https://datasets-benchmarks-proceedings.neurips.cc/paper/2021/hash/65b9eea6e1cc6bb9f0cd2a47751a186f-Abstract-round2.html",
      },
      {
        label: "RETR-02",
        citation: "Muennighoff, Niklas, et al. \"MTEB: Massive Text Embedding Benchmark.\" EACL 2023.",
        url: "https://aclanthology.org/2023.eacl-main.148/",
      },
      {
        label: "RETR-03",
        citation: "Ru, Dongyu, et al. \"RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation.\" arXiv:2408.08067, 2024.",
        url: "https://arxiv.org/abs/2408.08067",
      },
      {
        label: "RETR-04",
        citation: "Es, Shahul, et al. \"RAGAs: Automated Evaluation of Retrieval Augmented Generation.\" EACL 2024 System Demonstrations.",
        url: "https://aclanthology.org/2024.eacl-demo.16/",
      },
      {
        label: "RETR-05",
        citation: "Gao, Tianyu, et al. \"Enabling Large Language Models to Generate Text with Citations.\" EMNLP 2023: 6465-6488.",
        url: "https://aclanthology.org/2023.emnlp-main.398/",
      },
      {
        label: "EVAL-01",
        citation: "Zheng, Lianmin, et al. \"Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena.\" NeurIPS 2023 Datasets and Benchmarks.",
        url: "https://papers.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html",
      },
      {
        label: "EVAL-02",
        citation: "Anthropic. \"Demystifying evals for AI agents.\" 9 January 2026.",
        url: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
        accessed: true,
      },
      {
        label: "EVAL-03",
        citation: "OpenAI. \"Working with evals.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/evals",
        accessed: true,
      },
    ],
  },
  {
    title: "Observability and economics",
    entries: [
      {
        label: "OBS-01",
        citation: "OpenTelemetry. \"Semantic conventions for generative AI systems.\"",
        url: "https://github.com/open-telemetry/semantic-conventions-genai",
        accessed: true,
      },
      {
        label: "OBS-02",
        citation: "National Institute of Standards and Technology. \"Measure.\" AI Risk Management Framework Playbook.",
        url: "https://airc.nist.gov/airmf-resources/playbook/measure/",
        accessed: true,
      },
      {
        label: "COST-01",
        citation: "OpenAI. \"Costs.\" Organization Usage and Costs API reference.",
        url: "https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs",
        accessed: true,
      },
      {
        label: "COST-02",
        citation: "FinOps Foundation. \"Capability: Unit Economics.\"",
        url: "https://www.finops.org/framework/capabilities/unit-economics/",
        accessed: true,
      },
    ],
  },
  {
    title: "Security and tenancy",
    entries: [
      {
        label: "SAFE-01",
        citation: "OWASP GenAI Security Project. \"LLM01:2025 Prompt Injection.\"",
        url: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
        accessed: true,
      },
      {
        label: "SAFE-02",
        citation: "Microsoft. \"Defend against indirect prompt injection attacks.\" Microsoft Learn.",
        url: "https://learn.microsoft.com/en-us/security/zero-trust/sfi/defend-indirect-prompt-injection",
        accessed: true,
      },
      {
        label: "SAFE-03",
        citation: "National Institute of Standards and Technology. Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile. NIST AI 600-1, July 2024.",
        url: "https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf",
      },
      {
        label: "TEN-01",
        citation: "Google Cloud. \"Multi-tenant agentic AI system.\" Cloud Architecture Center.",
        url: "https://docs.cloud.google.com/architecture/multi-tenant-agentic-ai-system",
        accessed: true,
      },
    ],
  },
  {
    title: "Model adaptation",
    entries: [
      {
        label: "OPT-01",
        citation: "OpenAI. \"Model optimization.\" OpenAI API documentation.",
        url: "https://developers.openai.com/api/docs/guides/model-optimization",
        accessed: true,
      },
    ],
  },
];

export const SECTION_SOURCES = {
  1: { labels: ["AGT-01", "CTX-01", "OBS-01"], note: "Author synthesis: the cited sources inform this layered operating model." },
  2: { labels: ["AGT-01", "TOOL-01", "AUTH-01"], note: "Author synthesis: the taxonomy separates prompt, context, and harness responsibilities." },
  3: { labels: ["CTX-01", "CTX-02"] },
  4: { labels: ["CACHE-01", "CACHE-02", "SERV-01"], note: "Author synthesis: the four caches are grouped by what they reuse and how they fail." },
  5: { labels: ["SERV-03", "SERV-04", "SERV-05"] },
  6: { labels: ["SERV-01", "SERV-04"], note: "The KV footprint example follows directly from the model architecture." },
  7: { labels: ["SERV-02", "SERV-03", "SERV-04"] },
  8: { labels: ["SPEC-01", "QUANT-02", "DIST-01"], note: "Author synthesis: the comparison maps each technique to the bottleneck it changes." },
  9: { labels: ["QUANT-01", "QUANT-02", "QUANT-03", "QUANT-04", "SERV-04"] },
  10: { labels: ["OUT-01", "OUT-02"], note: "Author synthesis: repair policy is separated from the rules for consequential actions." },
  11: { labels: ["TOOL-01", "TOOL-02", "TOOL-03", "AUTH-01", "AUTH-02"], note: "Author synthesis: approval, idempotency, and execution receipts form one tool-safety contract." },
  12: { labels: ["AGT-01", "EVAL-02", "AUTH-02"], note: "Author synthesis: agent limits are organized as budgets and explicit terminal states." },
  13: { labels: ["OPT-01", "SERV-05"], note: "Author synthesis: routing decisions are tied to the user's degraded-mode experience." },
  14: { labels: ["RAG-01", "RAG-02", "RAG-03", "TEN-01"] },
  15: { labels: ["RETR-01", "RETR-02", "RETR-03", "RETR-04", "RETR-05"] },
  16: { labels: ["EVAL-01", "EVAL-02", "EVAL-03"] },
  17: { labels: ["OBS-01", "OBS-02"] },
  18: { labels: ["COST-01", "COST-02", "OBS-01"], note: "Author synthesis: the journey-cost formula ties spend to a completed user outcome." },
  19: { labels: ["SAFE-01", "SAFE-02", "SAFE-03", "AUTH-02"] },
  20: { labels: ["TEN-01", "AUTH-01", "AUTH-02", "SAFE-03"], note: "Author synthesis: the isolation checklist spans the cited permission and tenancy boundaries." },
  21: { labels: ["OPT-01", "CTX-01", "RAG-01", "DIST-01"], note: "Author synthesis: the selection matrix matches the intervention to the constraint." },
  22: { labels: ["SERV-05", "SERV-04", "OPT-01", "OBS-01"], note: "Author synthesis: the diagnostic matrix keeps quality, latency, cost, and reliability in one decision." },
  23: { labels: ["OUT-01", "TOOL-01", "SERV-01", "EVAL-02", "SAFE-01", "TEN-01"], note: "Author synthesis: the failure matrix combines the controls in sections 4–20." },
  24: { labels: ["SAFE-03", "OBS-02", "EVAL-02", "TEN-01"], note: "Author synthesis: the operating guidance is recast as a production-readiness checklist." },
  25: { labels: ["EVAL-02", "EVAL-03", "OPT-01"], note: "Author synthesis: the learning order follows the sequence I would use to build the system." },
};

export const citationEntries = CITATION_GROUPS.flatMap(({ entries }) => entries);
export const citationByUrl = new Map(citationEntries.map((entry) => [entry.url, entry]));
export const citationByLabel = new Map(citationEntries.map((entry) => [entry.label, entry]));
