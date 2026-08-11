import Link from "next/link";

import { readRuntimeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const config = readRuntimeConfig();
  if (config.APP_MODE === "production") {
    const { SignUp } = await import("@clerk/nextjs");
    return (
      <section className="auth-shell">
        <SignUp />
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="eyebrow">Local development</div>
        <h1>No account is created in mock mode.</h1>
        <p>
          Use the signed local subscriber demo to test access without contacting
          an identity or billing provider.
        </p>
        <Link className="button button-primary" href="/sign-in">
          Open the local sign-in
        </Link>
      </div>
    </section>
  );
}
