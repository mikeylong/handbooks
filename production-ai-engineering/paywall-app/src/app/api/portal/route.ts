import { getSession } from "@/lib/auth";
import { analyticsSourceFromRequest, captureAnalytics } from "@/lib/analytics";
import { getBillingAdapter } from "@/lib/billing";
import { resolveAppOrigin } from "@/lib/config";
import { getEntitlementForUser } from "@/lib/entitlements";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.redirect(new URL("/sign-in", request.url), 303);
  }

  const entitlement = await getEntitlementForUser(
    session.userId,
    session.email,
  );
  if (!entitlement?.stripeCustomerId) {
    return Response.json(
      { error: "No billing customer is linked to this account." },
      { status: 409 },
    );
  }

  const portal = await getBillingAdapter().createCustomerPortal(
    entitlement.stripeCustomerId,
    resolveAppOrigin(request.url),
  );
  await captureAnalytics({
    eventName: "billing.cancellation_requested",
    actorRef: session.userId,
    source: analyticsSourceFromRequest(request),
    properties: { path: "stripe_customer_portal" },
  });
  return Response.redirect(portal.url, 303);
}
