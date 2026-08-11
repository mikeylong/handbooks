import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const appRoot = process.cwd();
const repositoryRoot = path.resolve(appRoot, "..");
const localDefinitions = JSON.parse(
  await readFile(
    path.join(appRoot, "src/lib/analytics/contract.json"),
    "utf8",
  ),
);
const canonicalContracts = await import(
  pathToFileURL(
    path.join(repositoryRoot, "subscriber-ops/lib/contracts.mjs"),
  ).href
);
const canonicalSchema = JSON.parse(
  await readFile(
    path.join(
      repositoryRoot,
      "subscriber-ops/schemas/analytics-event.schema.json",
    ),
    "utf8",
  ),
);
const localPolicy = JSON.parse(
  await readFile(path.join(appRoot, "src/lib/subscriber-policy.v1.json"), "utf8"),
);
const canonicalPolicy = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "subscriber-ops/fixtures/subscriber-policy.v1.json"),
    "utf8",
  ),
);

assert.deepEqual(
  localDefinitions,
  canonicalContracts.ANALYTICS_EVENT_DEFINITIONS,
  "paywall analytics definitions drifted from subscriber-ops",
);
assert.deepEqual(
  Object.keys(localDefinitions),
  canonicalSchema.properties.event_name.enum,
  "paywall analytics names drifted from the canonical JSON Schema",
);
assert.equal(Object.keys(localDefinitions).length, 23);
assert.deepEqual(
  localPolicy,
  canonicalPolicy,
  "paywall subscriber policy drifted from subscriber-ops",
);
console.log("Contract parity passed: 23 canonical events and subscriber-access-v1.");
