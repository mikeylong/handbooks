# LinkedIn drafts

Status: ready for copy review; none are approved or scheduled  
Channel rule: each post must help without the link, and every recipient/message/post/link needs explicit approval before use

## Shared preflight

- Replace every `{…}` placeholder.
- Open the final tracked URL in a private browser session and confirm it reaches the ungated sample.
- Confirm the offer still says `$5/month`, the complete PDF is private, and no fixed page count appears.
- Check the final post against [LinkedIn's Professional Community Policies](https://www.linkedin.com/legal/professional-community-policies).
- Do not coordinate engagement, tag people for reach, add unsolicited promotional invitations, or send a message sequence to silence.
- Capture the final copy, URL, approver, and publish time outside this draft before publishing.

## `LI-POST-01` — the system around the model

Planned date: 2026-08-26  
Tracked link: `{LI01_SAMPLE_URL}`  
Primary decision: qualified sample use, then Checkout starts

> A model can return a strong answer while the product around it is still missing the things that make the answer safe to use.
>
> Identity decides who can ask. Routing decides which model and policy apply. Context and retrieval shape what the model sees. Validation, tool permissions, and termination decide what it can do. Recovery, evals, observability, and cost tell the team whether the system can keep running.
>
> I’ve been turning that full system into Production AI Engineering, a maintained field guide for engineers doing the work after the demo.
>
> Sections 1–3 are available as a free sample. No signup required.
>
> {LI01_SAMPLE_URL}

Optional asset: one approved public full-system diagram.  
Do not claim: that the diagram proves a system is production-ready.

## `LI-POST-02` — seven release questions

Planned date: 2026-09-01  
Tracked link: `{LI02_SAMPLE_URL}`  
Primary decision: sample engagement and Checkout starts

> Before an AI feature is called production-ready, I think the team should be able to answer a few plain questions:
>
> - Who is allowed to trigger it?
> - What context can it read?
> - What actions can it take?
> - How does it stop?
> - What happens when retrieval, a tool, or the model fails?
> - Which eval result blocks release?
> - Can an incident be reconstructed from the evidence the system kept?
>
> A strong model answer does not settle any of those questions.
>
> The free Sections 1–3 sample from Production AI Engineering lays out the larger system and the review frame I’m using.
>
> {LI02_SAMPLE_URL}

Optional asset: public checklist image using the seven questions verbatim.  
Do not claim: that completing the checklist proves safety or reliability.

## `LI-POST-03` — how the guide changes

Planned date: hold for a later open slot; do not stack with `LI-DOC-CAPTION-01`  
Tracked link: `{LI03_SAMPLE_URL}`  
Primary decision: whether maintenance evidence improves Checkout intent

> The hard part of maintaining a production AI handbook is deciding what actually deserves to change.
>
> The review starts with current primary sources across models, infrastructure, evals, safety, security, agents, retrieval, and observability. Research happens in an isolated candidate. Nothing silently replaces the production PDF.
>
> When reader-facing guidance changes and the edition is approved, the PDF ends with a changelog that says what moved and why. When the reader-facing content is unchanged, the review says so and does not manufacture a changelog.
>
> The free Sections 1–3 sample is here:
>
> {LI03_SAMPLE_URL}

Do not claim: that every review produces a new edition or that the guide is always current.

## `LI-POST-04` — workflow cost

Planned date: hold until the first three posts identify buyer fit  
Tracked link: `{LI04_SAMPLE_URL}`  
Primary decision: whether an operating-cost problem brings a qualified audience

> Token price is useful, but it does not tell you what an AI workflow costs.
>
> The workflow also pays for retrieval, reranking, tool calls, retries, validation, model routing, cache misses, human review, and the failures that have to be investigated later.
>
> I think the more useful question is: what does one successful, policy-compliant outcome cost from start to finish?
>
> Production AI Engineering puts that question alongside the rest of the system—identity, context, tools, recovery, evals, observability, and release gates.
>
> Sections 1–3 are free:
>
> {LI04_SAMPLE_URL}

Do not claim: a savings number or cost advantage without measured evidence.

## `LI-DOC-01` — public native document

LinkedIn states that people who can view an organic document can download it. Keep this asset completely public and inspect the exported file before upload. [LinkedIn document guidance](https://www.linkedin.com/help/linkedin/answer/a518909)

### Page 1

Title: `The model is one part of the production system`

Subtitle: `A practical map for the work after the demo`

Footer: `Production AI Engineering — public teaser`

### Page 2

Title: `Seven questions before an AI feature ships`

1. Who can trigger it?
2. What context can it read?
3. What actions can it take?
4. How does it stop?
5. What happens when a dependency fails?
6. Which eval result blocks release?
7. Can the team reconstruct an incident?

Boundary: `A review aid, not proof that a system is safe or ready.`

### Page 3

Title: `Read Sections 1–3 free`

Copy: `The free sample covers the full system, harness engineering, and context engineering. No signup required.`

CTA on page: `{PUBLIC_SAMPLE_URL}`

Offer line: `The maintained guide, material new editions while subscribed, and one source-reviewed Tuesday field note are $5/month.`

Required export check:

- no subscriber-only pages;
- no private Blob path, signed URL, account token, or internal file path;
- no unverified page count;
- no QR code until its final destination is tested;
- document properties contain no private authoring path or personal data.

## `LI-DOC-CAPTION-01` — native-document caption

Planned date: 2026-09-04  
Tracked link: `{LIDOC_SAMPLE_URL}`

> A model call sits inside a larger production system.
>
> The three-page document below has seven questions I think a team should answer before an AI feature ships. The free Sections 1–3 sample expands the frame across identity, context, tools, recovery, evals, observability, cost, and safety.
>
> Read the sample here—no signup required:
>
> {LIDOC_SAMPLE_URL}

## `LI-DM-01` — founding invitation

Use: one-to-one message to an approved existing relationship only  
Tracked link: `{LIDM_SAMPLE_URL}`

> Hi {FIRST_NAME} — I’ve been working on a maintained field guide for engineers taking AI systems from a good demo into production. You came to mind because {REAL_AND_APPROVED_REASON}.
>
> Sections 1–3 are free and useful on their own. If the problem is relevant to what you’re working on, I’d value your candid read. The complete guide and a source-reviewed Tuesday field note are `$5/month`, but there’s no expectation to subscribe.
>
> {LIDM_SAMPLE_URL}

Required personalization rule: replace `{REAL_AND_APPROVED_REASON}` with a fact Mike knows directly and is comfortable stating. If no genuine reason exists, do not send the message.

## `LI-DM-02` — response when someone asks what is included

> The subscription includes the current private PDF, material new editions released while you’re active, one concise source-reviewed field note every Tuesday, and the subscriber archive. It’s `$5/month` and you can cancel anytime.
>
> The free sample is the easiest way to see whether the guide is useful for your work: {LIDM_SAMPLE_URL}

## `LI-DM-03` — feedback after successful access

Use only after the person subscribed and working access is confirmed.

> Thanks for taking a look. When you have a chance, I’d be interested in two things: what you were trying to solve when you opened it, and which section you used first.
>
> Candid feedback is useful here. I’m trying to understand whether the maintained editions and Tuesday note are solving a recurring problem, not just whether the PDF reads well.

Do not ask for a testimonial, public endorsement, like, repost, or referral in the same message.

