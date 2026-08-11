export const EXPECTED_VERCEL_PROJECT: Readonly<{
  projectId: string;
  orgId: string;
  projectName: string;
}>;

export function assertLinkedProject(project: Record<string, unknown>): void;
export function previewDeployArgs(extraArguments?: string[]): string[];
