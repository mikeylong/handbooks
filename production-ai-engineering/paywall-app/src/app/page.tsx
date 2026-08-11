import Link from "next/link";
import { OFFER, REFUND_POLICY } from "@/lib/product-policy";

const systemAreas = [
  "Product contracts, service levels, and degraded behavior",
  "Harnesses, context, retrieval, memory, and model routing",
  "Structured outputs, tools, authorization, and termination",
  "Evals, observability, workflow cost, safety, and release gates",
];

export default function HomePage() {
  return (
    <>
      <section className="hero shell">
        <div className="eyebrow">The work after the demo</div>
        <h1>Build AI systems that can hold up in production.</h1>
        <p className="hero-copy">
          A concise, maintained field guide connecting reliability, context,
          inference, tools, evaluation, observability, cost, and safety.
        </p>
        <div className="hero-actions">
          <form action="/api/checkout" method="post">
            <button className="button button-primary" type="submit">
              Get the complete guide · ${OFFER.amountMinor / 100}/month
            </button>
          </form>
          <Link className="button button-secondary" href="/sample">
            Read the free sample
          </Link>
        </div>
        <p className="fine-print">
          Cancel anytime. Access continues through the current paid period.
        </p>
        <p className="fine-print policy-copy">
          {REFUND_POLICY.customerCopy} Policy language is a staging draft pending
          qualified review.
        </p>
      </section>

      <section className="contrast-section">
        <div className="shell split">
          <div>
            <div className="eyebrow">One model call is not the product</div>
            <h2>The surrounding system remains responsible.</h2>
          </div>
          <div>
            <p>
              A model can propose an answer or action. The product still has to
              decide whether it should proceed, prove what happened, recover
              safely, and meet real latency and cost constraints.
            </p>
            <ul className="check-list">
              {systemAreas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="eyebrow">Your subscription</div>
        <h2>The current guide, meaningful editions, and a weekly field note.</h2>
        <div className="card-grid">
          <article className="feature-card">
            <span>01</span>
            <h3>Complete PDF</h3>
            <p>Download the current production AI engineering field guide.</p>
          </article>
          <article className="feature-card">
            <span>02</span>
            <h3>Material editions</h3>
            <p>Get approved new editions released while you subscribe.</p>
          </article>
          <article className="feature-card">
            <span>03</span>
            <h3>Tuesday field note</h3>
            <p>
              See what changed and why—or get one grounded production lesson
              when the edition stays the same.
            </p>
          </article>
        </div>
      </section>

      <section className="shell closing-card">
        <div>
          <div className="eyebrow">Start with the system</div>
          <h2>Read Sections 1–3 without payment or signup.</h2>
        </div>
        <Link className="button button-light" href="/sample">
          Open the free sample
        </Link>
      </section>
    </>
  );
}
