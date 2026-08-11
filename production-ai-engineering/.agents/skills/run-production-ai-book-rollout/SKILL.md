---
name: run-production-ai-book-rollout
description: Plan, prepare, launch, and iterate the $5 paid Production AI Engineering PDF and weekly-update subscription. Use when asked to create, continue, assess, or execute the rollout; prepare launch assets, founding-customer outreach, weekly campaigns, scorecards, or renewal experiments; or determine the next rollout step.
---

# Run Production AI Book Rollout

Advance the book from its current checkpoint through one safe, evidence-backed rollout stage at a time. Preserve a durable state file, expose assumptions, and require approval before any external or commercial action.

## Start every run

1. Read `marketing/rollout-state.md` when it exists. Do not repeat answered questions.
2. Read [project-authority.md](references/project-authority.md). Inspect the named source files when current facts matter.
3. Inspect the working tree. Preserve unrelated changes and do not edit handbook or automation sources.
4. Identify the current stage and its unmet exit gate in [rollout-gates.md](references/rollout-gates.md).
5. Ask no more than three questions needed for the next decision. Give a recommended default when one is safe.
6. If the user says to continue without answering, proceed only on clearly labeled, reversible assumptions. Stop for choices affecting charges, promises, recipients, publication, deployment, or spend.
7. Use `$write-like-mike` for customer-facing copy and rollout prose when that skill is available.

## Choose the operating mode

- **Orient or plan:** recover state, surface unknowns, and break the current stage into ordered actions.
- **Prepare:** draft or inspect the offer, sample, sales page, delivery flow, support path, analytics, or first paid update.
- **Founding cohort:** define prospects, draft invitations, prepare onboarding and interviews, and assess activation.
- **Public launch:** build a channel calendar and draft channel-specific material after verifying current platform rules.
- **Weekly run:** package one approved update, one public excerpt, one retention touch, and the next hypothesis.
- **Review or decide:** update the scorecard and recommend continue, revise, pause, or scale.

## Work stage by stage

Follow these stages in order unless the state file shows their exit gates are already met:

1. Recover the checkpoint.
2. Confirm the offer.
3. Prove purchase-to-access readiness.
4. Run a founding cohort.
5. Activate customers and learn.
6. Prepare and run the public launch.
7. Operate the weekly publishing engine.
8. Review renewal evidence and decide what changes.

Load [rollout-gates.md](references/rollout-gates.md) for the detailed checklist and approval point for the active stage. Load [metrics-and-decisions.md](references/metrics-and-decisions.md) when defining instrumentation, reviewing a cohort, or making a continue/revise/pause/scale decision. Load [channel-verification.md](references/channel-verification.md) before channel-specific recommendations or drafts.

## Apply authority and evidence rules

- Treat the published handbook and PDF as product-fact authority.
- Treat automation output as an unreleased candidate until the existing manual review and promotion process approves it.
- Separate sourced facts, observed customer evidence, assumptions, and marketing inference.
- Never invent testimonials, outcomes, scarcity, subscriber counts, or technical claims.
- Keep customer and prospect PII, payment data, credentials, and private interview notes out of Git.
- Flag legal, tax, privacy, refund, and consent decisions for qualified review; do not present them as settled advice.

## Enforce approval gates

Drafting, analysis, local read-only inspection, and creation of rollout artifacts are allowed. Obtain explicit user approval before any of the following:

- publishing a post, page, sample, update, or PDF;
- sending email, DMs, invitations, surveys, or partner outreach;
- configuring live billing, charging a customer, changing price or terms, issuing a refund, or buying ads;
- deploying code or changing a production service;
- modifying the manuscript, generated handbook, PDF, weekly automation, or release process;
- using a real recipient list or adding personal data to project files.

Never interpret approval of a plan or draft as approval to perform the external action.

## Output contract

Use the templates in `assets/templates/` when creating a missing artifact:

- `rollout-state.md` for `marketing/rollout-state.md`;
- `launch-brief.md` for the approved offer and step-by-step launch;
- `weekly-campaign.md` for the paid/public weekly bundle;
- `interview-notes.md` for sanitized research notes;
- `scorecard.md` for metric definitions and decisions.

At the end of every run:

1. Update `marketing/rollout-state.md` with facts learned, assumptions made, approvals received, risks, and stage-gate status.
2. Name one concrete next action, its owner, and its completion evidence.
3. List up to three unanswered questions, ordered by what blocks the next gate.
4. Tell the user which files changed and which external actions remain unapproved.

## Edge cases and fallbacks

- If no state file exists, create one from `assets/templates/rollout-state.md`, label all unapproved choices as assumptions, and start at Stage 1.
- If authority files disagree with the state, preserve the prior record, update the current fact with its source and check date, and explain the drift.
- If the user says “continue” without answering, advance only reversible local planning and keep the unanswered decision at its gate.
- If the full paid artifact remains publicly accessible, mark readiness blocked; a checkout that can be bypassed is not launch-ready.
- If a weekly review produces no approved material change, do not invent one. Prepare a source-backed field note from published material or state plainly that no edition change shipped.
- If no owned audience exists, prepare a relationship-building and sample-distribution plan; do not substitute mass unsolicited outreach.
- If the user requests an external action without approving its exact scope, prepare the final draft and approval summary, then stop.
- If a request is to rewrite the book or alter the release system, explain that it falls outside this skill and require a separately authorized task.

## Representative requests

- “Continue the handbook rollout from the current checkpoint.” Recover state, select the active gate, advance one safe step, and update the state.
- “We got four sales from 40 invitations. What next?” Load the scorecard rules, separate message, checkout, access, and value evidence, then recommend one bounded test.
- “Prepare next week’s subscriber update and LinkedIn excerpt.” Confirm the source is published, create separate paid and public drafts, and leave both external actions unapproved.
- “Publish the launch post and email everyone.” Verify exact copy, recipients, channel rules, and explicit approval; otherwise draft and stop.
- “Rewrite Chapter 3.” Do not route this through the rollout workflow because handbook editing is outside the skill boundary.
