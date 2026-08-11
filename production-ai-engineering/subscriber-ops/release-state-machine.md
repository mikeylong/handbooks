# Release and delivery state machine

The release record is the source of truth for weekly editorial and delivery state. Provider dashboards can supply evidence, but they cannot advance the state by themselves.

## States

| State | Meaning | External side effect allowed |
| --- | --- | --- |
| `CANDIDATE_INGESTED` | The Monday run and artifact digests were captured read-only. | No |
| `REVIEW_PENDING` | The candidate packet is complete and waiting for an editorial decision. | No |
| `REVIEW_REJECTED` | Mike rejected the candidate or requested changes. Terminal for this manifest. | No |
| `EDITORIALLY_APPROVED` | Mike approved one exact release-manifest digest. | No |
| `PROMOTION_PLANNED` | A private object key, database transaction, and rollback target are recorded. | No |
| `PRIVATE_ASSET_VERIFIED` | The approved bytes exist privately and a read-after-write digest check passed. | Yes, only under promotion approval |
| `AUDIENCE_SNAPSHOT_READY` | The eligible recipient set is frozen, counted, hashed, and policy-checked. | No; selection is read-only |
| `SEND_APPROVED` | Mike approved the exact manifest, email content, audience digest/count, and send window. | No |
| `DELIVERING` | The durable outbox has begun processing recipient deliveries. | Yes, only under send approval |
| `DELIVERED` | Every recipient is in a terminal result: accepted, suppressed, bounced, failed, or canceled-before-send. | Yes, bounded by the approved snapshot |
| `MONITORING` | Delivery, access, support, payment, and bounce signals are being reviewed. | Only policy-defined repairs or separately approved mutations |
| `CLOSED` | The weekly run is reconciled and its audit package is immutable. | No |
| `INCIDENT_HOLD` | New promotion, link issuance, acquisition, and delivery are paused. | Only containment actions listed in the incident record |
| `WITHDRAWN` | New access to this release is disabled and the last known-good release is current. | Only under rollback approval or the pre-approved emergency containment policy |

## Normal transitions

| From | To | Required guard | Required artifact |
| --- | --- | --- | --- |
| `CANDIDATE_INGESTED` | `REVIEW_PENDING` | Candidate status is ready; final audit passed; canonical source and production PDF remained unchanged; candidate PDF and reports match recorded hashes. | Candidate intake record and draft release manifest |
| `REVIEW_PENDING` | `REVIEW_REJECTED` | Mike records a reason. | Editorial approval artifact with `decision=REJECTED` |
| `REVIEW_PENDING` | `EDITORIALLY_APPROVED` | Mike approves the exact manifest digest; approval is unexpired. | Editorial approval artifact |
| `EDITORIALLY_APPROVED` | `PROMOTION_PLANNED` | Immutable Blob key, prior release, verification plan, and rollback target are recorded. | Promotion plan and promotion approval request |
| `PROMOTION_PLANNED` | `PRIVATE_ASSET_VERIFIED` | A separate promotion approval covers the manifest; Blob HEAD/read verification matches SHA-256, byte count, MIME type, and filename; the database activation commits once. | Promotion approval, Blob receipt, database receipt, audit events |
| `PRIVATE_ASSET_VERIFIED` | `AUDIENCE_SNAPSHOT_READY` | Audience query runs at a recorded eligibility timestamp; suppression and entitlement rules pass; recipient IDs are frozen and hashed. | Audience snapshot |
| `AUDIENCE_SNAPSHOT_READY` | `SEND_APPROVED` | Mike approves the exact manifest digest, content digest, audience digest/count, and scheduled window. | Send approval artifact |
| `SEND_APPROVED` | `DELIVERING` | Current time is inside the approved window; approval is unexpired; outbox rows exactly match the frozen snapshot; global incident hold is false. | Send-start audit event and outbox reconciliation |
| `DELIVERING` | `DELIVERED` | Every outbox row has a terminal result and no recipient outside the snapshot was contacted. | Delivery reconciliation |
| `DELIVERED` | `MONITORING` | Provider results and access telemetry are available. | Monitoring record |
| `MONITORING` | `CLOSED` | Failures are resolved or explicitly carried as incidents; counts reconcile; retention clock is recorded. | Closeout report and final audit-chain head |

No transition may be skipped. Rejected content receives a new manifest and release ID after revision; a rejection is never overwritten.

## Edition and note-only weeks

Every Tuesday delivery includes a field note. A new PDF edition is optional.

- `EDITION_AND_NOTE`: the approved Monday candidate becomes a new immutable private PDF object. The field note names the exact changes and links to the authenticated access route.
- `NOTE_ONLY`: the current released PDF stays current. The field note states exactly that no new edition shipped and discusses a practical production topic grounded in the published handbook. The manifest binds the note to the current release ID; no PDF upload occurs.

The sentence `The handbook's reader-facing content is unchanged.` is evidence for a note-only decision, not automatic permission to send.

## Exception transitions

Any nonterminal state can enter `INCIDENT_HOLD` when an integrity, privacy, entitlement, payment, or duplicate-send risk appears. Entering a hold must be idempotent and should not wait for human approval when continued processing could cause harm. The incident record limits containment to stopping new work; refunding, deleting, publishing, or contacting customers still requires the applicable approval unless an already reviewed policy explicitly covers it.

Allowed recovery paths:

- `INCIDENT_HOLD -> prior state`: root cause fixed, reconciliation passes, Mike approves resume.
- `INCIDENT_HOLD -> WITHDRAWN`: Mike approves rollback or the emergency policy permits disabling new links to contain active leakage.
- `WITHDRAWN -> MONITORING`: prior release restored, audience notified if needed, affected customers reconciled.

Withdrawal cannot recall a downloaded PDF or retract an email. The incident report must state that boundary plainly.

## Approval scopes

| Scope | What it authorizes | What it does not authorize |
| --- | --- | --- |
| `EDITORIAL` | Treat one manifest digest as approved content. | Blob upload, database activation, deployment, or email |
| `PROMOTION` | Write one approved asset to one immutable private key and activate that release record. | Email, public publication, deletion, or another release |
| `SEND` | Process one content digest against one audience digest/count during one time window. | Adding recipients, changing copy, acquisition outreach, or later sends |
| `REFUND` | Issue one bounded refund request for one payment and reason. | Blanket refunds or entitlement overrides |
| `ENTITLEMENT_OVERRIDE` | Grant or revoke one account for one reason and expiry. | Changing policy for other subscribers |
| `DEPLOYMENT` | Deploy one reviewed build/environment. | Enable live billing or publish content automatically |
| `LIVE_BILLING` | Enable the approved price/product/tax configuration. | Future pricing changes or campaigns |

Every approval binds SHA-256 digests rather than mutable paths alone. Expired approvals cannot be reused.

## Subscriber entitlement projection

| State | Access rule | Transition trigger |
| --- | --- | --- |
| `ACTIVE` | Access while the paid period is current. | Verified activation or renewal |
| `CANCELED_PAID_PERIOD` | Access through, but not including, `current_period_end`. | Verified cancellation with paid time remaining |
| `PAST_DUE_GRACE` | Access through, but not including, seven days after the first `past_due` event. | First verified payment failure |
| `SUSPENDED` | No new download link or Tuesday delivery. | Paid-period end, grace-period end, refund completion, or chargeback creation |

Repeated `past_due` events do not move the grace boundary. A verified renewal can restore `ACTIVE`. Refund and chargeback suspension is immediate even when the prior paid period has time remaining. Previously downloaded PDFs cannot be recalled.

## Idempotency and ordering

- `release_id` is immutable. Revised bytes or copy receive a new ID.
- Blob keys include the release ID and PDF digest. Existing matching bytes are a successful replay; an existing key with different bytes opens an incident.
- Stripe webhooks are claimed by unique `event_id` in the same database transaction as the entitlement update. Reusing an event ID with a different payload hash opens an incident.
- Audience snapshots are immutable. A changed eligibility set requires a new snapshot and new send approval.
- The weekly send key is `weekly:<release_id>:<audience_snapshot_id>:<content_sha256>`.
- Each recipient delivery ID is the SHA-256 of the weekly send key and internal user ID. The outbox has a unique constraint on that ID.
- Provider retries update the existing outbox row. They cannot create a second logical delivery.
- Webhook ordering uses provider event creation time plus explicit subscription state precedence. Older events are retained for audit but cannot roll state backward.
- Audit events use a per-aggregate sequence and hash chain. A sequence gap or mismatched prior hash blocks closeout.
