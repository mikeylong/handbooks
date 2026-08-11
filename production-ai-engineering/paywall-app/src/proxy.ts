import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (process.env.APP_MODE !== "production") return NextResponse.next();
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
