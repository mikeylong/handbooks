import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const EXPECTED_VERCEL_PROJECT = Object.freeze({
  projectId: "prj_MeImFDzIFm2AD6SYKoduyFfVsPtd",
  orgId: "team_Kw6YLfcGtRy40u9UEvifOh1r",
  projectName: "production-ai-handbook-staging",
});

export function assertLinkedProject(project) {
  for (const [key, expected] of Object.entries(EXPECTED_VERCEL_PROJECT)) {
    if (project[key] !== expected) {
      throw new Error(`Refusing deployment for unexpected Vercel ${key}.`);
    }
  }
}

export function previewDeployArgs(extraArguments = []) {
  if (extraArguments.length > 0) {
    throw new Error("deploy:preview does not accept target overrides or arguments.");
  }
  return ["deploy", "--target=preview", "--yes"];
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}.`);
  }
}

function main() {
  const project = JSON.parse(readFileSync(".vercel/project.json", "utf8"));
  assertLinkedProject(project);
  const deployArgs = previewDeployArgs(process.argv.slice(2));
  run("npm", ["run", "check"]);
  run("vercel", deployArgs);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
