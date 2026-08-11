# Production AI Engineering paywall app

An isolated Next.js foundation for the `$5/month` handbook subscription. It is
credential-free and non-billing by default. Nothing in this directory deploys,
publishes, provisions, charges, emails, or copies the canonical handbook PDF.

## Local proof

```sh
npm install
npm run check
npm run dev
```

Open `http://localhost:3000`, use the local subscriber sign-in, and download the
generated one-page demo PDF. The banner and PDF both state that mock mode is not
the real product.

## Runtime contract

- `/` and `/sample` are public; the sample contains Sections 1–3.
- `/dashboard`, `/api/checkout`, `/api/portal`, and `/api/handbook` authorize the
  current user at request time.
- Checkout uses Stripe subscription mode and the single server-controlled Price.
- The webhook reads `request.text()` before signature verification and binds an
  event ID to a SHA-256 of those exact signed bytes.
- Neon applies event deduplication and entitlement transition in one transaction.
- `subscriber-access-v1` preserves access through a canceled paid period, grants
  one non-resetting seven-day `past_due` grace, and suspends immediately after a
  completed refund or created chargeback.
- The PDF route rechecks entitlement, reads private Blob storage, streams with
  `private, no-store`, and never exposes a Blob URL.
- Analytics uses the exact 23-event subscriber-ops registry. The app emits the
  server-verifiable Checkout, billing, cancellation-flow, and PDF-access events;
  it does not pretend a server render proves browser visibility.
- Stripe return URLs use an allowlisted request origin with `VERCEL_URL` and the
  configured Surfaces domain as preview-safe fallbacks.

## Adapters

| Concern | Mock/local | Production |
| --- | --- | --- |
| Authentication | HMAC-signed HTTP-only demo cookie | Clerk |
| Billing | Non-network redirect + signed mock parser | Stripe Checkout, webhooks, Portal |
| Entitlements | Local JSON file | Neon Postgres |
| PDF | Generated private demo PDF | Private Vercel Blob |
| Analytics | Privacy-minimized JSONL | Canonical Neon analytics outbox |

Adapters initialize lazily. A local build does not need credentials. Production
fails closed unless `APP_MODE=production` and the required configuration exists.

## Staging boundary

The coordinating task reports an isolated, SSO-protected Vercel project at
`surfaces-platform/production-ai-handbook-staging`, a preview/development Neon
database with this app's migration applied, and a private preview/development
Blob containing the approved initial asset. Those resources are staging-only.
No production deployment, Blob promotion, live billing, or subscriber email is
authorized by this repository state.

See [HANDOFF.md](./HANDOFF.md) before any provider setup or deployment.

## Preview deployment

Use the guarded command below for this isolated staging project:

```sh
npm run deploy:preview
```

It verifies the exact linked Vercel project, runs the complete local check, and
invokes only `vercel deploy --target=preview --yes`. It refuses extra arguments,
and every Vercel build fails closed unless both `VERCEL_ENV` and
`VERCEL_TARGET_ENV` are exactly `preview`. Do not use a bare `vercel deploy` for
this project. Production promotion remains a separate, explicit approval.
