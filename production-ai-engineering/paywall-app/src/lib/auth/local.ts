import { cookies } from "next/headers";

import type { MockConfig } from "@/lib/config";

import { LOCAL_SESSION_COOKIE, verifyLocalSessionCookie } from "./local-session";
import type { AuthAdapter } from "./types";

export class LocalAuthAdapter implements AuthAdapter {
  constructor(private readonly config: MockConfig) {}

  async getSession() {
    const cookieStore = await cookies();
    return verifyLocalSessionCookie(
      cookieStore.get(LOCAL_SESSION_COOKIE)?.value,
      this.config.LOCAL_AUTH_SECRET,
    );
  }
}
