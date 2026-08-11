# Canonical raw analytics event contract

Analytics explains the acquisition and subscriber loop. Billing, entitlement, access, email, and refund databases remain the operational sources of truth.

This file, `schemas/analytics-event.schema.json`, and `ANALYTICS_EVENT_DEFINITIONS` in `lib/contracts.mjs` are the canonical raw-event vocabulary. Acquisition plans, the paywall app, dashboards, and provider imports must use these exact names. A funnel stage, rate, cohort, score, rollup, or platform total is derived data and must not be emitted as a raw event.

## Envelope

Every event uses this shape:

```json
{
  "schema_version": "1",
  "event_id": "evt_01JEXAMPLE0000000000000000",
  "event_name": "subscriber.pdf_access_granted",
  "occurred_at": "2026-08-04T17:00:00.000Z",
  "actor_ref": "usr_opaque_internal_id",
  "anonymous_ref": null,
  "session_ref": "ses_opaque_or_null",
  "release_id": "rel_2026_08_04_example",
  "source": {
    "channel": "linkedin",
    "campaign": "founding_cohort",
    "content": "systems_lesson",
    "referrer_host": "linkedin.com"
  },
  "properties": {
    "delivery_mode": "authenticated_stream"
  }
}
```

`actor_ref` is an internal opaque user ID. Anonymous and authenticated IDs can be joined only through a consented server-side identity link. Do not send names, email, full URLs/query strings, raw IP, user-agent strings, Stripe IDs, signed links, field-note text, or PDF content.

## Canonical raw events

| Event | Emitted when | Required properties | Source of truth |
| --- | --- | --- | --- |
| `acquisition.teaser_viewed` | A first-party teaser renders and becomes visible | `teaser_id`, `teaser_version`, `placement` | First-party analytics |
| `acquisition.sample_opened` | The public sample first renders in a session | `sample_version`, `format` | First-party analytics |
| `acquisition.sample_downloaded` | The server begins a successful public-sample file response | `sample_version`, `asset_id` | Sample access log |
| `acquisition.sample_engaged` | Sample behavior meets one published, versioned engagement rule | `sample_version`, `engagement_type`, `engagement_rule_version` | First-party analytics |
| `acquisition.offer_viewed` | The subscription offer renders and becomes visible | `offer_id`, `page_version` | First-party analytics |
| `acquisition.email_opted_in` | A consent record for the named acquisition category becomes valid | `consent_version`, `subscription_category`, `verification_method` | Consent database |
| `acquisition.referral_shared` | A person invokes a first-party share action | `asset_id`, `share_method` | First-party analytics |
| `billing.checkout_started` | The server successfully creates a Checkout session | `price_key`, `checkout_flow_version` | App plus Stripe |
| `billing.subscription_activated` | A verified webhook commits the first active entitlement | `entitlement_policy_version`, `billing_interval` | Entitlement database |
| `billing.renewal_paid` | A verified non-initial invoice payment extends entitlement | `billing_cycle_number`, `amount_minor`, `currency` | Stripe plus entitlement database |
| `billing.payment_failed` | A verified invoice failure commits | `failure_class`, `billing_cycle` | Stripe plus entitlement database |
| `subscriber.pdf_access_requested` | An authenticated download route begins its entitlement check | `access_route` | Access log |
| `subscriber.pdf_access_granted` | The route starts a private stream or issues a short-lived link | `delivery_mode` | Access log |
| `subscriber.pdf_access_denied` | Route denies access | `reason_code` | Access log |
| `subscriber.weekly_delivery_accepted` | Provider accepts recipient send | `delivery_id`, `provider_result=accepted` | Outbox/provider |
| `subscriber.weekly_delivery_bounced` | Provider reports bounce | `delivery_id`, `bounce_class` | Email provider |
| `subscriber.field_note_opened` | Privacy-reviewed tracking records an open | `delivery_id`, `tracking_method` | Email provider; diagnostic only |
| `billing.cancellation_requested` | Authenticated user enters cancellation flow | `path` | App |
| `billing.subscription_ended` | Verified webhook ends entitlement | `reason_code` | Entitlement DB |
| `billing.refund_requested` | Support records request | `reason_code`, `first_charge` | Support/refund DB |
| `billing.refund_completed` | Verified provider event records refund | `reason_code`, `amount_minor`, `currency` | Stripe/refund DB |
| `operations.incident_opened` | Incident hold starts | `severity`, `category` | Incident DB |
| `operations.release_withdrawn` | Release pointer rolls back | `reason_code` | Release DB |

Open tracking should be disabled unless the privacy notice and provider settings are reviewed. Link access and authenticated note views are stronger activation signals than email pixels.

## Trigger and deduplication rules

- Emit one raw event for one completed trigger. A button click that fails to create Checkout is not `billing.checkout_started`; a download click that fails before response is not `acquisition.sample_downloaded`.
- Deduplicate provider-backed billing events from the verified provider event ID inside the operational inbox, then issue a separate opaque analytics `event_id`. Do not put Stripe IDs in analytics.
- `billing.subscription_activated` represents the first committed paid activation for that subscription. Later successful recurring invoices use `billing.renewal_paid`; they do not emit another activation.
- `billing.renewal_paid` excludes the initial invoice and records `billing_cycle_number` as an integer greater than or equal to 2, `amount_minor` as a non-negative integer, and lowercase ISO currency.
- `acquisition.sample_opened` is a render event. `sample_downloaded` is a successful file-response event. `sample_engaged` is emitted once per sample version and session when the named `engagement_rule_version` passes. They are not interchangeable.
- `acquisition.email_opted_in` is emitted only after a valid consent record exists. It does not contain the email address and does not describe the paid Tuesday service email.
- `acquisition.referral_shared` records the first-party share action. It does not claim that another person received, viewed, or bought anything.
- Native LinkedIn or Reddit impressions are platform aggregates. Do not synthesize person-level `teaser_viewed` events from those totals; ingest aggregate channel facts separately with their original denominator and date.
- Each subscriber delivery retains its deterministic `delivery_id`, allowing accepted/bounced/opened events to reconcile without an email address.

## Attribution

- Capture source fields at the first public visit and again at checkout start.
- Store a first-touch and last-non-direct snapshot with a 30-day maximum window.
- Normalize channel values: `linkedin`, `reddit`, `hacker_news`, `direct`, `referral`, `email`, `search`, `other`.
- Keep organic posts, personal invitations, paid ads, and partner referrals as separate campaigns.
- Never count a LinkedIn lead-form submission as a subscriber. Only a committed verified payment/entitlement event counts as paid conversion.
- Never add LinkedIn connection and follower totals; they can overlap.

## Metrics

| Metric | Definition |
| --- | --- |
| Teaser-to-sample | unique sample openers / unique first-party teaser viewers |
| Sample engagement | unique sessions with `sample_engaged` / unique sample-opening sessions under the same rule version |
| Sample-to-checkout | unique authenticated or consent-linked checkout starters / unique sample visitors |
| Paid conversion | unique committed first paid entitlements / unique eligible checkout starters |
| Access success within 24 hours | first-time payers with a granted PDF access event within 24 hours / first-time payers |
| Tuesday delivery acceptance | provider-accepted recipient rows / approved eligible recipient rows |
| First-update activation | subscribers with a granted PDF access or authenticated field-note view within 7 days / eligible first-update recipients |
| First renewal | subscriptions with first successful renewal / subscriptions eligible to renew |
| Renewal revenue | sum of `amount_minor` from reconciled `billing.renewal_paid` records, grouped by currency; never sum different currencies |
| Refund rate | completed refunds / settled charges, segmented by first charge, duplicate, failed access, and discretion |
| Source paid conversion | committed first paid entitlements attributed to source / eligible source visits |

Metrics use cohort timestamps and frozen denominators. Provider delivery, email open, impression, click, and lead-form counts are diagnostics; none prove customer value by themselves.

## Event quality checks

- Reject unknown event names and properties.
- Reject a canonical event when any required property is absent, null, or empty.
- Deduplicate by `event_id`.
- Quarantine events more than 24 hours in the future or seven days late.
- Enforce `actor_ref` xor `anonymous_ref` except during an explicit identity-link event.
- Redact forbidden keys recursively: `email`, `name`, `ip`, `token`, `signature`, `signed_url`, `stripe_customer_id`.
- Reconcile billing/refund totals to provider/DB sources rather than analytics counts.
