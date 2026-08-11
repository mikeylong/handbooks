import { getSession } from "@/lib/auth";
import { analyticsSourceFromRequest, captureAnalytics } from "@/lib/analytics";
import {
  accessDenialReason,
  getEntitlementForUser,
  hasDownloadAccess,
} from "@/lib/entitlements";
import { getPrivateAssetStore } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.redirect(new URL("/sign-in", request.url), 307);
  }

  const analyticsBase = {
    actorRef: session.userId,
    source: analyticsSourceFromRequest(request),
  };
  await captureAnalytics({
    ...analyticsBase,
    eventName: "subscriber.pdf_access_requested",
    properties: { access_route: "/api/handbook" },
  });
  const entitlement = await getEntitlementForUser(
    session.userId,
    session.email,
  );
  if (!hasDownloadAccess(entitlement)) {
    await captureAnalytics({
      ...analyticsBase,
      eventName: "subscriber.pdf_access_denied",
      properties: { reason_code: accessDenialReason(entitlement) },
    });
    return Response.json(
      { error: "An active subscription is required." },
      { status: 403 },
    );
  }

  const asset = await getPrivateAssetStore().getHandbook();
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Disposition": `attachment; filename="${asset.filename}"`,
    "Content-Type": asset.contentType,
    "X-Content-Type-Options": "nosniff",
  });
  if (asset.contentLength !== null) {
    headers.set("Content-Length", String(asset.contentLength));
  }
  if (asset.etag) headers.set("ETag", asset.etag);
  await captureAnalytics({
    ...analyticsBase,
    eventName: "subscriber.pdf_access_granted",
    properties: { delivery_mode: "authenticated_stream" },
  });
  return new Response(asset.body, { status: 200, headers });
}
