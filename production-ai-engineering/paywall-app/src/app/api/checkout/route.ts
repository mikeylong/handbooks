import { getSession } from "@/lib/auth";
import { analyticsSourceFromRequest, captureAnalytics } from "@/lib/analytics";
import { getBillingAdapter } from "@/lib/billing";
import { resolveAppOrigin } from "@/lib/config";
import {
  getEntitlementForUser,
  hasDownloadAccess,
} from "@/lib/entitlements";
import { OFFER } from "@/lib/product-policy";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.redirect(new URL("/sign-in", request.url), 303);
  }

  const entitlement = await getEntitlementForUser(
    session.userId,
    session.email,
  );
  if (hasDownloadAccess(entitlement)) {
    return Response.redirect(
      new URL("/dashboard?subscription=active", request.url),
      303,
    );
  }

  const checkout = await getBillingAdapter().createSubscriptionCheckout({
    userId: session.userId,
    email: session.email,
    customerId: entitlement?.stripeCustomerId,
    appOrigin: resolveAppOrigin(request.url),
  });
  await captureAnalytics({
    eventName: "billing.checkout_started",
    actorRef: session.userId,
    source: analyticsSourceFromRequest(request),
    properties: {
      price_key: OFFER.priceKey,
      checkout_flow_version: OFFER.checkoutFlowVersion,
    },
  });
  return Response.redirect(checkout.url, 303);
}
