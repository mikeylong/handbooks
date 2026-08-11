import { createHmac, timingSafeEqual } from "node:crypto";

import type { AuthSession } from "./types";

export const LOCAL_SESSION_COOKIE = "pae_local_session";

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createLocalSessionCookie(
  session: AuthSession,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${signatureFor(payload, secret)}`;
}

export function verifyLocalSessionCookie(
  value: string | undefined,
  secret: string,
): AuthSession | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;

  const payload = value.slice(0, separator);
  const provided = Buffer.from(value.slice(separator + 1), "base64url");
  const expected = Buffer.from(signatureFor(payload, secret), "base64url");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<AuthSession>;
    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId ||
      typeof parsed.email !== "string" ||
      !parsed.email.includes("@")
    ) {
      return null;
    }
    return { userId: parsed.userId, email: parsed.email };
  } catch {
    return null;
  }
}
