import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const expectedProject = {
  id: "prj_MeImFDzIFm2AD6SYKoduyFfVsPtd",
  name: "production-ai-handbook-staging",
};
const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
if (
  project.projectId !== expectedProject.id ||
  project.projectName !== expectedProject.name
) {
  throw new Error("Refusing to change protection for an unexpected Vercel project.");
}

const outputDirectory = path.resolve(".data");
const outputPath = path.join(
  outputDirectory,
  "vercel-protection-bypass-secret",
);
mkdirSync(outputDirectory, { recursive: true });
const secret = randomBytes(32).toString("base64url");
writeFileSync(outputPath, `${secret}\n`, { flag: "wx", mode: 0o600 });

const result = spawnSync(
  "vercel",
  [
    "project",
    "protection",
    "enable",
    expectedProject.name,
    "--protection-bypass",
    "--protection-bypass-secret",
    secret,
    "--format",
    "json",
  ],
  { cwd: process.cwd(), encoding: "utf8", env: process.env },
);

if (result.status !== 0) {
  unlinkSync(outputPath);
  const detail = `${result.stderr || result.stdout || "unknown error"}`.replaceAll(
    secret,
    "[redacted]",
  );
  throw new Error(`Vercel protection-bypass provisioning failed: ${detail}`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ready",
      projectId: expectedProject.id,
      ssoPreserved: true,
      secretStored: true,
      secretPath: ".data/vercel-protection-bypass-secret",
    },
    null,
    2,
  )}\n`,
);
