# Incident and recovery runbook

## Stop conditions

Enter `INCIDENT_HOLD` immediately when any of these appears:

- the paid PDF or a direct storage URL is publicly reachable;
- an unentitled account can download the PDF;
- the stored asset digest differs from the approved manifest;
- a subscriber receives the wrong release or a person outside the approved snapshot receives email;
- duplicate email or duplicate charge evidence appears;
- Stripe webhook signatures are not being verified;
- the event inbox, entitlement table, outbox, or audit chain cannot reconcile;
- personal data or a signed URL appears in logs or analytics;
- the current release is corrupted or unavailable;
- a provider credential may be exposed.

The hold blocks new checkout promotion, release activation, signed-link issuance when leakage is possible, audience creation, and email processing. Existing customer access stays available unless continued access is the incident.

## First 15 minutes

1. Create an incident record with severity `High`, detection time, reporter, affected release/provider, and the evidence that triggered the hold.
2. Set the global hold flag through an idempotent compare-and-set operation.
3. Stop the narrow failing worker or route. Do not deploy unrelated changes.
4. Preserve audit, webhook, outbox, provider receipt, and release-manifest evidence. Do not copy secrets or raw personal data into the incident document.
5. Determine whether customer data, money, entitlement, private content, or outbound communication is still at risk.
6. Ask Mike for the exact mutation approval needed for rollback, refund, customer communication, credential rotation, or deployment.

## Severity

| Severity | Examples | Response |
| --- | --- | --- |
| `High` | public PDF, authorization bypass, wrong-recipient send, duplicate charge/send, exposed credential, material privacy incident | Hold immediately; no acquisition; owner notification; begin containment |
| `Medium` | partial email-provider outage, broken links for entitled users, delayed webhook, isolated incorrect entitlement | Pause affected path; reconcile; repair before expansion |
| `Low` | cosmetic email issue, delayed analytics, non-customer-facing report mismatch | Track and repair; do not distort operational metrics |

## Recovery by failure type

### Wrong or corrupt release

1. Disable new links to the affected release if the access layer supports a release state check.
2. Restore `current_release_id` to the recorded last known-good release under rollback approval.
3. Verify the prior asset's digest and entitled/denied access paths.
4. Identify affected downloads and sends by internal ID. Do not infer that every emailed user downloaded the file.
5. Prepare corrective customer copy and recipient list; send only after separate approval.

### Public object or authorization bypass

1. Remove public routing or revoke the exposed token/key using the narrowest available control.
2. Keep the object immutable for evidence unless deletion is required and separately approved.
3. Verify private access with both entitled and non-entitled accounts.
4. Review access logs under the privacy policy and determine exposure scope.
5. Obtain qualified privacy/security guidance when notification duties may apply.

### Duplicate email

1. Stop the email worker.
2. Compare approved audience, outbox rows, recipient delivery IDs, and provider message IDs.
3. Mark duplicate attempts without deleting evidence.
4. Fix the idempotency or lease failure and run a no-send reconciliation.
5. Resume only after the duplicate path fails in a regression test and Mike approves the resume.

### Payment without access

1. Verify the payment and webhook signature/event ID in Stripe.
2. Inspect the normalized event, transactional inbox, user mapping, and entitlement state.
3. Restore access with a bounded manual override only when the payment evidence is clear and Mike approves the override.
4. If working access cannot be provided, prepare the approved failed-access refund path.
5. Record time to access recovery and root cause.

### Access without payment

1. Block new link issuance for the affected entitlement path.
2. Reconcile webhook ordering, subscription status, period end, refund/dispute state, and overrides.
3. Revoke only the affected entitlement under policy or approval.
4. Remember that a downloaded PDF cannot be recalled.

### Email provider outage

1. Keep unsent rows in the outbox; do not create a second campaign.
2. Retry only transient failures within the approved send window.
3. If the window expires, stop. A new window requires a new or amended send approval.
4. Reconcile provider receipts before resuming so `accepted but timed out` requests do not duplicate.

## Closeout

An incident closes only when:

- containment is verified;
- provider, database, outbox, release, and audit evidence reconcile;
- affected customers and money are accounted for;
- approved repairs and communications are complete;
- a regression test covers the failure;
- acquisition and delivery resume decisions are recorded separately;
- retained personal data has a deletion date;
- the report states what could not be recovered, including already downloaded files or delivered email.
