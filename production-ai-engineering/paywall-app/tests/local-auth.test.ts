import { describe, expect, it } from "vitest";

import {
  createLocalSessionCookie,
  verifyLocalSessionCookie,
} from "../src/lib/auth/local-session";

const secret = "test-auth-secret-with-at-least-32-characters";
const session = { userId: "user_123", email: "reader@example.com" };

describe("local signed session", () => {
  it("round-trips an authentic session", () => {
    const cookie = createLocalSessionCookie(session, secret);
    expect(verifyLocalSessionCookie(cookie, secret)).toEqual(session);
  });

  it("rejects a changed cookie", () => {
    const cookie = createLocalSessionCookie(session, secret);
    expect(verifyLocalSessionCookie(`${cookie}x`, secret)).toBeNull();
  });
});
