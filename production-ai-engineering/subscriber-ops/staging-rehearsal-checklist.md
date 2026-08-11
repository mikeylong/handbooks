# Staging rehearsal checklist

The local rehearsal proves policy and workflow logic without contacting Clerk, Stripe, Neon, Vercel Blob, Resend, or an analytics provider.

Run it from the repository root:

```sh
node subscriber-ops/scripts/staging-rehearsal.mjs
```

The script reads and hashes the current canonical PDF, verifies the recorded private staging-upload receipt, runs every scenario against pure local projections, confirms all provider mutations fail closed, and writes its report to a fresh temporary directory. It does not upload or replace the PDF. A passing local rehearsal is not production approval.

## Local executable coverage

- [x] Current canonical PDF matches the selected initial-asset SHA-256 and byte count.
- [x] Purchase activates access.
- [x] Cancellation preserves access until the paid-period boundary and suspends at that boundary.
- [x] A verified renewal extends active access.
- [x] First payment failure opens one seven-day grace period; repeated failures do not reset it; access suspends at the exact boundary.
- [x] A first-charge refund request is eligible through the inclusive seven-day boundary and ineligible one second later.
- [x] Refund completion suspends access immediately.
- [x] Chargeback creation suspends access immediately.
- [x] A new PDF release can replace the current local release pointer without overwriting the prior asset.
- [x] Tuesday delivery produces unique recipient delivery IDs without sending email.
- [x] Rollback restores the exact prior asset digest.
- [x] Checkout, private Blob upload, and email calls are rejected by blocked adapters.

## Recorded private staging upload

The approved initial asset is now uploaded to private staging. The evidence is recorded in `fixtures/initial-staging-upload-receipt.json`:

- store: `production-ai-handbook-staging-pdf` (`store_Y79UDmNrtHqx852p`);
- access: private;
- region: `iad1`;
- environments: preview and development only;
- source SHA-256: `6de23ed2cc62babf1c0f5692f395c38d6398c9cc230f937b151a762167473456`;
- byte count: `15598098`;
- page count: `74`.

The upload did not edit the canonical source or `output/pdf/production-ai-engineering.pdf`. Production promotion, live subscriber access, and subscriber delivery remain unapproved. Any source-byte change requires a new immutable object, receipt, and approval.

## Real provider staging rehearsal

The private staging-upload step is complete. Run the remaining provider scenarios only after the applicable staging deployment, secrets, billing, and email actions are separately approved:

- [ ] Clerk test user signs in and an anonymous request fails closed.
- [ ] Stripe test purchase emits a verified webhook and creates one Neon entitlement.
- [ ] Duplicate and out-of-order Stripe events do not duplicate or roll back entitlement.
- [x] The explicitly approved canonical PDF is recorded in a private preview/development Vercel Blob store with evidence matching its digest and size.
- [ ] Entitled access succeeds; anonymous and suspended access fail; no raw Blob URL is exposed.
- [ ] Customer-portal cancellation preserves access through the paid-period boundary.
- [ ] Test renewal extends access and emits `billing.renewal_paid` once.
- [ ] Failed renewal remains accessible for seven days, repeated failures do not reset grace, and access suspends at the boundary.
- [ ] Refund completion and chargeback creation suspend access immediately.
- [ ] A separately approved replacement PDF activates without overwriting the initial object.
- [ ] A frozen Tuesday audience creates one outbox row per eligible user; Resend test delivery uses the deterministic delivery ID.
- [ ] Resend shows `surfaces.systems` as verified before the separately approved one-recipient staging email check.
- [ ] Rollback restores the initial object pointer and disables new access to the withdrawn release.
- [ ] Audit, analytics, suppression, incident-hold, and reconciliation records contain no email, token, signed URL, or raw webhook body.

Record sanitized provider receipts and screenshots for each result. Staging evidence does not authorize production deployment, live billing, acquisition publishing, private production upload, or subscriber email.
