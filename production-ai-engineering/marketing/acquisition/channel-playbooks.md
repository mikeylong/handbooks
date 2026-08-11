# Acquisition channel playbooks

Status: drafts and operating rules only; no external action authorized  
Research checked: 2026-08-04

## Channel portfolio

| Channel | Role | Launch posture | First conversion | Paid status |
| --- | --- | --- | --- | --- |
| LinkedIn personal profile | Primary initial reach and buyer-language learning | Organic-first | Qualified sample visit | Later bounded test |
| Reddit | Practitioner participation and selective distribution | Contribution-first | Requested or permitted sample visit | Later bounded test |
| Hacker News | Conditional technical discovery and critique | One authentic submission | Sample engagement | No paid product in scope |
| MLOps / AI engineering communities | Trust, topic feedback, speaking and editorial opportunity | Participate before pitching | Substantive conversation or earned placement | Sponsorship only after retention evidence |
| Search | Compounding discovery for specific production problems | Owned, people-first content | Qualified sample visit | Paid search held |
| Email | Activation, retention, and optional audience return | Consent-first | Sample return, note use, renewal | Provider cost only |
| Referral | High-trust subscriber growth | Start non-incentivized | Referred subscription | Incentive held |
| Owned content | Source of every reusable idea and destination | Always on | Sample and checkout progression | Content production only |

## LinkedIn organic

### Role

LinkedIn is the first public reach channel because the offer maps to professional responsibility and Mike already has a relevant network. It should teach one useful production idea at a time and lead interested readers to the free sample.

### Current platform facts

- Member posts support up to 3,000 characters. [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a528176)
- Anyone who can view an organic document post can download the document as a PDF. The upload limit is 100 MB and 300 pages, and the uploaded file cannot be replaced in place. [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a518909)
- LinkedIn prohibits untargeted, irrelevant, obviously unwanted, repetitive promotion, promotional invitations to people the sender does not know, and coordinated engagement. [Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies)
- Member post analytics include estimated impressions and reach, link engagement, profile activity, and viewer demographics. [LinkedIn post analytics](https://www.linkedin.com/help/linkedin/answer/a516971/post-analytics-for-your-content)

### Operating rules

- Publish from Mike's personal profile first; do not create a company-page dependency for organic proof.
- Each post must work without the link: a system map, checklist, failure analysis, or source-backed update.
- Use one primary CTA to the ungated Sections 1–3 sample.
- Put the tracked sample link in the post copy. Links inside an uploaded document should not be the only route.
- Keep every organic document completely public. Never include the subscriber PDF, private archive content, signed URLs, or screenshots that expose access details.
- Reply personally to real questions. Do not pre-arrange likes, comments, reposts, or reciprocal engagement.
- Do not send promotional connection invitations. Founding outreach is limited to individually selected existing relationships and separately approved copy.
- Export post analytics at seven days and record the corresponding UTM campaign. Treat platform reach as estimated and site events as the conversion record.

### Cadence

Start with two posts per week at least 72 hours apart:

1. one production-system lesson or failure analysis;
2. one practical checklist, source-review note, or Tuesday excerpt.

Add a native document no more than once every two weeks until its incremental value is known.

### Organic post concept 1 — the system around the model

Mike-voice draft for approval:

> A model can return a strong answer while the product around it is still missing the things that make the answer safe to use.
>
> Identity decides who can ask. Routing decides which model and policy apply. Context and retrieval shape what the model sees. Validation, tool permissions, and termination decide what it can do. Recovery, evals, observability, and cost tell the team whether the system can keep running.
>
> I’ve been turning that full system into a maintained field guide for engineers doing the work after the demo. Sections 1–3 are available as a free sample—no signup required.
>
> `{SAMPLE_URL_WITH_UTM}`

Asset: one legible full-system diagram derived from approved public handbook material.  
Primary metric: qualified sample visits.  
Inference: the systems frame should qualify senior practitioners better than a broad “AI engineering” message.

### Organic post concept 2 — production review questions

Mike-voice draft for approval:

> Before an AI feature is called production-ready, I think the team should be able to answer a few plain questions:
>
> - Who is allowed to trigger it?
> - What context can it read?
> - What actions can it take?
> - How does it stop?
> - What happens when retrieval, a tool, or the model fails?
> - Which eval result blocks release?
> - Can an incident be reconstructed from the evidence we kept?
>
> A good model answer does not settle any of those questions. The free sample from Production AI Engineering lays out the system and the review frame I’m using.
>
> `{SAMPLE_URL_WITH_UTM}`

Asset: text post or public checklist image.  
Primary metric: sample engagement and checkout starts.  
Plan: test this only after concept 1 so the two hooks have separate campaigns.

### Organic post concept 3 — how the handbook stays current

Mike-voice draft for approval:

> The hard part of a production AI handbook is deciding what actually deserves to change.
>
> The review now starts every Monday with current primary sources across models, infrastructure, evals, safety, security, agents, retrieval, and observability. Research happens in an isolated candidate. Nothing silently replaces the production PDF.
>
> When reader-facing guidance changes, the edition ends with a changelog that says exactly what moved and why. When the reader-facing content is unchanged, it says so and does not manufacture a changelog.
>
> The free Sections 1–3 sample is here: `{SAMPLE_URL_WITH_UTM}`

Asset: a simple research → candidate → review → release diagram.  
Primary metric: checkout starts among sample readers.  
Inference: process transparency may answer the recurring-subscription objection better than a feature list.

### Native document concept

Create a two- or three-page public teaser:

1. **Cover:** “The model is one part of the production system.”
2. **Useful page:** the full-system map or seven release questions.
3. **Route:** “Read Sections 1–3 free. Get the maintained guide and Tuesday field note for `$5/month`.”

The document itself is public and downloadable. The post-body URL leads to the free sample, not directly to Checkout.

### Continue or stop

- Continue a topic after two posts when it produces at least 25 qualified sample visits or two checkout starts.
- Revise the hook when reach is present but link and sample engagement are weak.
- Revise the paid explanation when the sample is used but checkout is not started.
- Stop public acquisition immediately for any payment, access, or delivery failure.

## LinkedIn paid — later test

### Current platform facts

- Document Ads are Sponsored Content and support website visits and website conversions, as well as lead-generation objectives. [LinkedIn Document Ads](https://www.linkedin.com/help/lms/answer/a737898)
- A Lead Gen Form can gate the remainder of an ad document, but the form is a lead-capture mechanism—not payment or subscriber entitlement. [LinkedIn Document Ads](https://www.linkedin.com/help/lms/answer/a737898)
- LinkedIn's current conversion guidance supports the Insight Tag, Conversions API, and other data sources. [LinkedIn conversion guidance](https://www.linkedin.com/help/lms/answer/a9917045)

### Test design

- Objective: website conversions if `billing.subscription_activated` can be sent and reconciled safely; otherwise website visits for the first diagnostic test.
- Destination: the ungated sample with the paid offer visible on the same path.
- Creative: the public teaser or an approved public excerpt, never the subscriber PDF.
- Audience: one narrow role/responsibility hypothesis; do not combine practitioners, executives, and founders in one ad set.
- Budget: `$30/day` for up to ten days, capped at `$300`, as a **Plan** value.
- Attribution: reconcile platform reporting with normalized campaign fields and verified `billing.subscription_activated`; do not use Lead Gen Form submissions as purchases.

### Ad concept A — document preview

Headline: `The production AI system around the model`  
Body: `A practical map for identity, context, tools, recovery, evals, observability, cost, and safety. Read the free Sections 1–3 sample.`  
CTA: `Read the sample`

### Ad concept B — release review

Headline: `Seven questions before an AI feature ships`  
Body: `A concise production review for teams responsible for authorization, failure handling, evals, and operating evidence.`  
CTA: `Read the sample`

### Stop rule

Stop at the first of:

- `$75` spend with no checkout start;
- `$150` spend with no verified subscription;
- provisional CAC above `$15` without a clear conversion trend;
- any access, cancellation, policy, or attribution failure.

## Reddit organic participation

### Role

Reddit can expose the material to practitioners who actively discuss production failures. It cannot be run as a cross-posting schedule. Community fit and moderator judgment come first.

### Current sitewide facts

- Reddit prohibits repeated or unsolicited mass engagement, mass posting for exposure or financial gain, and large amounts of unsolicited messages. It tells people who primarily link to a business they benefit from to be thoughtful about frequency and check each community's rules. [Reddit Spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam)
- Promotional content is not automatically sitewide spam, but communities may ban it or use their own participation rules. Moderator judgment controls. [Reddit moderator guidance](https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community)

### Community candidates and boundaries

| Community | Current evidence | Launch use | Boundary |
| --- | --- | --- | --- |
| `r/mlops` | The May 2026 reopening note welcomes architecture deep dives, case studies, postmortems, operationally relevant research, tutorials, and implementation detail; it rejects low-effort self-promotion, generic hype, content farming, and AI-generated posts. [Moderator post](https://www.reddit.com/r/mlops/comments/1t6e6he/rmlops_has_been_reopened/) | Participate and answer first. A native failure analysis may later fit. | Mike writes the final post himself. Ask moderators before linking a paid handbook. |
| `r/devops` | A current August 2026 weekly self-promotion thread exists and includes explicit creator disclosure examples. [Current thread](https://www.reddit.com/r/devops/comments/1ve5h6c/weekly_self_promotion_thread/) | One disclosed comment in the active thread if the handbook excerpt directly serves DevOps/platform work. | Recheck that the current thread is still active; no standalone promotional post. |
| `r/MachineLearning` | Recent moderator self-promotion threads direct projects, products, and blogs into the thread, require price disclosure, and reject shorteners and auto-subscribe links. [Recent thread](https://www.reddit.com/r/MachineLearning/comments/1sa4rlx/d_selfpromotion_thread/) | Use only the current self-promotion thread if one exists at posting time. | Mention `$5/month`; link directly to the ungated sample; no main-feed promotion. |
| `r/LocalLLaMA` | April 2026 rules tightened low-effort and affiliate/self-promotion controls; a July moderator reply emphasized meaningful prior participation and scrutiny of commercial tie-ins. [Rules update](https://www.reddit.com/r/LocalLLaMA/comments/1su3ao4/rlocalllama_rule_updates/) | Do not target at launch. | Consider only after genuine participation and only for a locally run inference topic. |

Community pages did not expose a complete unauthenticated rules listing during this research pass. Every Reddit action therefore has a same-day manual rule check and, where commercial linking is ambiguous, moderator confirmation.

### Participation sequence

1. Follow the community and read current top/new discussions for at least one week.
2. Make useful, non-promotional comments where Mike has direct knowledge.
3. Record recurring production questions without collecting usernames or personal data.
4. Write a complete native answer or checklist for one recurring problem.
5. Disclose authorship and commercial interest plainly.
6. Add the sample link only where the current rule or moderator explicitly permits it.
7. Stay present for criticism and answer the technical question, not the sale.

### Reddit concept — outline, not paste-ready copy

Mike should write the final post himself where a community rejects AI-generated posts.

- Title angle: `What we check before a tool-using LLM workflow is allowed to ship`
- Open with one concrete failure class: unauthorized tool action, irreconstructable incident, or missing degraded behavior.
- Give the complete seven-question checklist in the Reddit post.
- State the boundary: the checklist is a review aid, not proof that a system is safe.
- Ask which production failure the community would add.
- Disclose: “I wrote the Production AI Engineering handbook this comes from. The free sample is available here; the full maintained guide is `$5/month`.”
- Include the link only if the current rule allows it.

### Stop rule

- A removal, moderator warning, or locked post ends promotion in that community.
- Do not repost removed content elsewhere.
- Do not send unsolicited chats or DMs to commenters.
- Stop a format after two permitted attempts with no substantive conversation or qualified sample visit.

## Reddit paid — later test

### Current platform facts

- Eligible SFW profile or public-community posts can be promoted after Reddit Ads review. The simplified promoted-post product uses a traffic objective, CPC billing, community targeting, feed placement, and daily budgets. [Promote your post](https://support.reddithelp.com/hc/en-us/articles/16750646696212-Promote-your-post)
- Reddit Audience Manager supports keyword, community, interest, location, custom, and device choices; community audiences include recent subscribers or visitors. [Audience Manager](https://business.reddithelp.com/articles/Knowledge/Audience-Manager)
- Reddit supports `ViewContent`, `Purchase`, `Lead`, and other conversion events through the Pixel or Conversions API. [Conversion events](https://business.reddithelp.com/articles/Knowledge/supported-conversion-events)
- Pixel use is governed by Reddit's business terms and includes Limited Data Use controls. [Reddit Pixel](https://business.reddithelp.com/articles/Knowledge/reddit-pixel)

The consolidated [Advertising Policies and Billing](https://business.reddithelp.com/s/advertising-policies-and-billing) page returned a JavaScript/CSS shell during the research pass. Treat policy review as incomplete until the exact ad and landing page pass Reddit review and Mike checks the live policy in Ads Manager.

### Test design

- Use Advanced Create if it is needed to separate audience and conversion settings; do not assume a promoted organic post preserves community engagement.
- Target one cluster of production, MLOps, platform, or LLM-engineering communities.
- Send traffic to the ungated sample.
- Use a public checklist or system map, with `$5/month` visible before Checkout.
- Cap at `$20/day` for up to 7 days, `$140` total, as a **Plan** value.
- Prefer server-side `billing.subscription_activated` and deduplicate any Pixel/CAPI pair.

### Ad concept A

Headline: `A production AI checklist for the work after the model call`  
Body: `Identity, context, tools, termination, recovery, evals, observability, cost, and safety in one maintained field guide. Sections 1–3 are free.`

### Ad concept B

Headline: `Can you reconstruct what your AI system did?`  
Body: `A practical review frame for tool use, failure handling, eval release gates, and operating evidence. Read the free sample.`

### Stop rule

Use the same `$75` no-checkout and `$150` no-subscription caps as LinkedIn. Also stop for poor community fit, misleading-ad feedback, policy uncertainty, or attribution mismatch.

## Hacker News

### Role

Hacker News is a one-time technical feedback opportunity, not a recurring promotion channel.

### Current rules

- HN asks users not to use the site primarily for promotion, to submit original sources, to avoid promotional titles, and never to solicit upvotes, comments, or submissions. [HN Guidelines](https://news.ycombinator.com/newsguidelines.html)
- HN currently says not to post generated or AI-edited comments. [HN Guidelines](https://news.ycombinator.com/newsguidelines.html)
- Show HN is for work people can try, and its guidance says a sample chapter is acceptable for books. It prefers access without signup or email and rejects landing pages as the thing being shown. [Show HN Guidelines](https://news.ycombinator.com/showhn.html)

### Eligibility gate

- Mike has an authentic account history that is not primarily self-promotion.
- The sample is useful in HTML without an account, email gate, or payment.
- The title is plain and accurately names the artifact.
- Mike writes the submission and all comments himself without generated or AI-edited text.
- Mike can be present for the discussion and answer technical criticism directly.
- Nobody is asked to vote, comment, or submit the link.

### Concept outline

Possible title for Mike to write and validate: `Show HN: Production AI Engineering, a field guide for the system after the model call`

The linked page should open directly on the sample. The page can mention the `$5/month` maintained edition after the free material, but cannot behave like a signup page.

Suggested discussion points—not paste-ready prose:

- why the system frame includes identity, routing, tools, recovery, and evidence;
- what the handbook deliberately does not promise;
- how the source review and manual release gate work;
- where the structure is weak or incomplete;
- how engineers would use the guide during a release review.

### Stop rule

Do not delete and repost. Accept low attention as a result. Stop responding when the discussion no longer concerns the work.

## Practitioner communities, newsletters, and podcasts

### Community posture

The useful pitch is a specific production lesson, not “please promote my handbook.” Start with practitioner participation, then offer an artifact that matches an existing format.

| Outlet | Why it fits | First action | Current constraint |
| --- | --- | --- | --- |
| MLOps Community | Its current community statement centers deployment, evaluation, observability, governance, and improvement of real AI systems. [MLOps Community 2.0](https://mlops.community/blog/mlops-community-2-0) | Participate in events/Slack and identify a recurring production question; later propose a technical session or practitioner conversation. | The community explicitly describes a practitioner-first, nobody-is-selling culture. No launch drop. |
| DataTalks.Club | Its Slack includes engineering, MLOps, books, and dedicated promotion channels. [Slack guide](https://datatalks.club/docs/general/slack/) | Join, contribute in the relevant technical channel, and use only `#shameless-promotion` for an explicit product link. | Follow the community guidelines and channel purpose. |
| DataTalks.Club Book of the Week | The documented format is an asynchronous author AMA promoted through Slack and the newsletter. [Program guide](https://datatalks.club/docs/activities/book-of-the-week/) | Prepare a concise inquiry around production-AI release questions and be ready to answer daily. | The program says it is not hosted regularly at present; it also asks authors to provide five ebooks. Treat as an earned opportunity, not a scheduled launch. |
| AI Engineer | The official site serves AI engineers, founders, and technical leaders and distributes talks, workshops, CFPs, and a newsletter. [AI Engineer](https://www.ai.engineer/) | Monitor future CFPs; propose a talk built from one concrete field-guide framework after customer evidence exists. | Do not buy sponsorship before renewal evidence and an actual quote. |
| InfoQ | InfoQ accepts articles about production problems, technical decisions, migrations, incidents, and lessons for software developers. [Write for InfoQ](https://www.infoq.com/write-for-infoq/) | Mike proposes one original article after validating the thesis with readers. | InfoQ says it rejects primarily AI-generated writing. Mike must author the article himself. |
| Software Engineering Daily | Its public contact page accepts topic suggestions and separately identifies sponsored appearances/marketing. [Contact](https://softwareengineeringdaily.com/contact/) | Pitch an editorial topic only when there is a specific technical story; request sponsorship terms separately if later justified. | Editorial and sponsored routes must remain separate and clearly disclosed. |

### Earned topic concepts

- `The model call is not the release unit: seven production questions around it`
- `Why workflow cost is a better operating measure than token price`
- `What an AI incident record needs to preserve`
- `How to decide whether a weekly industry update actually changes production guidance`
- `Release gates for tool-using agents: permission, termination, recovery, and evidence`

### Pitch structure

1. Name one problem their audience already discusses.
2. Offer one concrete framework, diagram, or case-shaped lesson.
3. Explain the evidence boundary and what readers can do with it.
4. Disclose the handbook connection in one sentence.
5. Offer the free sample as background, not as the editorial subject.
6. Respect the outlet's editorial or sponsorship route; never blur them.

## Search and SEO

### Role

Search should compound the same source-reviewed material used in social posts. It should answer specific production questions and lead naturally into the sample.

### Current search facts

- Google Search Essentials recommends helpful, reliable, people-first content, words readers actually use in prominent page locations, and crawlable links. [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- Google warns against scaled, unoriginal content created primarily to manipulate search systems. [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- Google provides `CreativeWork` structured data to identify indexed subscription or paywalled content and distinguish it from cloaking. [Paywalled content markup](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)

### Owned search architecture

- `/production-ai-engineering/` — sales and offer page.
- `/production-ai-engineering/sample/` — indexable, ungated HTML Sections 1–3 plus optional PDF download.
- `/production-ai-engineering/field-notes/{slug}/` — selected free excerpts that answer one production problem.
- `/production-ai-engineering/changelog/` — public release/version history without private PDF URLs.
- `/production-ai-engineering/topics/{slug}/` — a small set of original evergreen pages only when the handbook has enough evidence.

### Initial query/problem hypotheses

These are **Inference** topics, not keyword-volume claims:

- production AI checklist;
- production LLM architecture;
- LLM evaluation release gates;
- agent tool authorization;
- RAG failure diagnosis;
- LLM observability checklist;
- LLM workflow cost;
- AI incident response evidence.

### Publishing rule

Publish at most one substantial owned piece per week during the initial test. Each page must:

- answer a complete practitioner question;
- add an original framework, example, or synthesis;
- cite the governing primary sources;
- name the author and updated date;
- link to the free sample where it is genuinely the next useful step;
- avoid repeating the same body under multiple keyword variants;
- exclude private PDF content and signed URLs from indexable HTML.

### Measurement

Use Search Console for query/page discovery and the site event schema for sample and subscription progression. Do not treat rank or clicks alone as a business result.

## Email

### Role

Email has two distinct jobs:

1. paid service delivery: receipts, access, security, billing, and the included Tuesday field note;
2. optional marketing: free excerpts, launch updates, and return visits from people who separately opted in.

Do not merge the two permissions.

### Current rules and provider guidance

- The FTC says CAN-SPAM applies to commercial email, including business-to-business messages, and requires accurate headers, non-deceptive subjects, identification, a valid postal address, and a working opt-out process. [FTC compliance guide](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- Resend requires explicit opt-in for its mailing lists and recommends a separate, unchecked consent control plus one-click unsubscribe. [Resend consent guide](https://resend.com/docs/knowledge-base/what-counts-as-email-consent)
- Resend Broadcasts and Automations can manage unsubscribe flows, Contacts, Segments, and Topics. [Resend Audience](https://resend.com/docs/dashboard/audiences/introduction)
- Resend's current quotas warn that bounce rates above 4% and spam rates above 0.08% may pause sending. [Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)

Qualified legal review remains required before live sending; the plan is not legal advice.

### List design

- `paid_field_note` topic: included service message while the subscription is active.
- `free_handbook_updates` topic: optional promotional/editorial opt-in.
- `founding_research` segment: individually approved participants; do not bulk-import LinkedIn contacts.
- Global unsubscribe and provider suppression are respected across marketing sends.

### Free opt-in copy

> Send me occasional public production-AI notes and handbook updates. This is separate from the paid Tuesday field note, and I can unsubscribe at any time.

The checkbox is optional and unchecked. The sample remains accessible without it.

### Email experiment

After someone reads the sample, offer the optional public-notes subscription on the page—not as a gate. Test one plain Tuesday excerpt with one CTA back to the sample or offer.

Primary metric: qualified return to the sample or offer.  
Guardrails: bounce `<2%`, spam `<0.05%`, unsubscribe `<1%` as **Plan** thresholds stricter than provider pause points.  
Stop: any consent uncertainty, provider warning, or complaint pattern.

## Referral

### Phase 1 — no incentive

After a subscriber successfully accesses the first Tuesday note, show:

> If someone on your team is working through the same production questions, send them the free sample. It is available without signup.

Use a subscriber-specific referral code in the sample URL, not a private PDF link. Record `acquisition.referral_shared` only from an explicit share action and attribute a referred purchase from verified `billing.subscription_activated`.

### Phase 2 — possible incentive, held

Only after at least 20 eligible subscribers and first-renewal evidence, consider one free month for both people after the referred subscriber reaches the first renewal.

The FTC says a financial or other material connection behind an endorsement must be disclosed clearly and conspicuously. [FTC disclosure guidance](https://www.ftc.gov/business-guidance/resources/disclosures-101-social-media-influencers)

Required boundaries:

- disclose the benefit in the share copy;
- never reward reviews, positive sentiment, upvotes, or undisclosed social posts;
- do not grant a reward before verified payment and the stated qualification period;
- obtain billing, tax, privacy, and legal review before implementation;
- cap abuse by subscriber and payment identity without storing referral PII in analytics events.

## Owned content operating system

Each Monday review can produce one of four public inputs after manual approval:

- **Edition change:** what changed, why it changed, and what a practitioner should inspect.
- **No edition change:** one production problem worked through using the published handbook.
- **Source shift:** a primary-source update that was reviewed but did not yet warrant changing guidance.
- **Reader question:** a recurring implementation or decision problem answered within the handbook's evidence boundary.

Turn one approved input into a small set of distinct assets:

| Asset | Job | Boundary |
| --- | --- | --- |
| Tuesday paid note | Deliver recurring subscriber value | Full note stays subscriber-only. |
| Public excerpt | Teach one complete idea | Useful without purchase; does not reproduce the full note. |
| LinkedIn post | Start a professional discussion | Native value first; one sample CTA. |
| Reddit/community answer | Help in the community's context | Rewritten natively and only linked when allowed. |
| Evergreen page | Answer a durable search question | Original, sourced, indexable, and updated when evidence changes. |
| Teaser page | Show the handbook's method and depth | Public-only content; no private routes. |

The system should reduce duplicate work, not duplicate identical text across channels.
