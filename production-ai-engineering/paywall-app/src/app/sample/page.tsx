import Link from "next/link";
import { OFFER } from "@/lib/product-policy";

const layers = [
  ["Product contract", "Success, SLOs, risk, and degraded behavior"],
  ["Harness", "State, tools, retries, budgets, and termination"],
  ["Context", "The smallest high-signal, authorized state for this step"],
  ["Retrieval and memory", "Current, attributable external knowledge"],
  ["Model and serving", "Useful tokens produced efficiently"],
  ["Validation and policy", "Safe action from probabilistic proposals"],
  ["Evals and observability", "Regression detection and explanation"],
];

export default function SamplePage() {
  return (
    <article className="article-shell">
      <header className="article-header">
        <div className="eyebrow">Free sample · Sections 1–3</div>
        <h1>Production AI engineering works as a system.</h1>
        <p>
          The central idea is simple: a model can propose an answer or action.
          The surrounding system decides whether and how it should proceed, and
          remains responsible for the outcome.
        </p>
      </header>

      <section>
        <span className="section-number">01</span>
        <h2>The full system</h2>
        <p>
          Optimize for a successful, policy-compliant user outcome that meets
          service-level objectives for latency and cost. A prompt or model call
          is only one part of that outcome.
        </p>
        <div className="layer-list">
          {layers.map(([name, responsibility]) => (
            <div className="layer-row" key={name}>
              <strong>{name}</strong>
              <span>{responsibility}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <span className="section-number">02</span>
        <h2>Harness engineering, not just prompt engineering</h2>
        <p>
          Prompt engineering shapes instructions. Context engineering selects
          every token supplied for a model step. Harness engineering runs the
          software system around the model.
        </p>
        <p>
          Bind each run to identity, tenant, authorization, policy, schemas,
          prompts, tools, models, and retrieval versions. Then control execution
          with deterministic context assembly, validation, retry classification,
          idempotency, hard budgets, telemetry, and explicit terminal states.
        </p>
        <blockquote>
          Enforce every rule about safety, money, permissions, or termination in
          code. A sentence in a system prompt cannot serve as a security boundary.
        </blockquote>
      </section>

      <section>
        <span className="section-number">03</span>
        <h2>Context engineering, not long prompts</h2>
        <p>
          Treat context as finite working memory with diminishing marginal value.
          More context raises prefill cost and can pull attention away from what
          matters.
        </p>
        <ol className="number-list">
          <li>Start with the invariant contract and hard policies.</li>
          <li>Add the current task and only the authorized state it needs.</li>
          <li>Retrieve fresh, attributable evidence just in time.</li>
          <li>Expose only the actions relevant to this step.</li>
          <li>Keep compact decisions—not an unfiltered transcript.</li>
          <li>Reserve enough output budget before adding more input.</li>
        </ol>
        <p>
          Optimize signal per token, preserve provenance through summarization,
          keep durable decisions in explicit state, and version the context
          manifest so a bad result can be reproduced.
        </p>
      </section>

      <aside className="sample-cta">
        <div>
          <div className="eyebrow">Continue with the complete guide</div>
          <h2>Go from context and harnesses to operating the whole system.</h2>
          <p>
            The complete edition covers inference, caches, structured outputs,
            tools, RAG, evals, observability, cost, safety, and release readiness.
          </p>
        </div>
        <form action="/api/checkout" method="post">
          <button className="button button-light" type="submit">
            Get the guide · ${OFFER.amountMinor / 100}/month
          </button>
        </form>
      </aside>

      <Link className="text-link" href="/">
        Back to the overview
      </Link>
    </article>
  );
}
