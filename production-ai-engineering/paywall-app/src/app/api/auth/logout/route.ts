import { cookies } from "next/headers";

import { LOCAL_SESSION_COOKIE } from "@/lib/auth/local-session";
import { readRuntimeConfig } from "@/lib/config";

export async function POST(request: Request) {
  const config = readRuntimeConfig();
  if (config.APP_MODE === "mock") {
    const cookieStore = await cookies();
    cookieStore.delete(LOCAL_SESSION_COOKIE);
  }
  return Response.redirect(new URL("/", request.url), 303);
}
