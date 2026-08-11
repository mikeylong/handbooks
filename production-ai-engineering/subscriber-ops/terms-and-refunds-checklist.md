# Terms, cancellation, and refund checklist

This is an implementation checklist, not legal or tax advice. Qualified review remains a launch gate.

## Offer already approved for planning

- [x] Price: `$5/month`, recurring until canceled.
- [x] Product: current Production AI Engineering PDF, material new editions released while subscribed, and one source-reviewed field note each Tuesday.
- [x] No-edition week: the Tuesday note still ships and states that no new edition shipped.
- [x] Cancellation: cancel anytime; access continues through the current paid period.
- [x] Ownership boundary: downloaded PDFs remain with the subscriber; future editions and archive access end when entitlement ends.
- [x] First charge: refundable when requested within seven days.
- [x] Refund boundary: the request is eligible through exactly seven days after the first charge was paid; one second later is outside the standard policy.
- [x] Refund completion: suspend new access immediately. Previously downloaded files cannot be recalled.
- [x] Chargeback creation: suspend new access immediately while the dispute is handled.
- [x] Failed renewal: preserve access for seven days from the first `past_due` event, do not reset the clock on repeated failures, then suspend.
- [x] Duplicate charges and payments that fail to provide working access will be corrected.
- [x] Support/reply-to: `hello@surfaces.systems`.

## Required before live billing

- [ ] Mike approves the exact final sales, checkout, receipt, onboarding, cancellation, failed-payment, refund, privacy, and support copy.
- [ ] Qualified review covers automatic renewal disclosure, cancellation method, refund wording, digital-content treatment, consumer rights, privacy, email rules, and governing law.
- [ ] Stripe product and price IDs are recorded without putting secret keys in Git.
- [ ] Tax collection/registration responsibility and Stripe Tax configuration are decided.
- [ ] The checkout shows price, billing interval, renewal, included deliverables, cancellation, and refund terms before payment.
- [ ] Terms and privacy versions accepted at checkout are stored with timestamp and user ID.
- [ ] The customer portal cancellation path works on mobile and desktop.
- [ ] Receipt and account pages identify support and the next renewal date.
- [ ] The full PDF has no public bypass; the public sample contains only the approved title, introduction, and Sections 1–3.
- [ ] Successful payment does not grant access until the verified webhook commits entitlement.
- [ ] Canceled access continues through the paid period and ends predictably afterward.
- [ ] Downloaded-PDF and archive-access boundaries match the customer copy.

## Refund policy implementation details still required

- [ ] Decide whether any renewal charge is refundable outside duplicate-charge, failed-access, legal, or discretionary support cases.
- [ ] Define the evidence and time standard for `payment failed to provide working access`.
- [ ] Define who can approve refunds when Mike is unavailable and set a maximum amount.
- [ ] Define dispute/chargeback customer communication and reinstatement after a dispute is won or withdrawn.
- [ ] Confirm how taxes are handled in full and partial refunds.

## Failed-payment and access implementation details still required

- [x] Keep download and Tuesday-delivery eligibility active during the seven-day `past_due` grace period.
- [x] Suspend download and Tuesday-delivery eligibility at the exact grace boundary unless payment has restored active status.
- [ ] Define `unpaid`, `incomplete`, `incomplete_expired`, `paused`, and disputed-subscription behavior.
- [ ] Define a time-bounded manual entitlement override and escalation owner.

## Test evidence required

- [ ] First purchase, renewal, cancellation at period end, immediate provider cancellation edge case, and resubscribe.
- [ ] Failed card, delayed webhook, duplicate webhook, out-of-order webhook, and same event ID with changed payload.
- [ ] Seven-day first-charge refund, duplicate charge correction, failed-access refund, and refund replay.
- [ ] Entitled download, anonymous denial, unentitled denial, expired session, and changed email.
- [ ] Private object access, signed-link expiry, withdrawn release, and prior-release rollback.
- [ ] Tuesday eligible/excluded audience counts, duplicate send prevention, hard bounce, complaint, and provider timeout after acceptance.
- [ ] Customer data export, deletion request, and retained financial/audit record explanation.

Record screenshots, provider test IDs, timestamps, and sanitized logs. Test-mode success is necessary evidence; it is not live-production approval.
