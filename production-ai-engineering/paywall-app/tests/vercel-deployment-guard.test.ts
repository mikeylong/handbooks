import { describe, expect, it } from "vitest";

import { assertVercelPreview } from "../scripts/assert-vercel-preview.mjs";
import {
  EXPECTED_VERCEL_PROJECT,
  assertLinkedProject,
  previewDeployArgs,
} from "../scripts/deploy-vercel-preview.mjs";

describe("Vercel preview deployment guard", () => {
  it("allows local builds and exact preview builds", () => {
    expect(() => assertVercelPreview({})).not.toThrow();
    expect(() =>
      assertVercelPreview({
        VERCEL: "1",
        VERCEL_ENV: "preview",
        VERCEL_TARGET_ENV: "preview",
      }),
    ).not.toThrow();
  });

  it.each([
    { VERCEL: "1", VERCEL_ENV: "production", VERCEL_TARGET_ENV: "production" },
    { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "production" },
    { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_TARGET_ENV: "staging" },
    { VERCEL: "1", VERCEL_ENV: "preview" },
  ])("rejects a non-preview Vercel build: %o", (environment) => {
    expect(() => assertVercelPreview(environment)).toThrow(
      /Refusing non-preview Vercel build/,
    );
  });

  it("pins the only allowed linked project", () => {
    expect(() => assertLinkedProject(EXPECTED_VERCEL_PROJECT)).not.toThrow();
    expect(() =>
      assertLinkedProject({
        ...EXPECTED_VERCEL_PROJECT,
        projectId: "prj_wrong",
      }),
    ).toThrow(/unexpected Vercel projectId/);
  });

  it("uses only an explicit preview target and rejects overrides", () => {
    expect(previewDeployArgs()).toEqual([
      "deploy",
      "--target=preview",
      "--yes",
    ]);
    expect(() => previewDeployArgs(["--prod"])).toThrow(/does not accept/);
  });
});
