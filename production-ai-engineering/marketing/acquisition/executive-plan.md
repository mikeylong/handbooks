# Production AI Engineering acquisition plan

Status: ready for implementation planning; external actions remain unapproved  
Research checkpoint: 2026-08-04  
Selected commerce stack: Next.js, Stripe subscription Checkout, Clerk, Neon, private Vercel Blob

## Executive decision

Use LinkedIn and owned content to establish the first repeatable path from a production problem to the free sample and then to a paid subscription. Treat Reddit, Hacker News, newsletters, podcasts, and practitioner communities as earned distribution that has to be deserved through useful participation. Hold paid media until the organic funnel has produced at least three paid subscribers, all buyers can access the private PDF, and the first Tuesday field note has shipped successfully.

The acquisition loop is:

`useful idea → public teaser → ungated Sections 1–3 sample → clear $5/month offer → verified subscription → working access → useful Tuesday note → renewal or referral`

Impressions and reactions explain reach. The operating decision comes from qualified sample visits, verified subscriptions, successful access, weekly use, and renewal.

## Ideal customer profile

### Primary ICP

Senior, staff, or principal software, platform, ML, or AI engineers who are currently responsible for moving an LLM or agent workflow from a convincing prototype into a production service.

They are likely to recognize at least three of these conditions:

- model quality is only one part of the release decision;
- tool permissions, identity, termination, and recovery are still spread across code and tribal knowledge;
- evals do not yet map cleanly to production failure modes;
- retrieval, context, and memory behavior are hard to inspect;
- token cost does not explain workflow cost;
- the team needs release gates, degraded behavior, and incident evidence;
- new provider and industry guidance arrives faster than internal documentation can keep up.

### Secondary ICPs

- Engineering managers accountable for reliability, cost, safety, or delivery of an AI product.
- Technical founders operating an AI product with real customers and limited platform staff.
- Senior hands-on engineers becoming the de facto production-AI owner on an existing team.

### Exclusions

- People looking primarily for beginner prompt templates.
- Readers seeking general AI news without a production responsibility.
- Buyers expecting a course, certification, source-code product, or weekly full-edition rewrite.
- Organizations that require procurement, team administration, or enterprise support from a `$5/month` individual offer.

### Job to be done

“Help me see the whole production system, identify what is missing before release, and keep my mental model current without turning every industry update into a research project.”

### Buying triggers

- A prototype is approaching an internal or customer launch.
- A tool-using agent, RAG system, or model router is adding operational complexity.
- An incident exposed missing eval, authorization, recovery, or observability coverage.
- A technical leader needs a shared review frame for a cross-functional production decision.
- A provider change or new technique creates uncertainty about current practice.

## Message and offer

### Core message

Production AI Engineering is a maintained field guide for the system around the model: identity, routing, context, inference, validation, tools, recovery, evals, observability, cost, and safety.

### Paid promise

For `$5/month`, a subscriber receives:

- immediate access to the current private PDF;
- material new PDF editions released while the subscription is active;
- one concise, source-reviewed field note every Tuesday;
- access to the subscriber archive while active.

### Proof available now

- A useful Sections 1–3 sample is available without payment or signup.
- The handbook contains a linked source trail rather than unsupported advice.
- A Monday external-source review produces an isolated candidate and does not silently alter production.
- Approved reader-facing changes receive a final-page changelog; unchanged editions do not claim a change.

### Claims to avoid

- “Always current,” “complete,” or “guaranteed production-ready.”
- Unsupported performance, savings, adoption, or customer-result claims.
- A fixed page count unless checked against the release being sold.
- Any suggestion that a social-platform lead form provides paid access.
- Any suggestion that every Monday review produces a new edition.

## Funnel design

| Stage | Reader question | Asset | Primary action | Decision event |
| --- | --- | --- | --- | --- |
| Discovery | Does this person understand the work I am doing? | LinkedIn analysis, native checklist, community answer, search result | Open public teaser or sample | `acquisition.teaser_viewed` or `acquisition.sample_opened` |
| Evaluation | Is this concrete enough to help? | Two- or three-page teaser and ungated Sections 1–3 sample | Read or download sample | `acquisition.sample_opened`, `acquisition.sample_downloaded`, `acquisition.sample_engaged` |
| Offer | What do I get, and why is it recurring? | Sales page | Start Stripe Checkout | `acquisition.offer_viewed`, `billing.checkout_started` |
| Purchase | Did payment actually succeed? | Stripe subscription Checkout | Complete subscription | `billing.subscription_activated` from verified entitlement state |
| Activation | Can I get the product and use it? | Account, private Vercel Blob delivery, onboarding | Access PDF and first note | `subscriber.pdf_access_granted`, `subscriber.field_note_opened` |
| Retention | Is the maintenance useful enough to keep? | Tuesday notes, material editions, archive | Renew | `billing.renewal_paid` from verified later-cycle payment |
| Referral | Who else has this production problem? | Shareable free sample | Share sample | `acquisition.referral_shared`, referred `billing.subscription_activated` |

## Landing-page message map

| Section | Job | Recommended copy direction | Proof or constraint | CTA |
| --- | --- | --- | --- | --- |
| Hero | Name the product and practical value | **Production AI Engineering** — A maintained field guide for the work after the demo. | Do not use a fixed page count without checking the live release. | `Get the complete guide — $5/month` |
| Problem | Expand the reader's frame | A model can return a strong answer while the product around it still lacks authorization, recovery, evaluation, or useful operating evidence. | Link to the full-system map or sample. | `Read the free sample` |
| Coverage | Show what is inside | Identity, routing, context, inference, validation, tools, RAG, evals, observability, workflow cost, safety, and release gates. | Keep coverage exact to the current handbook. | None |
| Maintenance | Explain the recurring charge | The handbook is reviewed against current primary sources every Monday. Approved edition changes ship when they are warranted. Every Tuesday note explains what changed—or works through a practical production problem when the edition did not change. | Never imply an unapproved candidate is published. | `See what the subscription includes` |
| Sample | Reduce risk | Sections 1–3 are free, useful on their own, and available without signup. | The sample cannot expose the paid PDF path. | `Read Sections 1–3` |
| Offer | Make terms plain | Current PDF, material new editions while active, Tuesday field note, and subscriber archive. `$5/month`. Cancel anytime. | Refund and renewal copy still requires qualified review before live billing. | `Subscribe for $5/month` |
| Trust | Set evidence boundaries | Linked citations, manual release approval, private access, and a visible changelog when reader-facing content changes. | Do not invent testimonials or customer outcomes. | None |
| FAQ | Remove expectation gaps | Explain that this is a field guide, not a course; a new PDF does not ship every week; the weekly field note does. | Match the approved offer terms. | `Read the sample` and `Subscribe` |

## Six-week experiment sequence

The weeks begin only after the purchase-to-access path passes its critical tests. Calendar dates can move; the sequence should not.

### Week 1 — Establish the baseline and founding signal

Goal: prove the complete paid loop with a small, individually approved cohort.

- Validate `acquisition.teaser_viewed`, `acquisition.sample_opened`, `acquisition.sample_downloaded`, `billing.checkout_started`, `billing.subscription_activated`, `subscriber.pdf_access_granted`, `billing.renewal_paid`, and `billing.subscription_ended` in test mode.
- Confirm the full PDF and subscriber archive have no public bypass.
- Select 20 qualified LinkedIn connections privately; keep names and personal data outside Git.
- Send only Mike-approved, one-to-one invitations in waves of five.
- Capture objections, expectation language, access failures, and the section buyers use first.

Continue when at least three people subscribe, access success is 100%, and at least three conversations produce recurring-value evidence. Pause after ten invitations with no subscription and diagnose relevance, promise, trust, and checkout separately.

### Week 2 — Test the problem frame on LinkedIn

Goal: learn whether the “whole system around the model” frame earns qualified sample visits.

- Publish one Mike-approved text post with a simple production-system diagram or checklist.
- Route one instrumented link to the ungated sample.
- Export LinkedIn post analytics after seven days, but make the decision from on-site sample and checkout events.
- Reply personally to substantive questions; do not coordinate engagement.

Continue the frame when the post produces at least 25 qualified sample visits or two checkout starts. If reach is present but sample engagement is weak, fix the promise-to-sample match before writing more posts.

### Week 3 — Test the native teaser

Goal: learn whether a two- or three-page public document improves sample entry.

- Publish a public-only document: problem-led cover, one useful framework, and a clear route to the ungated sample in the post body.
- Never include subscriber-only pages; LinkedIn states that people who can view an organic document can download it as a PDF.
- Compare the document post with Week 2 using qualified sample visits per 1,000 members reached where LinkedIn exposes the denominator.
- Publish the first owned article that expands the same framework for search and referral use.

Continue the document format when it improves qualified sample entry without weakening checkout intent. Do not declare a winner from impressions alone.

### Week 4 — Earn community fit

Goal: test whether the handbook's practical material helps in places where production engineers already compare notes.

- Participate in `r/mlops`, MLOps Community, and DataTalks.Club conversations without dropping the product link.
- Use the current `r/devops` weekly self-promotion thread only if the exact thread remains active and the post is relevant; disclose authorship and price.
- Offer one native checklist or failure-analysis answer where it directly addresses an existing discussion.
- Record substantive replies, direct requests for the sample, and qualified visits separately.

Any moderator removal or warning ends promotion in that community. Participation can continue only if it remains useful and within the rules.

### Week 5 — Test earned technical distribution

Goal: see whether one strong technical artifact travels beyond Mike's immediate network.

- Consider Hacker News only if Mike has an authentic account history, can write the submission without generated or AI-edited text, and can be present for discussion.
- Link directly to the useful, ungated sample; disclose the paid subscription secondarily.
- Prepare a DataTalks.Club Book of the Week inquiry, an InfoQ article proposal, or a podcast topic pitch only when the angle teaches something beyond “a book exists.”
- Send the first optional free-email excerpt only to people who explicitly opted in.

Do not stack community submissions on the same day. One useful discussion is more informative than several simultaneous links.

### Week 6 — Review retention and choose one paid test

Goal: decide whether to improve the funnel, continue organic distribution, or buy a small amount of learning.

- Review channel-level sample engagement, checkout starts, verified subscriptions, access success, first-note use, cancellations, and eligible renewals.
- Choose the strongest organic message and audience combination.
- Run either one LinkedIn paid test or one Reddit paid test—never both at once—only if the paid launch gate below passes.
- Start the non-incentivized referral prompt after the first useful Tuesday note.

Do not spend if organic visitors have not subscribed. The correct Week 6 action may be another offer or sample experiment.

## Paid launch gate

All conditions must be true:

- At least three verified paid subscribers came from organic or individually approved outreach.
- Payment, access, cancellation, refund, delivery, and support recovery tests pass.
- The first Tuesday field note was delivered successfully.
- Channel UTMs and server-authoritative subscription events reconcile.
- The exact ad creative, audience, destination, budget, tracking, and privacy treatment are approved.
- The complete PDF is private and absent from every ad asset.
- A fixed test cap and stop rule are recorded before launch.

## Budget scenarios

All figures are **Plan** values, not platform minimums or market benchmarks.

### Recommended: evidence-first — `$0` media spend

- Six weeks of owned content, LinkedIn organic, founding outreach, community participation, and earned pitches.
- Best when the funnel has no conversion or renewal baseline.
- Requires time for useful content and personal responses, but preserves learning about message and audience.

### Controlled learning — up to `$500`, after the paid gate

- `$300` for one primary paid-social test over 7–10 days.
- Up to `$150` for a second channel only if the first test reaches its continuation threshold.
- `$50` held for asset adaptation or measurement—not automatically spent.
- Every campaign uses the free sample as the first destination.

### Scale-learning — up to `$1,500`, not recommended before renewal evidence

- Up to `$600` on the best proven paid-social audience/message pair.
- Up to `$300` on retargeting only with valid consent and enough audience volume.
- Up to `$300` for one niche newsletter or podcast placement only after receiving and approving the actual placement terms.
- Up to `$300` for creative and measurement work.

This scenario requires first-renewal data and a defensible customer-acquisition payback model. At the current price, a large sponsorship or broad awareness buy is unlikely to be the next best experiment.

## Success, continuation, and stop rules

### Provisional funnel targets

These are **Plan** thresholds to force a decision; they are not external benchmarks.

| Measure | Initial target | Meaning |
| --- | ---: | --- |
| Sample-to-checkout-start | `>= 3%` | The sample creates enough commercial curiosity to inspect the offer. |
| Checkout-start-to-paid | `>= 50%` | Checkout and trust are not losing most high-intent visitors. |
| Sample-to-paid | `>= 1.5%` | The complete path produces buyers. |
| Access success within 24 hours | `100%` | Acquisition stops for unresolved access failure. |
| First-note activation within 7 days | `>= 80%` provisional | Buyers receive and use the recurring value. |
| First renewal | `>= 70%` provisional | The recurring promise deserves continued acquisition. |
| Paid CAC | `<= $15` provisional | Roughly three months of gross subscription revenue before fees; revise from observed margin and retention. |

### Diagnose before changing the offer

| Evidence | Most likely problem to test next |
| --- | --- |
| Reach, few teaser/sample visits | Hook, relevance, or CTA. |
| Sample visits, little engagement | Promise-to-sample mismatch or sample usability. |
| Engaged sample, no checkout starts | Paid value or recurring explanation. |
| Checkout starts, no payments | Checkout trust, friction, payment failure, or price expectation. |
| Payments, poor access | Product delivery; stop acquisition immediately. |
| Access, no Tuesday-note use | Onboarding or recurring-value format. |
| Use, weak renewal | Promise, cadence, depth, or audience mismatch. |

### Global stop conditions

- Any unresolved payment, access, cancellation, refund, or delivery failure.
- Any public route to the subscriber-only PDF.
- Missing or contradictory attribution between the site and Stripe webhook records.
- Moderator or platform warning about the exact activity.
- Unsupported marketing claims or a changed offer not reflected at checkout.
- Paid spend reaching `$75` with no checkout start, or `$150` with no verified subscription, for a single test.
- One hundred qualified sample visits from a channel with no checkout start.

### Continue and scale

- Continue an organic message after at least two meaningful distribution attempts when it produces qualified sample visits and either checkout starts or direct buyer-language evidence.
- Continue a paid test only when it produces at least one verified subscriber and remains on a plausible path to the provisional CAC cap.
- Increase a paid budget by no more than 25% per weekly review, and only after first-renewal evidence exists.
- Scale the message and audience pair that converts; do not generalize a result from one platform to another.

## Risks and mitigations

| Level | Risk | Mitigation |
| --- | --- | --- |
| High | The complete PDF remains reachable without entitlement. | Crawl and test every historical and direct route before promotion; acquisition stays paused until bypass checks pass. |
| High | A `$5/month` checkout converts a one-time PDF expectation into surprise recurring billing. | Put “renews monthly,” the Tuesday note, cancellation, and what happens after cancellation next to the CTA and in Checkout. |
| High | Paid acquisition costs more than observed subscriber value. | Keep media at `$0` until organic conversion; cap later tests and require renewal evidence before scaling. |
| High | Access or weekly delivery fails after payment. | Treat webhook-confirmed payment and entitlement as server-side facts; stop acquisition on any unresolved failure. |
| Medium | LinkedIn reach looks strong while qualified intent is weak. | Use post metrics diagnostically; decide from instrumented sample, checkout, and subscription events. |
| Medium | Reddit or Hacker News interprets a launch as spam. | Participate first, disclose affiliation, follow current community rules, avoid coordinated engagement, and stop on removal. |
| Medium | AI-assisted copy violates a community or publisher rule. | Mike writes HN submissions/comments and InfoQ articles himself; use this package only for internal planning and fact checking. |
| Medium | SEO work becomes scaled summary content. | Publish one original, useful production artifact at a time; keep it tied to the handbook's primary-source review. |
| Medium | Marketing email damages sender reputation or lacks valid consent. | Separate paid service messages from optional promotion, use explicit opt-in, one-click unsubscribe, and suppression handling. |
| Medium | Referral incentives create undisclosed endorsements. | Start without incentives; if value is later offered, require clear material-connection disclosure and qualified review. |
| Low | Community or editorial opportunities do not accept the pitch. | Treat acceptance as earned distribution, not a forecast; keep the owned content useful without placement. |

## Evidence boundaries

- **Fact:** LinkedIn permits 3,000-character posts, downloadable organic documents, document ads, creator analytics, and website-conversion measurement. Its professional policies prohibit untargeted or repetitive promotion and coordinated engagement. See the [LinkedIn sources](./source-ledger.md#linkedin).
- **Fact:** Reddit sitewide policy prohibits repeated or unsolicited mass engagement; individual communities control self-promotion. Reddit's promoted-post product is reviewed, CPC-based, feed-only, uses daily budgets, and supports community targeting. See the [Reddit sources](./source-ledger.md#reddit).
- **Fact:** Hacker News asks users not to use the site primarily for promotion, forbids solicitation of votes/comments, and currently prohibits generated or AI-edited comments. Show HN allows a sample chapter for a book and prefers access without signup or email. See the [Hacker News sources](./source-ledger.md#hacker-news).
- **Fact:** Google recommends helpful, original, people-first content and supplies specific structured data for indexed paywalled content. See the [search sources](./source-ledger.md#search-and-attribution).
- **Inference:** LinkedIn is the fastest first public channel because Mike already has a relevant professional network and the platform supports both native teaching and measurable off-site visits.
- **Inference:** Reddit and Hacker News are better used as selective earned distribution than as a launch calendar because their current rules and culture penalize promotion-first behavior.
- **Inference:** Paid media is economically fragile at `$5/month` until actual retention is known, so early paid spend should buy a bounded answer rather than reach.
