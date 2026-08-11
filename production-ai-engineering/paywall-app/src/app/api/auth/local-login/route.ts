import { cookies } from "next/headers";

import {
  LOCAL_SESSION_COOKIE,
  createLocalSessionCookie,
} from "@/lib/auth/local-session";
import { readRuntimeConfig } from "@/lib/config";

export async function POST(request: Request) {
  const config = readRuntimeConfig();
  if (config.APP_MODE !== "mock") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    LOCAL_SESSION_COOKIE,
    createLocalSessionCookie(
      {
        userId: config.LOCAL_DEMO_USER_ID,
        email: config.LOCAL_DEMO_EMAIL,
      },
      config.LOCAL_AUTH_SECRET,
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(config.NEXT_PUBLIC_APP_URL).protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  );
  return Response.redirect(new URL("/dashboard", request.url), 303);
}
