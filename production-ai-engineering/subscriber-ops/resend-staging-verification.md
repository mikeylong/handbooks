# Resend staging service-email verification

Resend Free is provisioned for `surfaces.systems` in preview and development. The configured environment-variable names are `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN`; their values never enter Git, logs, command output, approval files, or test fixtures.

Resource provisioning remains at `onboarding`, and Resend reports the domain verification status as `not_started`. Resend requires the sending domain to reach `verified` before this adapter can send from it. The command therefore remains blocked before any provider request.

DNS is hosted at GoDaddy on `ns07.domaincontrol.com` and `ns08.domaincontrol.com`. This package does not change DNS. Adding SPF/DKIM/DMARC records requires separate authorization and should be done through the owning DNS account.

## Default no-send check

```sh
node subscriber-ops/scripts/verify-resend-staging.mjs
```

Default behavior uses a synthetic `.invalid` recipient, builds the deterministic delivery ID, reports the resource gate, and performs zero network requests.

## Prepare a one-recipient approval request

Set the exact staging user and recipient in the process environment so neither appears in shell arguments:

```sh
RESEND_STAGING_USER_ID=... \
RESEND_STAGING_RECIPIENT=... \
node subscriber-ops/scripts/verify-resend-staging.mjs \
  --prepare-request \
  --content /absolute/path/to/staging-content.json
```

The command writes a mode-`0600` request into a fresh temporary directory. The request contains the recipient-email SHA-256, internal user ID, release, audience snapshot, content digest, weekly send key, and deterministic delivery ID. It contains no raw recipient email and is explicitly marked `AWAITING_EXPLICIT_APPROVAL`.

Mike must review that exact request and create a separate approval matching `schemas/staging-email-approval.schema.json`. The approval permits one recipient, one content digest, one deterministic delivery ID, an approval window no longer than one hour, and staging only. It explicitly denies production and live promotion.

## Provider-mutating verification

Do not run this while the domain status is `not_started`. After Resend reports `verified`, update the evidence-backed domain status, rerun all contracts, and then use:

```sh
RESEND_STAGING_USER_ID=... \
RESEND_STAGING_RECIPIENT=... \
node subscriber-ops/scripts/verify-resend-staging.mjs \
  --send \
  --confirm-staging-provider-mutation \
  --approval /absolute/path/to/approved-staging-email.json \
  --content /absolute/path/to/staging-content.json
```

The send path also requires `RESEND_API_KEY` and `RESEND_EMAIL_DOMAIN` in the runtime environment. It rejects a missing or expired approval, changed recipient, changed content, changed sender domain, nondeterministic delivery ID, recipient count above one, production environment, or live-promotion flag.

The adapter posts to Resend's single-email endpoint with the deterministic delivery ID in the `Idempotency-Key` header. Resend retains API idempotency keys for 24 hours, so the durable outbox and unique delivery ID remain the long-term duplicate-send control. The command prints only delivery/provider IDs and bounded status—never the API key or recipient email.

## Remaining gate

- [ ] Resend domain status moves from `not_started` to `verified` for `surfaces.systems`.
- [ ] SPF and DKIM evidence is recorded; DMARC is reviewed.
- [ ] Exact staging content, internal user ID, recipient-email digest, delivery ID, and approval window are approved.
- [ ] A single provider-mutating staging verification is separately authorized.
- [ ] Provider receipt and webhook result reconcile to the same delivery ID without personal data in logs.

No production send, subscriber campaign, acquisition email, domain mutation, or live promotion is authorized by this package.

Provider references: [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email), [idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys), and [domain verification statuses](https://resend.com/docs/dashboard/domains/introduction).
