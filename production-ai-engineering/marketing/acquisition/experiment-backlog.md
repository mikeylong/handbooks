# Acquisition experiment backlog

Status: sequenced proposals only; no outreach, publishing, ad spend, or community submission is authorized  
Research checkpoint: 2026-08-04

## How to use this backlog

Run one meaningful message or channel question at a time. Every experiment needs a named owner, an approved artifact, a fixed start and end date, working instrumentation, and a written stop rule before launch.

The evidence order is:

1. prove payment and private access;
2. learn the buyer's language from a small founding cohort;
3. prove that public material earns qualified sample use;
4. prove that sample use can become a paid subscription;
5. observe activation and renewal;
6. buy a small amount of distribution only when the preceding steps work.

An impression, reaction, form submission, or email address is not a subscription. `billing.subscription_activated` is counted only after verified entitlement state commits, and access is counted separately with `subscriber.pdf_access_granted`.

## Prioritized backlog

| ID | Priority | Earliest stage | Hypothesis | Test | Primary decision measure | Dependency | Stop or continue rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `FOUNDATION-01` | High | Before Week 1 | The complete commercial loop can be measured without exposing the paid file. | Exercise test payment, webhook, Clerk identity, Neon event write, private Blob access, cancellation, refund, and recovery paths. | 100% expected event and access outcomes | Selected application stack deployed in a test environment | Stop all acquisition for any payment, entitlement, delivery, or public-bypass failure. |
| `FOUNDER-01` | High | Week 1 | Existing qualified relationships will reveal whether the recurring value is credible. | Invite 20 individually selected LinkedIn connections in four Mike-approved waves of five. | Verified subscriptions, access success, recurring-value objections | `FOUNDATION-01`; names stored outside Git | Continue after three subscriptions and 100% access success. Pause after ten invitations with no subscription and diagnose before sending more. |
| `LP-01` | High | Week 1–2 | “The whole production system around the model” qualifies the intended buyer better than a generic handbook description. | Route one founding cohort or organic post to each approved hero variant while holding offer and sample constant. | Sample-to-checkout rate and buyer-fit notes | Adequate traffic for directional comparison | Keep the stronger frame only after at least 50 qualified sample visits per variant or clear repeated buyer-language evidence. Do not call a winner from clicks alone. |
| `LI-O-01` | High | Week 2 | A full-system post will earn qualified sample visits from senior practitioners. | Publish Mike-approved LinkedIn post concept 1 with one tracked sample link. | Qualified sample visits; secondary: checkout starts | Working UTMs and sample events | Continue the topic at 25 qualified sample visits or two checkout starts within seven days. Revise when reach exists but sample use does not. |
| `LI-O-02` | High | Week 2–3 | A concrete release-question checklist will convert attention more efficiently than the system overview. | Publish post concept 2 at least 72 hours after `LI-O-01`. | Qualified sample visits per 1,000 reached; checkout starts | Comparable analytics export | Keep the checklist as the lead frame only when site behavior improves, not merely impressions. |
| `LI-O-03` | High | Week 3 | A useful public native document will improve entry into the free sample. | Publish a two- or three-page public teaser with the tracked sample link in the post body. | Qualified sample visits per 1,000 reached; sample engagement | Approved public-only asset | Continue the format when it improves qualified sample entry without lowering checkout intent. Remove any subscriber-only material before publishing. |
| `LI-O-04` | Medium | After Week 3 | A transparent maintenance-process post will improve recurring-value understanding among qualified sample readers. | Publish the approved maintenance-process draft in a separate open slot. | Checkout starts per qualified sample visit; recurring-value questions | At least one earlier LinkedIn topic has produced qualified sample use | Hold until the earlier message readout identifies a real recurring-value objection. Do not publish merely to fill the calendar. |
| `LI-O-05` | Medium | After Week 3 | An end-to-end workflow-cost frame will attract practitioners accountable for operating economics. | Publish the approved workflow-cost draft in a separate open slot. | Qualified sample use and buyer-role fit | Current handbook claim/source review | Hold unless prior readers identify workflow cost as a real trigger. Do not claim savings without measured evidence. |
| `OWN-01` | High | Week 3 | A durable article around one production problem will produce more useful long-tail traffic and a better destination for referral. | Publish an owned article derived from an approved public handbook framework. | Search/referral sample visits, engagement, checkout starts | Canonical URL, metadata, sitemap, Search Console | Continue the topic cluster after 100 qualified visits when it produces sample engagement or a checkout start. Update or consolidate thin pages. |
| `COM-01` | Medium | Week 4 | Contribution without promotion will reveal which community problems the guide can credibly serve. | Make substantive, link-free contributions in relevant `r/mlops`, MLOps Community, or DataTalks.Club discussions. | Substantive replies, follow-up questions, unsolicited sample requests | Same-day rule check; Mike authors text where required | Continue participation when the discussion is useful on its own. Any moderator warning ends promotional testing in that community. |
| `RED-O-01` | Medium | Week 4 | A disclosed comment in a currently permitted promotion thread can produce qualified sample use without harming trust. | Use one active `r/devops` or `r/MachineLearning` promotion thread after verifying its current rules. | Qualified sample visits and discussion quality | Moderator/rule verification, price disclosure, direct sample URL | Stop after a removal, warning, or poor-fit response. Do not repost the same copy elsewhere. |
| `DTC-01` | Medium | Week 4–5 | An author AMA would produce deeper technical evaluation than a promotional link. | Send a concise inquiry for DataTalks.Club Book of the Week, with a genuinely useful topic and five sample copies only if requested. | Invitation or actionable editorial feedback | Human-written pitch; current program availability verified | One inquiry and one follow-up at most. No repeated outreach. |
| `HN-01` | Medium | Week 5 | An ungated, useful sample may earn technical critique and qualified visits on Show HN. | Submit the sample itself, not a sales landing page, only from an authentic account and with Mike present for discussion. | Sample engagement, substantive comments, checkout starts | Mike writes submission and comments without generated or AI-edited text; Show HN fit confirmed | Do not submit if those conditions are not met. Never solicit votes or comments. Stop defending the product if the discussion exposes a real flaw; fix it. |
| `EDIT-01` | Medium | Week 5+ | A specific production lesson can earn editorial reach independent of the product launch. | Pitch an original, Mike-authored incident pattern or architecture lesson to InfoQ or a relevant engineering podcast. | Accepted pitch, editor feedback, qualified referral visits | Topic teaches beyond the handbook; outlet guidelines checked | One tailored pitch per outlet. Do not repurpose a rejection as a mass pitch without revising the idea. |
| `EMAIL-01` | Medium | Week 5+ | A free, consent-based excerpt will bring qualified readers back without weakening the paid Tuesday note. | Offer an optional public update email after sample use; send one useful excerpt. | Return sample visit, checkout start, unsubscribe, complaint | Explicit consent and functioning unsubscribe | Pause if provider thresholds or complaint signals are approached. Never add founding contacts without opt-in. |
| `REF-01` | Medium | After first useful note | Subscribers who received value will share the free sample when the prompt is specific and unpressured. | Ask active subscribers to send the free sample to one colleague facing the same production problem. | Referred sample visits and subscriptions | First note delivered; referral parameter | Continue only if referred visitors engage at least as well as the channel baseline. Hold incentives until disclosure and economics are designed. |
| `LI-P-01` | Low | Week 6+ | The best organic LinkedIn frame will reach more qualified practitioners with bounded paid distribution. | One narrow LinkedIn website-conversion or diagnostic website-visit campaign to the free sample. | Verified subscriptions and provisional CAC | Every paid-launch gate; approved `$300` cap | Stop at `$75` without checkout, `$150` without subscription, provisional CAC above `$15` without a positive trend, or any attribution/access failure. |
| `RED-P-01` | Low | Week 6+ | Community targeting can deliver qualified sample visits at a lower learning cost than LinkedIn. | One Reddit traffic campaign to the free sample with a single audience hypothesis. | Verified subscriptions, sample engagement, provisional CAC | Every paid-launch gate; separate from `LI-P-01` | Use the same dollar stops as `LI-P-01`. Never run both paid tests at once. |
| `SPONSOR-01` | Low | After renewal proof | One tightly matched newsletter or podcast placement can acquire retained readers. | Request an actual media kit and run one placement only after audience fit, terms, and tracking are approved. | Retained subscribers and payback | First-renewal evidence; approved terms | Do not purchase broad awareness. Stop if the quoted price cannot plausibly pay back under observed retention. |

Priority reflects the order of evidence needed, not an estimate of audience size.

## High-priority experiment briefs

### `FOUNDATION-01` — commercial-loop acceptance test

Question: Can a reader subscribe, authenticate, receive private access, cancel, and recover from an error without any public path to the complete PDF?

Required cases:

- a successful test subscription creates one authoritative `billing.subscription_activated` event;
- a duplicate Stripe webhook does not create a second subscriber or event;
- an authenticated active subscriber receives a short-lived private-file response;
- an unauthenticated user, a cancelled user after entitlement ends, and a guessed Blob URL cannot retrieve the complete PDF;
- a failed payment does not grant entitlement;
- cancellation records requested and effective times separately;
- refund handling follows the approved policy and produces a traceable state;
- a support recovery can restore a legitimate subscriber without sharing a permanent public URL;
- events appear in Neon with campaign attribution and without raw email or payment data.

Decision: this test is binary. Any failure blocks the acquisition sequence.

### `FOUNDER-01` — buyer-language and paid-loop proof

Question: Will a small group of relevant people pay for the maintained guide, and what do they believe the recurring charge is for?

Selection criteria:

- existing relationship or legitimate professional context;
- direct responsibility for shipping or operating an AI system;
- likely to use the guide personally rather than route it through enterprise procurement;
- not selected merely because they are influential;
- no more than five invitations in a wave.

Conversation prompts after access:

- “What were you trying to solve when you opened the sample?”
- “What made the complete guide feel worth paying for—or not?”
- “Which part of the recurring promise is useful: maintained editions, the Tuesday note, the archive, or something else?”
- “What did you expect to happen immediately after Checkout?”
- “Which section did you use first?”

Record themes, not private message transcripts, in the experiment readout. Keep contact names and personal information outside this repository.

### `LP-01` — promise test

Hold constant:

- price and subscription terms;
- Sections 1–3 sample;
- checkout and access flow;
- coverage list and trust evidence.

Variant A:

> A maintained field guide for the work after the demo.

Variant B:

> See the whole production AI system—and what is missing before release.

Decision: prefer the variant that produces more verified subscriptions per qualified sample visitor and attracts the intended buyer. If neither produces a checkout start after 100 qualified sample visits, improve the promise, proof, or recurring-value explanation before adding traffic.

### `LI-O-01` and `LI-O-02` — organic message comparison

Run conditions:

- same account and similar weekday/time window;
- at least 72 hours apart;
- one tracked link and no simultaneous off-platform promotion;
- copy and response plan approved before publishing;
- analytics captured at 24 hours and seven days.

Read the result in this order:

1. qualified sample visits;
2. sample engagement;
3. checkout starts and verified subscriptions;
4. substantive comments or direct questions;
5. estimated reach and reactions.

A high-reach post with no sample use is a distribution result, not an acquisition win.

### `LI-O-03` — native teaser test

The asset must teach something complete enough to be shared without payment. It may contain a system map, review checklist, or one production failure pattern. It may not contain the private PDF, subscriber archive material, signed links, or customer information.

Compare it with the stronger text post using qualified sample visits per 1,000 reached and downstream checkout behavior. Because LinkedIn reach is estimated, treat a small difference as directional rather than conclusive.

### `OWN-01` — owned search asset

First article concept:

> The production AI system around the model: twelve decisions a strong model answer does not settle

The article should answer the query directly, link to relevant primary sources, include one useful visual or checklist, and route naturally to the free sample. It should not paraphrase several handbook pages merely to create search inventory.

Search success is cumulative. Review indexing and query data after four and eight weeks; use on-site engagement immediately, but do not stop an article after seven days because rankings have not appeared.

## Paid-test selection at Week 6

Choose LinkedIn when the strongest organic proof came from role/responsibility language and LinkedIn supplied most qualified sample visitors. Choose Reddit only when a specific production topic and community audience have already shown fit and the exact ad treatment passes current policy review.

If neither has produced organic subscriptions, choose neither. Run another promise, sample, or access experiment.

## Experiment readout template

```text
Experiment ID:
Owner:
Approved artifact and URL:
Start / end:
Hypothesis:
Audience:
Primary measure:
Guardrails:
Precommitted stop / continue rule:

Exposure:
Qualified sample visits:
Sample engaged:
Checkout started:
Verified subscriptions:
Access succeeded / failed:
Eligible renewals / retained / cancelled:
Cost and provisional CAC:
Qualitative evidence:

Decision: continue / revise / stop
What the evidence supports:
What remains inference:
Next experiment:
```

## Global stop conditions

Stop public acquisition until the failure is resolved when any of these occurs:

- a paid subscriber cannot access the promised product;
- a non-subscriber can retrieve the complete PDF;
- event reconciliation could double-count or misattribute subscriptions;
- price, renewal, cancellation, or refund terms shown in acquisition material disagree with Checkout;
- a moderator or platform issues a warning about the activity;
- a deliverability or complaint signal approaches a provider threshold;
- a claim cannot be supported by the current handbook or source record.
