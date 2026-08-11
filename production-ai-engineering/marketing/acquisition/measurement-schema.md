# Acquisition measurement contract

Status: implementation contract; no production instrumentation has been installed or verified by this work  
Stack: Next.js, Stripe subscription Checkout, Clerk, Neon, private Vercel Blob  
Canonical raw-event schema: [`subscriber-ops/schemas/analytics-event.schema.json`](../../subscriber-ops/schemas/analytics-event.schema.json)

## Contract decision

Acquisition does not own a second raw-event vocabulary. Every raw event uses the namespaced subscriber-ops event name and privacy-minimized envelope. [event-schema.json](./event-schema.json) is a direct `$ref` to that canonical schema; [event-crosswalk.json](./event-crosswalk.json) maps those events into derived funnel stages; [check-event-contract.mjs](./check-event-contract.mjs) fails if the crosswalk names an event the subscriber-ops schema does not allow.

The derived acquisition path is:

`discovery → sample → offer → paid activation → retention, churn, or refund`

Those words are reporting stages, not raw event names. The corresponding raw path is:

`acquisition.teaser_viewed → acquisition.sample_opened or acquisition.sample_downloaded → acquisition.sample_engaged → acquisition.offer_viewed → billing.checkout_started → billing.subscription_activated → subscriber.pdf_access_granted → subscriber.field_note_opened → billing.renewal_paid or billing.subscription_ended`

Stripe and the entitlement database remain authoritative for billing state. The private access log remains authoritative for PDF access. Browser events explain discovery and evaluation; they never grant access or count revenue.

## Canonical event crosswalk

| Derived stage | Canonical raw event | Emitted when | Authority |
| --- | --- | --- | --- |
| Discovery | `acquisition.teaser_viewed` | A declared public teaser becomes meaningfully visible | Browser event accepted by the first-party server |
| Sample | `acquisition.sample_opened` | The ungated Sections 1–3 sample opens | Browser event accepted by the first-party server |
| Sample | `acquisition.sample_downloaded` | The server issues the public sample download response | Application server |
| Sample | `acquisition.sample_engaged` | One predeclared engagement rule is met | Browser event accepted by the first-party server |
| Offer | `acquisition.offer_viewed` | The sales page renders | Browser event accepted by the first-party server |
| Offer | `billing.checkout_started` | The server creates a valid Stripe Checkout Session | Application server plus Stripe |
| Paid activation | `billing.subscription_activated` | A verified webhook commits active entitlement | Entitlement database |
| Paid activation | `subscriber.pdf_access_granted` | The entitled route begins a private stream or issues a short-lived link | Access log |
| Paid activation | `subscriber.field_note_opened` | Privacy-reviewed tracking records an authenticated note view or allowed diagnostic open | Authenticated access log or reviewed email provider signal |
| Retention | `billing.renewal_paid` | A verified later-cycle payment commits successfully | Stripe plus entitlement database |
| Churn | `billing.subscription_ended` | Verified state ends entitlement | Entitlement database |
| Refund | `billing.refund_completed` | The verified provider event commits a refund | Stripe/refund database |
| Email consent | `acquisition.email_opted_in` | A person explicitly consents to optional public email | Application server |
| Referral | `acquisition.referral_shared` | A subscriber invokes the first-party free-sample share action | Application server or accepted browser event |

Diagnostic events remain canonical too: `billing.payment_failed`, `billing.cancellation_requested`, `billing.refund_requested`, `subscriber.pdf_access_requested`, `subscriber.pdf_access_denied`, `subscriber.weekly_delivery_accepted`, and `subscriber.weekly_delivery_bounced`. A cancellation request is not churn; a provider-accepted email is not reading; a field-note email pixel is diagnostic unless its privacy treatment is approved.

## Canonical envelope

Every acquisition raw event uses the subscriber-ops fields:

- `schema_version`: canonical version, currently `1`;
- `event_id`: opaque `evt_…` identifier used for deduplication;
- `event_name`: an allowed namespaced canonical event;
- `occurred_at`: UTC timestamp;
- `actor_ref`: opaque internal user reference or `null`;
- `anonymous_ref`: opaque consented anonymous reference or `null`;
- `session_ref`: opaque first-party session or `null`;
- `release_id`: normalized release reference or `null`;
- `source`: normalized `channel`, `campaign`, `content`, and `referrer_host`;
- `properties`: only the canonical event-specific properties.

Use the opaque Clerk subject as `actor_ref`; do not put it in campaign or content values. Anonymous and authenticated activity can be joined only through the consented server-side identity-link mechanism defined by subscriber-ops.

Never send raw email, name, message text, full URL or query string, full IP address, user-agent string, card data, Stripe identifier, provider secret, signed Blob URL, field-note text, or PDF content into analytics.

## Required event properties

The canonical subscriber-ops registry is the authority for property requirements. Acquisition implementations should expect at least these meanings:

| Raw event | Core property meaning |
| --- | --- |
| `acquisition.teaser_viewed` | `teaser_id`, `teaser_version`, `placement` |
| `acquisition.sample_opened` | `sample_version`, `format` |
| `acquisition.sample_downloaded` | `sample_version`, `asset_id` |
| `acquisition.sample_engaged` | `sample_version`, `engagement_type`, `engagement_rule_version` |
| `acquisition.offer_viewed` | `offer_id`, `page_version` |
| `acquisition.email_opted_in` | `consent_version`, `subscription_category`, `verification_method`, without an email address |
| `acquisition.referral_shared` | `asset_id`, `share_method` |
| `billing.checkout_started` | `price_key`, never a raw Checkout Session ID |
| `billing.subscription_activated` | `entitlement_policy_version` |
| `billing.renewal_paid` | `billing_cycle_number`, `amount_minor`, `currency`, without invoice or customer IDs |
| `billing.subscription_ended` | Normalized `reason_code` |
| `billing.refund_completed` | Normalized `reason_code` |
| `subscriber.pdf_access_granted` | `release_id` and `delivery_mode` without a signed link |
| `subscriber.field_note_opened` | Normalized delivery or note reference under the approved privacy treatment |

Do not duplicate source attribution inside event properties. If the canonical registry changes a required property, update the emitter and this explanatory table; do not fork the raw schema locally.

## Application-source mapping

| State | Operational source of truth | Emission rule |
| --- | --- | --- |
| Teaser, sample, and offer behavior | Next.js first-party collection endpoint | Validate the canonical envelope server-side; reject unknown events and forbidden data. |
| Checkout intent | Server that successfully creates Stripe Checkout | Emit `billing.checkout_started` after Stripe returns a valid session. A button click is not enough. |
| Subscription activation | Verified Stripe webhook applied transactionally to entitlement state | Emit `billing.subscription_activated` once after active entitlement commits. |
| Renewal | Verified later-cycle Stripe payment applied transactionally | Emit `billing.renewal_paid` once. The first successful charge is activation, not renewal. |
| Cancellation | App request plus verified subscription state | Use `billing.cancellation_requested` for intent and `billing.subscription_ended` only when entitlement actually ends. |
| Refund | Support/refund record plus verified Stripe state | Use `billing.refund_requested` for intent and `billing.refund_completed` only after provider confirmation. |
| PDF access | Authenticated Next.js route backed by private Vercel Blob | Emit requested, then granted or denied. A granted event occurs only when the response starts. |
| Field-note delivery/use | Approved subscriber outbox plus access/provider records | Keep delivery acceptance, bounce, and note use separate. |
| Raw analytics ledger | Neon bounded outbox/sink | Append normalized events. Analytics failure cannot block checkout, entitlement, access, refund, or delivery. |

Stripe recommends webhook fulfillment rather than trusting the Checkout return page and requires idempotent handling because the same Checkout Session can be processed more than once. [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment) Stripe's subscription lifecycle guidance likewise requires webhook monitoring for active access and subscription changes. [Stripe subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview)

## Attribution taxonomy

Use the canonical `source` object:

| Field | Examples | Rule |
| --- | --- | --- |
| `channel` | `linkedin`, `reddit`, `hacker_news`, `search`, `email`, `referral`, `direct`, `other` | Use only the canonical enum. |
| `campaign` | `organic_whole_system_2026_08`, `paid_release_questions_2026_08`, `founding_cohort` | Include organic/paid/community distinction here because the raw schema has no separate medium field. |
| `content` | `text_post_a`, `native_doc_a`, `sample_share` | Identify the approved creative or link. |
| `referrer_host` | `linkedin.com`, `reddit.com`, or `null` | Host only; never store a full referrer URL or query string. |

Google Analytics documents manual campaign dimensions through `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, and `utm_source_platform`. [Google Analytics manual campaign report](https://support.google.com/analytics/answer/14264492) Normalize incoming UTMs into the canonical source object; do not expand the raw envelope to mirror every vendor field.

At first touch, retain the normalized non-sensitive source snapshot for no more than the subscriber-ops 30-day attribution window. At checkout, preserve both first-touch and last-non-direct snapshots operationally. A later direct visit must not silently erase known acquisition context.

## Derived metrics

Use distinct eligible people or subscriptions and frozen cohort denominators, not raw event-row totals.

- Qualified sample rate = people with `acquisition.sample_engaged` / people with `acquisition.sample_opened`
- Sample-to-checkout = people with `billing.checkout_started` / eligible people with `acquisition.sample_opened`
- Checkout completion = people with `billing.subscription_activated` / people with `billing.checkout_started`
- Sample-to-paid = people with `billing.subscription_activated` / eligible people with `acquisition.sample_opened`
- Access success within 24 hours = first-time activations with `subscriber.pdf_access_granted` within 24 hours / first-time `billing.subscription_activated`
- First-update activation = eligible subscribers with `subscriber.pdf_access_granted` or `subscriber.field_note_opened` within seven days / eligible first-update recipients
- First renewal = first `billing.renewal_paid` / subscriptions eligible for a first renewal
- Effective churn = `billing.subscription_ended` / subscriptions at risk in the window
- Refund rate = `billing.refund_completed` / settled charges, segmented by approved reason class
- Provisional CAC = channel media spend / attributed `billing.subscription_activated`

Keep founding outreach, organic, paid, community, search, email, and referral cohorts separate. Provider delivery, email open, impression, click, lead-form, and reaction counts are diagnostics; none proves customer value alone.

## Reporting cadence

- Daily during launch: payment, entitlement, access, webhook, privacy, and attribution exceptions.
- Seven days after public distribution: reach context, sample use, checkout, paid activation, and qualitative evidence.
- Weekly: funnel by source campaign/content and registered experiment; unresolved access or reconciliation failures first.
- Monthly: eligible renewals, effective churn, refunds, acquisition cost, and cohort quality.

Small-number reports show counts beside rates. Never present a channel conversion percentage without its denominator.

## Implementation acceptance tests

The measurement layer is ready only when all of these pass:

1. `node marketing/acquisition/check-event-contract.mjs` passes against the checked-out subscriber-ops schema.
2. The application validates each raw payload against that canonical schema; it never validates against an acquisition-owned copy.
3. Attribution survives from sample entry through test activation without appearing in a signed private-file URL.
4. A button click without a created Stripe Session does not emit `billing.checkout_started`.
5. One completed test subscription produces exactly one `billing.subscription_activated` and one active entitlement.
6. Replaying the same Stripe webhook produces no duplicate event, entitlement, email, or access grant.
7. A later-cycle payment emits `billing.renewal_paid`; the initial successful charge does not.
8. `billing.cancellation_requested` and `billing.subscription_ended` remain distinct.
9. Authenticated active access emits `subscriber.pdf_access_granted`; rejected access emits `subscriber.pdf_access_denied` and never grants a file.
10. No payload or analytics row contains raw personal data, provider IDs, secrets, or a reusable private Blob URL.
11. Source totals reconcile to the operational subscription ledger, with `direct` or `other` retained instead of silently reassigned.

## Decision thresholds

These are plan values, not industry benchmarks:

- investigate the offer when 100 qualified sample visitors produce no checkout start;
- investigate Checkout when completion is below 50%;
- stop acquisition for access success below 100%;
- continue an organic topic after 25 qualified sample visits or two checkout starts across two posts;
- stop a paid test at `$75` without a checkout start or `$150` without a verified activation;
- treat provisional CAC above `$15` as a stop unless a clear conversion trend and retention evidence justify a documented exception.
