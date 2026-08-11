# Privacy, security, and retention

The system should keep enough evidence to prove access, payment, delivery, approval, and recovery without turning logs into a second customer database.

## Data rules

- Use internal `userId` in release, audit, analytics, incident, and outbox references.
- Keep verified email, Stripe customer/subscription IDs, and provider message IDs encrypted in the operational database.
- Never store names, emails, raw IP addresses, access tokens, signed Blob URLs, webhook signatures, secrets, PDF bytes, or complete email bodies in general logs.
- Hash recipient sets after sorting internal user IDs. Do not hash email addresses as a substitute for data minimization; common addresses remain guessable.
- Use UTC timestamps in records and show Pacific time only in operator views.
- Separate subscriber service delivery from acquisition marketing. A paid-service field note does not grant permission for unrelated marketing.
- Give authenticated customers a path to access, correct, or delete account data subject to financial/audit retention requirements.
- Backups inherit the same access controls and deletion schedule.

## Proposed retention schedule

Qualified review must confirm these windows before launch.

| Data | Proposed retention | Treatment |
| --- | --- | --- |
| Release manifests, artifact digests, approvals, state transitions | Life of product plus 7 years | No direct customer PII |
| Stripe financial transaction and refund references | 7 years or required tax/accounting period | Restricted access; provider is financial source of truth |
| Verified webhook envelope and normalized event | 2 years | Store payload digest and required normalized fields; avoid full raw payload unless needed |
| Entitlement history | Active account plus 2 years | Keep provider IDs restricted; delete unnecessary profile fields |
| Audience snapshots and outbox rows | 13 months | Internal user IDs; encrypt operational email copy; delete transient rendered body after 30 days |
| Email provider receipts, bounce, complaint, suppression | Active account plus 2 years, or longer where suppression is legally required | Preserve suppression purpose; restrict provider IDs |
| Auth/session logs | 30 days | Coarse security metadata; no raw tokens |
| Signed-link issuance records | 90 days | Release ID, user ID, outcome, expiry; never store URL/token |
| Product analytics events | 13 months | Pseudonymous user reference; no email/name/raw IP |
| Support tickets | 24 months after closure | Minimize attachments and PDF copies |
| Incident evidence | 2 years after closure; 7 years when financial/legal hold applies | Restricted, encrypted, reviewed at closure |
| Synthetic test data | 30 days | Clearly marked synthetic; safe to delete sooner |

## Access controls

- Production support, refund, release, and database roles are separate where the provider supports it.
- Only release operators can request promotion; only Mike can grant the weekly promotion/send approval under the current owner model.
- Customer support can inspect entitlement state but cannot edit it directly.
- Refund and entitlement overrides require reason codes and append-only audit events.
- Provider production credentials live in managed secret storage and are never available to client code.
- Download endpoints use rate limits and record denied/granted outcomes without logging signed links.

## Deletion and export

Account deletion creates a tracked job that:

1. verifies the authenticated request;
2. cancels or detaches live subscription handling as the customer directs;
3. removes profile and contact data not subject to a retention duty;
4. pseudonymizes retained audit/financial records where possible;
5. preserves suppression status without retaining unnecessary profile data;
6. records what was deleted, retained, why, and until when;
7. never deletes shared immutable release assets.

The launch needs a customer-facing privacy notice, processor/subprocessor inventory, breach-response owner, and qualified review of regional requirements before personal data is collected.
