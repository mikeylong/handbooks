export function assertVercelPreview(environment = process.env) {
  if (environment.VERCEL !== "1") return;

  const deploymentEnvironment = environment.VERCEL_ENV;
  const targetEnvironment = environment.VERCEL_TARGET_ENV;
  if (
    deploymentEnvironment !== "preview" ||
    targetEnvironment !== "preview"
  ) {
    throw new Error(
      `Refusing non-preview Vercel build (VERCEL_ENV=${deploymentEnvironment ?? "missing"}, VERCEL_TARGET_ENV=${targetEnvironment ?? "missing"}).`,
    );
  }
}

assertVercelPreview();
