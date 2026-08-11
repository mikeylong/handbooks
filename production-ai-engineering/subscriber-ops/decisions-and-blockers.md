# Decisions and blockers

## Decisions already recorded

- Subscription price: `$5/month`.
- Paid bundle: current PDF, material new PDF editions while subscribed, and one source-reviewed field note each Tuesday.
- No material edition change: send a practical field note and state that no new edition shipped.
- Public sample: title, introduction, and Sections 1–3.
- Cancellation: any time, with access through the paid period.
- Refund: first charge refundable within seven days; duplicate charges and payments that fail to provide working access are corrected.
- Refund completion and chargeback creation suspend new access immediately.
- A failed renewal receives one seven-day grace period from the first `past_due` event; repeated failure events do not reset it; access then suspends.
- The current canonical PDF is the approved initial asset and has been uploaded to a private Vercel Blob store for preview/development staging. Production remains unapproved.
- Resend Free is provisioned for preview/development service email. Resource provisioning is `onboarding`, domain verification is `not_started`, and sends stay blocked until the domain is `verified` and one exact staging send is separately approved. DNS remains untouched.
- Support/reply-to: `hello@surfaces.systems`.
- Initial acquisition backbone: Mike's LinkedIn profile, with each recipient set and publish/send action separately approved.
- Monday's automation creates an isolated candidate. It never authorizes a paid release.

## Recommended technical decisions

- Use Clerk for authentication, Stripe Checkout/Billing and customer portal, Neon Postgres for entitlements/releases/outbox/audit, private Vercel Blob for immutable PDFs, and Resend for service email.
- Key entitlements by stable internal user ID, not email.
- Use verified Stripe webhooks and transactional event deduplication as the only automatic entitlement input.
- Keep private assets immutable and content-addressed. Roll back the database release pointer rather than overwriting a file.
- Serve the PDF through an authenticated route or a signed URL with a five-minute maximum life.
- Use a database outbox and recipient-level deterministic delivery IDs for Tuesday email.
- Keep acquisition publishing and weekly service delivery as separate approval scopes and email categories.

These recommendations still need provider/account confirmation and production approval.

## Launch blockers

| Blocker | Recommended owner | Completion evidence |
| --- | --- | --- |
| Final sample and sales copy are not approved | Mike | Exact approved asset digests |
| No live provider accounts/configuration are confirmed | Mike + implementation owner | Account/environment inventory with owners; no secrets in Git |
| Auth-to-Stripe customer mapping is not proven | Implementation owner | Test-mode purchase and verified webhook produce one correct entitlement |
| Private PDF has not been proven inaccessible publicly | Implementation owner | Public denial plus entitled/anonymous route tests |
| Production PDF currently remains a repository artifact outside the paid app | Mike + implementation owner | Decision on repository/distribution exposure and bypass audit |
| Remaining `unpaid`, incomplete, dispute-resolution, and manual-override edge cases need implementation copy and qualified review | Mike + qualified reviewer | Approved policy version reflected in code/tests/copy |
| Tax, renewal, cancellation, digital-content, privacy, and service-email terms lack qualified review | Qualified reviewers | Dated review and incorporated copy/configuration |
| Tuesday field-note template and first issue are not approved | Mike | Approved rendered content digest |
| Sender domain, SPF/DKIM/DMARC, suppression, and reply handling are not proven | Implementation owner | Provider verification and test receipts |
| No end-to-end purchase, access, cancel, refund, rollback, and duplicate-send evidence exists | Implementation owner | Passing test matrix with sanitized receipts |
| Incident owner and backup approver are not named | Mike | On-call/contact and bounded authority record |
| Deployment, live billing, first promotion, and first send remain unapproved | Mike | Separate scoped approval artifacts |

## Decisions Mike still needs to make

1. Confirm the provider stack or name substitutions.
2. Approve the exact sample, sales page, checkout, onboarding, and first Tuesday note.
3. Name a backup for incidents, refunds, and time-sensitive Tuesday approval.
4. Decide whether the repository's current production PDF remains available to anyone with repository access after the paid app launches.
5. Approve the remaining staging deployment and provider rehearsal steps; the exact private staging PDF upload is complete.
6. Resolve `unpaid`, incomplete, dispute reinstatement, and manual-override edge cases with qualified review.
7. Only after staging evidence passes, approve production deployment, live billing, the first private production promotion, and the first subscriber send as separate actions.

No blocker requires publishing, charging, emailing, or provisioning during local build work.
