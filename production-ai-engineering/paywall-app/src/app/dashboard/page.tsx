import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  getEntitlementForUser,
  hasDownloadAccess,
} from "@/lib/entitlements";
import { OFFER } from "@/lib/product-policy";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const entitlement = await getEntitlementForUser(
    session.userId,
    session.email,
  );
  const canDownload = hasDownloadAccess(entitlement);

  return (
    <section className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">Subscriber access</div>
          <h1>Your field guide</h1>
          <p>{session.email}</p>
        </div>
        <span className={`status-chip ${canDownload ? "active" : "inactive"}`}>
          {canDownload ? "Access active" : "Access inactive"}
        </span>
      </header>

      <div className="download-card">
        <div>
          <span className="document-mark">PDF</span>
          <h2>Production AI Engineering</h2>
          <p>
            The download is authorized at request time and streamed from private
            storage. No public object URL is exposed.
          </p>
        </div>
        {canDownload ? (
          <a className="button button-primary" href="/api/handbook">
            Download the current PDF
          </a>
        ) : (
          <form action="/api/checkout" method="post">
            <button className="button button-primary" type="submit">
              Subscribe for ${OFFER.amountMinor / 100}/month
            </button>
          </form>
        )}
      </div>

      <div className="account-grid">
        <article>
          <h2>Subscription</h2>
          <dl>
            <div>
              <dt>Status</dt>
              <dd>{entitlement?.status ?? "No subscription"}</dd>
            </div>
            <div>
              <dt>Renews</dt>
              <dd>
                {entitlement?.currentPeriodEnd
                  ? new Date(
                      entitlement.currentPeriodEnd * 1000,
                    ).toLocaleDateString("en-US")
                  : "Not available"}
              </dd>
            </div>
          </dl>
          {entitlement?.stripeCustomerId ? (
            <form action="/api/portal" method="post">
              <button className="text-button" type="submit">
                Manage billing and cancellation
              </button>
            </form>
          ) : null}
        </article>
        <article>
          <h2>Weekly field notes</h2>
          <p>
            Tuesday delivery and the subscriber archive are the next release
            slice. This foundation does not silently claim that email delivery is
            live.
          </p>
        </article>
      </div>

      <form action="/api/auth/logout" method="post">
        <button className="text-button muted" type="submit">
          Sign out
        </button>
      </form>
    </section>
  );
}
