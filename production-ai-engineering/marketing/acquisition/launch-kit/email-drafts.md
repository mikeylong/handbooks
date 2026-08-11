# Owned-email drafts

Status: ready for content and compliance review; no audience import or send is authorized

## Provisional sender values

- Sender name: `Production AI Engineering via Surfaces` — **PROVISIONAL**
- From / reply-to: `hello@surfaces.systems` — **PROVISIONAL; confirm the mailbox is monitored before use**
- Site origin: `https://surfaces.systems` — **PROVISIONAL**

Replace or approve those values before any send. Commercial email also requires the reviewed sender identity, postal address, consent record, suppression handling, and working unsubscribe described in the acquisition email playbook. LinkedIn contacts are not an email list.

## Audience rules

- `EMAIL-01` is one-to-one correspondence for an approved existing relationship. It is not a bulk sequence.
- `EMAIL-CONSENT-01` is sent only after an explicit request to confirm optional free updates.
- `EMAIL-02` is sent only to people with verified consent for free handbook updates.
- `EMAIL-03` is a possible subscriber referral message after delivered value; its classification, audience, and unsubscribe treatment require qualified review.
- Paid service delivery and optional marketing consent remain separate.
- Do not use an email-open pixel unless the privacy notice, provider settings, and purpose have been approved. Authenticated use and link access are stronger signals.

## `EMAIL-01` — one-to-one founding invitation

To: `{APPROVED_EXISTING_RELATIONSHIP}`  
Subject: `A production AI field guide I’ve been working on`  
Tracked link: `{EMAIL_FOUNDING_SAMPLE_URL}`

> Hi {FIRST_NAME},
>
> I’ve been working on a maintained field guide for engineers taking AI systems from a good demo into production. You came to mind because {REAL_AND_APPROVED_REASON}.
>
> The free sample covers the full system, harness engineering, and context engineering. If it is relevant to what you’re working on, I’d value your candid read.
>
> {EMAIL_FOUNDING_SAMPLE_URL}
>
> The complete guide, material new editions while subscribed, and one source-reviewed field note every Tuesday are `$5/month`. No expectation to subscribe—the sample is useful on its own.
>
> Mike

Required personalization: replace the reason with a true fact Mike knows directly. If no genuine reason exists, do not send.

## `EMAIL-CONSENT-01` — verify optional free updates

Trigger: explicit request for optional public notes; never required for sample access  
Subject: `Confirm free Production AI Engineering updates`

> Hi {FIRST_NAME_OR_READER},
>
> You asked to receive occasional public Production AI Engineering notes and handbook updates.
>
> Confirm that here:
>
> {VERIFY_FREE_EMAIL_URL}
>
> If you did not request this, you can ignore the message. The free sample remains available without joining the list.
>
> Mike

Footer before send:

`Sent by {APPROVED_SENDER_NAME}, {REQUIRED_POSTAL_ADDRESS}. Privacy: {PRIVACY_URL}.`

Do not include an unsubscribe link in place of verification. An unverified request must not join the marketing audience.

## `EMAIL-02` — free release-question excerpt

Audience: verified `free_handbook_updates` opt-in only  
Subject: `Seven questions before an AI feature ships`  
Preheader: `A practical review for the system around the model.`  
Tracked link: `{EMAIL_EXCERPT_SAMPLE_URL}`

> A strong model answer can hide a weak production system.
>
> Before an AI feature ships, I think the team should be able to answer seven questions:
>
> 1. Who is allowed to trigger it?
> 2. What context can it read?
> 3. What actions can it take?
> 4. How does it stop?
> 5. What happens when retrieval, a tool, or the model fails?
> 6. Which eval result blocks release?
> 7. Can an incident be reconstructed from the evidence the system kept?
>
> The free Sections 1–3 sample from Production AI Engineering puts those questions inside the larger system: identity, routing, context, tools, recovery, evals, observability, cost, and safety.
>
> Read the sample—no signup required:
>
> {EMAIL_EXCERPT_SAMPLE_URL}
>
> The complete current PDF, material new editions while active, one source-reviewed Tuesday field note, and the subscriber archive are `$5/month`.
>
> Mike

Required commercial footer:

`You are receiving this because you confirmed free Production AI Engineering updates. Unsubscribe: {UNSUBSCRIBE_URL}. {APPROVED_SENDER_NAME}, {REQUIRED_POSTAL_ADDRESS}. Privacy: {PRIVACY_URL}.`

`Surfaces` and `hello@surfaces.systems` remain **PROVISIONAL** sender values.

## `EMAIL-03` — non-incentivized subscriber referral

Eligibility: active subscriber who has successfully received a useful Tuesday note  
Subject: `The free sample is easy to share`  
Tracked link: `{REFERRAL_SAMPLE_URL}`

> Hi {FIRST_NAME_OR_READER},
>
> If someone on your team is working through the same production questions, the free Sections 1–3 sample is easy to share. It does not require signup or payment:
>
> {REFERRAL_SAMPLE_URL}
>
> No referral credit or reward is attached. The link only helps me understand whether useful readers are finding the guide through existing subscribers.
>
> Mike

Required review: confirm the audience, classification, privacy disclosure, referral attribution, and unsubscribe behavior before sending. Do not send this inside a billing, security, access, or other required transactional message.

## `EMAIL-04` — answer to an access question

Use: direct human support reply after verifying account ownership  
Subject: `Your Production AI Engineering access`

> Hi {FIRST_NAME_OR_READER},
>
> I’m looking into the access issue now. Please do not send payment details, passwords, or a signed download link by email.
>
> You can try the account route here: {ACCOUNT_URL}
>
> If it still does not work, reply with the time you tried and the general error you saw. I’ll check the entitlement and delivery record from there.
>
> Mike

Never attach the private PDF as an access workaround unless the approved incident and entitlement process explicitly permits it.

## Send approval record

```text
Draft ID:
Audience purpose:
Audience snapshot ID:
Consent basis:
Suppression check:
Sender identity confirmed:
Reply-to monitored:
Postal address confirmed:
Privacy and unsubscribe tested:
Final subject/content/link digest:
Approved by:
Approved at:
Decision: approve / revise / hold
```

