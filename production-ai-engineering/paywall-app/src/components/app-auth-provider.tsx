import type { ReactNode } from "react";

import { readRuntimeConfig } from "@/lib/config";

export async function AppAuthProvider({ children }: { children: ReactNode }) {
  const config = readRuntimeConfig();
  if (config.APP_MODE === "mock") return children;

  const { ClerkProvider } = await import("@clerk/nextjs");
  return (
    <ClerkProvider publishableKey={config.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}
