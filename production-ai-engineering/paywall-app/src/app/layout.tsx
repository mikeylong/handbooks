import type { Metadata } from "next";
import Link from "next/link";

import { AppAuthProvider } from "@/components/app-auth-provider";
import { getAppMode, readRuntimeConfig } from "@/lib/config";

import "./globals.css";

export const metadata: Metadata = {
  title: "Production AI Engineering",
  description: "A maintained field guide for the work after the demo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const mockMode = getAppMode() === "mock";
  const brand = readRuntimeConfig();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AppAuthProvider>
          {mockMode ? (
            <div className="mock-banner" role="status">
              Local mock mode · no real billing or handbook is connected
            </div>
          ) : null}
          <header className="site-header">
            <Link className="brand" href="/">
              Production AI Engineering
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/sample">Free sample</Link>
              <Link href="/dashboard">Subscriber access</Link>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <p>{brand.SELLER_NAME} · A maintained field guide for production AI systems.</p>
            <a href={`mailto:${brand.SUPPORT_EMAIL}`}>
              {brand.SUPPORT_EMAIL}
            </a>
          </footer>
        </AppAuthProvider>
      </body>
    </html>
  );
}
