# Production AI Engineering rollout state

Last updated: 2026-07-20
Active stage: Stage 3 — Prove purchase-to-access readiness
Stage status: in progress

## Current checkpoint

`hello@surfaces.systems` is the approved support and reply-to address, so Stage 2 is complete. Stage 3 has begun with a source-exact Markdown sample and customer-facing sales-page draft. The supplied LinkedIn gated-PDF example matches LinkedIn's paid Document Ad with a Lead Gen Form flow, not a payment mechanism; its controlled-preview pattern is recorded as an optional later experiment. The remaining readiness work is approval of the drafts, implementation in test mode, removal of public bypasses, end-to-end purchase/access/cancellation testing, analytics, and preparation of the first paid Tuesday update. All publication, outreach, ad spend, deployment, and live billing remain unapproved.

## Stage gates

| Stage | Status | Completion evidence |
| --- | --- | --- |
| 1. Recover checkpoint | met | Product, PDF, public handbook, automation authority, and working-tree state inspected on 2026-07-19. |
| 2. Confirm offer | met | Price, promise, sample, delivery, cancellation/refund terms, support address, launch week, channel, and founding target are recorded. |
| 3. Prove readiness | in progress | `marketing/sample-draft.md` and `marketing/sales-page-copy.md` are local drafts; no purchase-to-access implementation or test evidence exists yet. |
| 4. Founding cohort | not started | No recipient list, approved invitation, or sends. |
| 5. Activate and learn | not started | No paid cohort or delivery evidence. |
| 6. Public launch | not started | No date, approved campaign, or external publication. |
| 7. Weekly engine | not started | Existing automation creates review candidates, not subscriber deliveries. |
| 8. Renewal review | not started | No eligible paid subscribers or renewals. |

## Facts

- **Fact:** `README.md` currently presents the full companion handbook and a direct PDF download; generated `handbook/index.html` contains three direct PDF download links. Checked 2026-07-19.
- **Fact:** `README.md` describes the current PDF as a 74-page A5 edition. Checked 2026-07-19.
- **Fact:** The manuscript covers the full production system, harness and context engineering, inference, structured outputs and tools, agents, routing, RAG, evals, observability, cost, safety, failure modes, and production readiness. Source: `AI_ENGINEERING_FIELD_GUIDE.md`, checked 2026-07-19.
- **Fact:** The Monday automation produces an isolated candidate and review evidence without changing the published edition; site and PDF promotion require manual approval. Source: `automation/README.md`, checked 2026-07-19.
- **Fact:** `automation/memory.md` records no completed weekly runs yet. Checked 2026-07-19.
- **Fact:** The working tree already contains unrelated handbook and automation changes. The rollout work is isolated under `.agents/skills/run-production-ai-book-rollout/` and `marketing/`.
- **Fact:** LinkedIn personal posts currently support up to 3,000 characters, media or document attachments, audience/comment controls, and scheduling. Source: [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a527227), checked 2026-07-19.
- **Fact:** LinkedIn newsletters are publicly discoverable and readable and create LinkedIn notification subscriptions. They cannot serve as the paid weekly-update layer. Source: [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a517914/newsletters-on-linkedin-faq?lang=en), checked 2026-07-19.
- **Fact:** The supplied [Notion LinkedIn example](https://www.linkedin.com/posts/playbook-1-light-yellow-playbookhtmlpdf-ugcPost-7472713714606006273-Gzad/) showed two preview pages from an 11-page PDF followed by `Want to view more? Unlock the full document below.` Checked 2026-07-20.
- **Fact:** LinkedIn identifies that experience as a Document Ad with a Lead Gen Form. Document Ads are Sponsored Content; the advertiser can choose the preview-page count, and the member must submit the form before seeing or downloading the full document. Source: [LinkedIn Help](https://www.linkedin.com/help/lms/answer/a1320461), checked 2026-07-20.
- **Fact:** A LinkedIn Document Ad requires Page and ad-account permissions. For website-visits or website-conversions objectives, Campaign Manager supports a preview-page slider, destination URL, and CTA. Source: [LinkedIn Help](https://www.linkedin.com/help/lms/answer/a1325448), checked 2026-07-20.
- **Fact:** LinkedIn Lead Gen Forms collect prefilled member/profile information and can route the member to a resource after submission; they do not charge the `$5/month` subscription or establish subscriber entitlement. Source: [LinkedIn Marketing Solutions](https://business.linkedin.com/en-us/marketing-solutions/native-advertising/lead-gen-ads), checked 2026-07-20.
- **Fact:** Anyone who can view an organic LinkedIn document post can download the entire document as a PDF. Subscriber-only content therefore cannot be placed in an organic document teaser. Source: [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a518909/upload-and-share-documents-on-linkedin?lang=en), checked 2026-07-20.
- **Fact:** Mike reported more than 3,581 LinkedIn connections and 3,767 followers on 2026-07-20. The two counts may overlap and do not establish unique or qualified reach.
- **Fact:** The title, introduction, and Sections 1–3 of `AI_ENGINEERING_FIELD_GUIDE.md` total approximately 945 words and end before Section 4. Checked 2026-07-20.
- **Fact:** Mike supplied `hello@surfaces.systems` as the customer support and subscriber reply-to address on 2026-07-20.

## Decisions

- **Decision:** Charge `$5/month` for the current PDF, material new editions while subscribed, and one source-reviewed field note each week. Approved by Mike on 2026-07-19.
- **Decision:** Target the public launch for the week of August 17, 2026. Approved by Mike on 2026-07-19.
- **Decision:** Use LinkedIn as the initial owned-audience and public-launch channel. Approved by Mike on 2026-07-19.
- **Decision:** Keep the title, introduction, and Sections 1–3 public as the ungated sample. Approved by Mike on 2026-07-20.
- **Decision:** Deliver the subscriber field note every Tuesday Pacific time. When no material edition change is approved, send a practical note grounded in the published handbook and state that the edition did not change. Approved by Mike on 2026-07-20.
- **Decision:** Allow cancellation at any time with access through the paid period and refund the first charge when requested within seven days. Approved through Mike's affirmative response to Question 2 on 2026-07-20; qualified review still precedes live billing.
- **Decision:** Use `hello@surfaces.systems` for customer support and subscriber replies. Approved by Mike on 2026-07-20.

## Assumptions

- **Assumption:** The primary buyer is a senior, staff, or principal software/platform/ML/AI engineer, engineering manager, or technical founder responsible for production LLM systems.
- **Assumption:** Position the offer as a maintained field guide for the work after the demo, not as an ebook plus newsletter.
- **Assumption:** Use Mike's personal LinkedIn profile for both founding outreach and public posts; do not create a LinkedIn newsletter for the paid weekly delivery.
- **Assumption:** Screen 30–40 relevant LinkedIn connections privately, select 20, and invite them in four waves of five. Use a working mix of 10 hands-on practitioners, six technical leaders, and four technical founders. Pause after 10 invitations if nobody buys; stop recruiting once five founders join.
- **Assumption:** Launch organically first. Treat a LinkedIn Document Ad as an optional paid acquisition experiment after the founding cohort and purchase-path proof, using public sample material and an external checkout rather than uploading the paid PDF.
- **Assumption:** The organic native-document asset is a separate two- or three-page public teaser, not the approved sample or paid PDF; it names the problem, demonstrates one useful idea, and points to the ungated Sections 1–3 sample through the post copy.

## Unknowns

1. Are the exact sample and sales-page drafts approved or what should change? This blocks conversion into production assets.
2. Which payment, gated-file delivery, subscriber-status, and email services will implement the approved offer? This blocks the test plan.
3. Who will own technical implementation and test evidence? This blocks scheduling Stage 3 completion.
4. Does Mike want a later paid LinkedIn Document Ad test, and if so, are a LinkedIn Page, Campaign Manager ad account, and test budget available? This does not block the organic launch.

## Approvals

| External or commercial action | Status | Scope and date |
| --- | --- | --- |
| `$5/month` price and recurring bundle | Approved | Mike, 2026-07-19; live configuration remains unapproved |
| Public launch week of August 17, 2026 | Approved | Mike, 2026-07-19; individual publish actions remain unapproved |
| LinkedIn as the initial channel | Approved | Mike, 2026-07-19; no profile/page, recipient, copy, or publish approval yet |
| Sections 1–3 public sample | Approved | Mike, 2026-07-20; publication remains unapproved |
| Tuesday delivery, cancellation, access, and refund defaults | Approved for planning | Mike, 2026-07-20; qualified review and live configuration remain unapproved |
| LinkedIn audience baseline | Recorded | More than 3,581 connections and 3,767 followers; overlap and qualified reach unknown |
| Customer support/reply-to address | Approved | `hello@surfaces.systems`, Mike, 2026-07-20 |
| Local sample and sales-page drafts | Prepared, not approved | No publication or deployment authorized |
| LinkedIn Document Ad, Lead Gen Form, lead collection, or ad spend | Not approved | Example reviewed only; no Campaign Manager setup, audience, form, budget, creative, or campaign authorized |
| Configure live billing or deploy a paywall | Not approved | No action taken |
| Invite or contact founding customers | Not approved | No recipients stored or contacted |
| Publish launch or channel content | Not approved | No content published |
| Send weekly subscriber updates | Not approved | Existing candidate process unchanged |

## Current evidence

No acquisition, payment, activation, or renewal data exists. Current product facts establish readiness work, not demand.

## Risks

- **High:** The full site and direct PDF are currently public, so a checkout alone would not create a real paywall. Mitigation: choose the public sample boundary and remove every production bypass before promotion.
- **High:** The existing Monday process creates a review candidate, not an approved subscriber update. Mitigation: define the weekly customer promise and retain manual promotion.
- **Medium:** A `$5` price may attract curiosity without recurring use. Mitigation: validate renewal intent through five founding customers before scaling reach.
- **Medium:** Platform promotion can become spam or violate current rules. Mitigation: use LinkedIn and direct outreach first; verify each channel before drafting or publishing.
- **Medium:** Connections and followers overlap, and only a subset will match the intended buyer. Mitigation: measure actual qualified profile views, sample visits, and invitations rather than treating platform totals as reach.
- **Medium:** A LinkedIn lead gate could be mistaken for the product paywall, creating a second funnel with no payment or entitlement signal. Mitigation: keep billing and access external, use only public material in LinkedIn, and count purchases—not form fills—as customers.
- **Low:** The dirty working tree could make unrelated product changes easy to disturb. Mitigation: keep this work isolated and never modify or discard existing changes.

## Next action

Owner: Mike
Action: Review `marketing/sample-draft.md` and `marketing/sales-page-copy.md`; approve them or name revisions.
Completion evidence: exact draft approval is recorded and the assets are ready for production implementation.
Blocked by approval: yes

## Change log

- 2026-07-19 — Created the first durable checkpoint from the repo audit and rollout-skill defaults; no external action authorized.
- 2026-07-19 — Recorded `$5/month`, the week of August 17, and LinkedIn as approved rollout decisions; verified current LinkedIn post and newsletter behavior; drafted remaining offer terms.
- 2026-07-20 — Approved the Sections 1–3 sample, Tuesday delivery, cancellation/access/refund defaults, and recorded the LinkedIn baseline. Stage 2 now waits only for the support address.
- 2026-07-20 — Recorded `hello@surfaces.systems`, marked Stage 2 met, opened Stage 3, and prepared local sample and sales-page drafts; no external action authorized.
- 2026-07-20 — Verified the supplied LinkedIn preview-and-unlock example as a paid Document Ad with a Lead Gen Form; recorded an organic-first recommendation and a separately approved paid experiment boundary. No ad, form, spend, or publication was created.
