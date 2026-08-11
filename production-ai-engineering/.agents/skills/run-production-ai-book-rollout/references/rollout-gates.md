# Rollout stages and gates

Advance one stage at a time. A plan can span all stages, but execution moves only when the active stage's exit gate has evidence. Record gate status in `marketing/rollout-state.md` as `not started`, `in progress`, `blocked`, or `met`.

## Stage 1 — Recover the checkpoint

1. Read the rollout state and any launch brief or scorecard.
2. Inspect current product and automation authority.
3. Check the working tree and protect unrelated changes.
4. List confirmed facts, prior decisions, assumptions, unknowns, and approvals.
5. Select one active stage and one concrete next action.

Exit gate: the current state, active stage, and next action are explicit. No external approval is required for this read-only work.

## Stage 2 — Confirm the offer

1. Choose recurring `$5/month` or one-time `$5`; do not blur the two.
2. Name the primary buyer and the expensive problem the book helps them avoid.
3. Define exactly what payment includes: current PDF, future editions, weekly update format, archive access, and cancellation behavior.
4. Decide what remains public as an ungated sample.
5. Set a launch window, founding-cohort size, and support contact.
6. Draft plain-language billing, renewal, cancellation, and refund terms for qualified review.

Exit gate: the user explicitly approves the price model, recurring promise, public sample boundary, and customer-facing terms. Approval of the concept alone is insufficient.

## Stage 3 — Prove purchase-to-access readiness

1. Prepare a focused sales page with audience, problem, contents, update promise, price, and cancellation disclosure.
2. Prepare an ungated sample that demonstrates the book's practical depth without exposing the paid artifact.
3. Implement or inspect checkout in test mode.
4. Test successful payment, failed payment, receipt, gated download, expired link, cancellation, renewal, refund, and support recovery.
5. Remove or replace public direct-download paths before promotion.
6. Verify consent records, subscriber status, analytics events, and access revocation.
7. Prepare the first paid update before inviting buyers.

Exit gate: every critical test has evidence, no public bypass remains, cancellation works, and the first paid update is ready. Obtain separate approval before production deployment or live billing configuration.

## Stage 4 — Run the founding cohort

1. Define a qualified prospect: senior/staff/principal software, platform, ML, or AI engineer; engineering manager; or technical founder shipping LLM systems.
2. Build a private prospect list outside Git.
3. Draft a short invitation that states why the person is relevant, what they receive, the price, and what feedback is requested.
4. Prepare onboarding, an access check, and a 20-minute interview guide.
5. Start with a recommended target of 20 qualified invitations and five paid founding customers; treat this as a learning target, not manufactured scarcity.
6. Sanitize findings before recording them in the repository.

Exit gate: recipients and exact copy are approved before sending. Expansion requires successful access for all paid founders, at least three useful conversations, and no unresolved delivery blocker.

## Stage 5 — Activate customers and learn

1. Confirm each founder can reach the PDF and understands the weekly promise.
2. Send or prepare the first approved weekly update on the promised cadence.
3. Record access failures, support demand, purchase objections, and language customers use.
4. Distinguish product-value problems from checkout, delivery, or message problems.
5. Revise the offer or flow only after naming which observation the change addresses.

Exit gate: activation and support evidence meet the approved targets, and the offer language reflects observed buyer needs. Resolve delivery failures before adding traffic.

## Stage 6 — Prepare and run public launch

1. Reverify the current rules for every planned channel.
2. Build a two-week calendar with one primary call to action and channel-native drafts.
3. Use LinkedIn personal posts as the default backbone; use an ungated excerpt for discovery.
4. Use Hacker News or Reddit only when community fit and rules are satisfied.
5. Exclude channels that do not admit books or would require spam-like repetition.
6. Confirm checkout, analytics, support coverage, and rollback behavior immediately before launch.

Exit gate: the launch date, exact drafts, destinations, and each external action are explicitly approved. Recheck the purchase path on launch day before publishing.

## Stage 7 — Operate the weekly engine

1. Start from an approved, published handbook change or an independently approved subscriber update.
2. Package one concise paid update: what changed, why it matters, and what to do.
3. Prepare one public excerpt that demonstrates value without duplicating the paid update.
4. Add one retention touch, such as a practical checklist or implementation prompt.
5. Record publishing time, delivery errors, support demand, and the next hypothesis.
6. Never market a candidate review as shipped content.

Exit gate: the paid update is source-backed and approved, delivery is tested, and the public excerpt has a separate publish approval.

## Stage 8 — Review renewal evidence

1. Update the scorecard using stable metric definitions.
2. Review conversion, activation, renewal, churn, refunds, delivery failures, support load, and weekly publishing effort.
3. Combine behavior with sanitized customer interviews; do not decide from likes or email opens alone.
4. Recommend one of: continue unchanged, revise one hypothesis, pause acquisition, or scale one proven channel.
5. Name the evidence that would reverse the recommendation.

Exit gate: the user approves any change to price, promise, channel, budget, or cadence. Preserve the previous decision and rationale in the state file.

## Approval matrix

| Action | May prepare locally | Explicit approval before action |
| --- | --- | --- |
| Audit, plan, draft, or create local templates | Yes | No |
| Publish a page, post, sample, PDF, or update | Yes | Yes |
| Send email, DM, invitation, survey, or partner pitch | Yes | Yes |
| Configure test-mode billing | Yes, when implementation is requested | No external charge; deployment may still require approval |
| Configure live billing, charge, refund, or change terms | Draft only | Yes |
| Deploy production changes or buy ads | Draft only | Yes |
| Edit handbook, PDF, automation, or release process | No under this skill | Separate explicit authorization |
