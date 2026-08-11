# Subscriber release operations

Status: local scaffold; no provider is provisioned and no external action is authorized

This package connects Monday's evidence-reviewed handbook candidate to a paid Tuesday delivery without treating a candidate as a release. It defines the approval records, immutable manifests, audience snapshot, provider boundaries, audit events, and recovery steps needed to run that handoff safely.

The operating rule is simple:

`Monday candidate -> editorial decision -> private-asset verification -> audience snapshot -> send decision -> Tuesday delivery -> monitoring`

Three facts stay separate throughout:

- `candidate` means the Monday worker finished its isolated research and PDF checks. It is reviewable, not published.
- `release` means Mike approved an exact manifest and its private asset passed a byte-for-byte verification.
- `delivery` means an exact audience and email payload were separately approved and processed through an idempotent outbox.

## What is included

- [State machine](./release-state-machine.md): exact states, transitions, guards, and artifacts.
- [Weekly runbook](./weekly-runbook.md): Monday intake through Tuesday monitoring.
- [Provider contracts](./integration-contracts.md): auth, Stripe, entitlement database, private Blob, email, and analytics interfaces.
- [Incident runbook](./incident-runbook.md): holds, rollback, payment/access recovery, and customer repair.
- [Privacy and retention](./privacy-and-retention.md): data minimization, log rules, and deletion windows.
- [Terms and refund checklist](./terms-and-refunds-checklist.md): launch gates for the approved `$5/month` offer.
- [Analytics contract](./analytics-events.md): the canonical raw-event vocabulary from acquisition discovery through renewal, plus attribution and metric definitions.
- [Staging rehearsal](./staging-rehearsal-checklist.md): executable local policy coverage and the separate real-staging approval gate.
- [Resend staging verification](./resend-staging-verification.md): fail-closed service-email adapter and one-recipient staging approval flow.
- [Decisions and blockers](./decisions-and-blockers.md): what is already decided and what still requires Mike or qualified review.
- `schemas/`: machine-readable contracts for release, approval, audience, audit, analytics, and incident records.
- `lib/contracts.mjs`: fail-closed validation and idempotency helpers with no provider calls.
- `scripts/check-contracts.mjs`: local contract and negative-path test suite.
- `scripts/dry-run.mjs`: synthetic weekly release rehearsal that writes only to a temporary directory.

## Safety boundary

Nothing in this package can publish, deploy, charge, refund, upload to private storage, change entitlements, or send email. The local scripts use synthetic fixtures and blocked adapters. Production implementations must verify a narrowly scoped human approval artifact immediately before any external mutation.

The following always need a fresh explicit approval:

1. Production deployment or provider provisioning.
2. Enabling live Stripe billing or changing price/tax settings.
3. Promoting one exact release manifest to private storage and the release database.
4. Sending one exact email payload to one frozen audience snapshot.
5. Issuing a refund, granting a manual entitlement, or revoking access outside the published policy.
6. Publishing or sending any acquisition content.

Approving one action does not approve another. Editorial approval does not authorize upload or email. A launch decision does not authorize later weekly sends.

## Local checks

From the repository root:

```sh
node subscriber-ops/scripts/check-contracts.mjs
node subscriber-ops/scripts/dry-run.mjs
node subscriber-ops/scripts/staging-rehearsal.mjs
node subscriber-ops/scripts/verify-resend-staging.mjs
```

The dry run uses fake IDs, digests, recipients, and timestamps. The staging rehearsal additionally reads and hashes the current canonical PDF and checks its recorded private staging receipt, but it cannot upload, promote, or reach a network service.

## Production implementation order

1. Resolve every launch blocker in `decisions-and-blockers.md`.
2. Implement the provider adapters against the contracts in `integration-contracts.md`.
3. Put webhook intake, entitlement updates, release activation, and the email outbox behind database transactions and uniqueness constraints.
4. Run contract, duplicate-event, authorization, cancellation, refund, private-download, bounce, rollback, and recovery tests in provider test modes.
5. Record qualified legal, tax, privacy, and email-compliance review.
6. Request separate approval for deployment and live billing.
7. Prove the full purchase-to-access-to-Tuesday-delivery loop with a controlled internal account before acquisition begins.

The canonical handbook source and `output/pdf/production-ai-engineering.pdf` remain outside this package. Subscriber promotion copies an approved candidate to private storage; it never edits or replaces the repository's production PDF.
