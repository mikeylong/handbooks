# Monday-to-Tuesday subscriber runbook

This runbook starts only after the scheduled Monday handbook task finishes. It does not alter that task or publish its candidate.

## Monday: receive the candidate

1. Record the exact `weekly_handbook_run_dir` printed by the worker.
2. Read the worker's required reports and `status.txt` from that directory.
3. Stop if any phase failed, any required report is missing, the candidate is not ready, or either the canonical source or production PDF changed.
4. Hash the candidate PDF, field-note draft, run summary, change report, source ledger, blocked-source report, exact patch, and review status.
5. Create a release manifest with one of two kinds:
   - `EDITION_AND_NOTE` when a material candidate is proposed for release;
   - `NOTE_ONLY` when the current released PDF remains current.
6. Move the release record from `CANDIDATE_INGESTED` to `REVIEW_PENDING`. Do not upload or send anything.

The intake operator records evidence. The operator does not infer approval from a ready worker status.

## Monday: editorial review

Mike reviews:

- the candidate PDF and final-page changelog when reader-facing content changed;
- the exact additions, deprecations/removals, and corrections/clarifications;
- the source links and gated-source limitations;
- PDF, pagination, proof-render, and protected-file validation;
- the recommended release-version bump;
- the Tuesday field note and customer-facing subject line.

Mike approves or rejects the exact manifest digest. Any edit to the PDF, field note, subject, release version, or source claims invalidates the approval and creates a new manifest digest.

## Monday: prepare private promotion

For `EDITION_AND_NOTE` only:

1. Plan the immutable object key as `private/handbook/<release_id>/<pdf_sha256>.pdf`.
2. Record the current private release as the rollback target.
3. Prepare a promotion approval request containing the manifest digest, object key, byte count, MIME type, filename, and rollback release ID.
4. After Mike grants promotion approval, upload once using `put-if-absent` semantics.
5. Read the stored object metadata or bytes back and verify digest, size, MIME type, and content disposition.
6. In one database transaction, insert the release receipt and point `current_release_id` at the new release. A uniqueness constraint makes replay safe.
7. Exercise the authenticated access path with an entitled test account and verify denial with a non-entitled test account.

For `NOTE_ONLY`, verify that the manifest's referenced current release is still active and readable. Do not re-upload the same PDF.

Any mismatch enters `INCIDENT_HOLD` before audience selection.

## Tuesday: freeze the audience

Create the audience snapshot as close to send time as practical, before requesting send approval.

Include accounts that meet every condition at `eligibility_as_of`:

- authenticated user mapping exists;
- verified subscriber email exists;
- paid entitlement covers the scheduled send time;
- subscription state is allowed by the reviewed entitlement policy;
- account is not refunded-and-revoked, disputed, blocked, hard-bounced, complained, or manually suppressed;
- no prior terminal delivery exists for the same recipient delivery ID.

Record only internal user references in the durable snapshot. Store recipient email addresses encrypted in the operational database, never in Git, manifests, analytics, or general logs.

The snapshot records exclusion counts by reason, the sorted-recipient-set digest, and the exact policy version. A membership or copy change requires a new snapshot and new approval.

## Tuesday: approve and send

The send approval screen or packet must show:

- release ID and release kind;
- current PDF version or `no new edition`;
- subject, from name, reply-to, and complete rendered body;
- manifest, body, and audience SHA-256 digests;
- recipient count and exclusion counts;
- scheduled time/window in Pacific time and UTC;
- authenticated access URL host, with no embedded long-lived token;
- rollback/current release status;
- active incidents, if any.

After Mike approves that exact packet:

1. Insert one outbox row per frozen recipient using the deterministic recipient delivery ID.
2. Reconcile outbox count and recipient-set digest against the approved audience.
3. Begin processing only inside the approved time window and while the incident hold is clear.
4. Give `DeliveryNotifier.sendSubscriberUpdate` the existing delivery ID as its idempotency key.
5. Persist the provider message ID and terminal result without logging the email address or access token.
6. Retry transient provider failures with bounded exponential backoff. Do not retry hard bounces, complaints, invalid addresses, or policy suppressions.
7. Move to `DELIVERED` only after every row reaches a terminal result.

`provider accepted` means the email provider accepted the request. It does not mean the subscriber read or received the message.

## Tuesday: monitor and close

For at least the first four hours, monitor:

- delivery acceptance, transient failure, bounce, and complaint counts;
- entitlement-denied responses from links in the update;
- private asset digest or availability alarms;
- duplicate outbox or provider-message signals;
- support requests to the approved support address;
- Stripe subscription/refund/dispute events that affect eligibility.

Pause acquisition immediately for any unresolved payment-to-access or privacy failure. Enter `INCIDENT_HOLD` for wrong-recipient, wrong-file, public-object, duplicate-send, authorization-bypass, or digest-mismatch evidence.

Close the weekly run only when:

- approved audience count equals terminal outbox count;
- every provider result is represented once;
- access failures are resolved or linked to an incident;
- the audit hash chain passes;
- the closeout records which PDF is current;
- retention deadlines are attached to transient evidence.

## Cancellation, refund, and revocation workflow

### Cancellation

1. `BillingAdapter.createCustomerPortal` gives an authenticated subscriber a Stripe-hosted cancellation path.
2. A verified subscription webhook updates the database; the browser redirect never changes entitlement.
3. `cancel_at_period_end=true` keeps access through `current_period_end` under the approved terms.
4. Audience selection after the period ends excludes the user. Previously downloaded PDFs remain theirs.

### Failed renewal

The first verified `past_due` event starts one seven-day grace period. Download and Tuesday-delivery eligibility continue during that period. Repeated failure events do not reset the clock. At the exact seven-day boundary, access and new delivery suspend unless a verified payment has restored active status. `unpaid` or ended subscriptions receive no new delivery or download links. An older out-of-order event cannot reactivate access.

### Refund

1. Support creates a refund request record with payment, charge date, first-charge flag, request date, reason, and access evidence.
2. The system evaluates the reviewed seven-day first-charge policy, duplicate-charge rule, and failed-access correction rule.
3. Mike approves the exact refund request unless an approved automated policy explicitly covers it.
4. Billing issues the refund with the request ID as the idempotency key.
5. A verified refund-completion event records the refund and suspends new access immediately. Previously downloaded PDFs cannot be recalled.

### Dispute or manual revocation

A verified chargeback-created event suspends new access immediately and opens a support case. Reinstatement after a won or withdrawn dispute still needs an approved policy path. Manual access changes require a time-bounded `ENTITLEMENT_OVERRIDE` approval naming one internal user ID, action, reason, and expiry. Never edit provider state or database rows directly without an audit record.
