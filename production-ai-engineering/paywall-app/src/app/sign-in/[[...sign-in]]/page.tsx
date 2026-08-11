import { readRuntimeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const config = readRuntimeConfig();
  if (config.APP_MODE === "production") {
    const { SignIn } = await import("@clerk/nextjs");
    return (
      <section className="auth-shell">
        <SignIn />
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <div className="eyebrow">Local development</div>
        <h1>Open the subscriber demo.</h1>
        <p>
          This creates a signed, HTTP-only local session. It does not contact an
          identity provider or billing service.
        </p>
        <form action="/api/auth/local-login" method="post">
          <button className="button button-primary" type="submit">
            Continue as {config.LOCAL_DEMO_EMAIL}
          </button>
        </form>
      </div>
    </section>
  );
}
