import type { AuthAdapter } from "./types";

export class ClerkAuthAdapter implements AuthAdapter {
  async getSession() {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return null;

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      throw new Error("The authenticated Clerk account has no primary email.");
    }

    return { userId, email };
  }
}
