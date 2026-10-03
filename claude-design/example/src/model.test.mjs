import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initial,
  parseFile,
  parseCSV,
  normalize,
  validate,
  connect,
  importRows,
  preview,
  runResult,
} from "./model.mjs";
const csv = readFileSync(
  new URL("../public/fixtures/customers-august.csv", import.meta.url),
  "utf8",
);
const raw = parseFile(csv, "customers-august.csv");
assert.deepEqual(
  parseFile(
    readFileSync(
      new URL("../public/fixtures/customers-august.json", import.meta.url),
      "utf8",
    ),
    "customers-august.json",
  ),
  raw,
);
const expected = JSON.parse(
  readFileSync(
    new URL("../public/fixtures/expected-results.json", import.meta.url),
    "utf8",
  ),
);
test("six input records keep exact provenance through normalization and validation", () => {
  assert.equal(raw.length, 6);
  const n = normalize(raw);
  assert.equal(n[0].email, "alice@example.com");
  assert.equal(n[5].email, "frank@example.com");
  assert.deepEqual(validate(n).errors, [
    { id: "C003", row: 4, column: "email", reason: "Invalid email" },
    { id: "C004", row: 5, column: "email", reason: "Email is required" },
    {
      id: "C005",
      row: 6,
      column: "health_score",
      reason: "Use a number from 0 to 100",
    },
  ]);
  assert.deepEqual(
    validate(n).valid.map((r) => r.customer_id),
    ["C001", "C002", "C006"],
  );
});
test("CSV and JSON parity; quoted CSV, CRLF, escaped quotes, malformed input", () => {
  assert.deepEqual(parseFile(JSON.stringify(raw), "rows.json"), raw);
  assert.deepEqual(parseCSV('a,b\r\n"a,b","c""d"\r\n'), [
    { a: "a,b", b: 'c"d' },
  ]);
  for (const input of ["a,b\n1", "a,a\n1,2", 'a,b\n"unclosed,2'])
    assert.throws(() => parseCSV(input));
  assert.throws(() => parseFile("{}", "rows.json"));
  assert.throws(() => parseFile(csv, "rows.txt"));
  assert.throws(() => parseFile('[{"customer_id":"x"}]', "rows.json"));
});
test("cycle, incompatible destination and duplicate reject without mutation", () => {
  const d = initial(),
    before = JSON.stringify(d);
  assert.throws(() => connect(d, "validate", "source"), /cycle/);
  assert.throws(() => connect(d, "warehouse", "normalize"), /cycle/);
  assert.throws(() => connect(d, "source", "normalize"), /already exists/);
  d.nodes.push({
    id: "quarantine",
    name: "Quarantine Invalid Rows",
    kind: "quarantine",
  });
  const next = JSON.stringify(d);
  assert.throws(() => connect(d, "normalize", "quarantine"), /incompatible/);
  assert.equal(JSON.stringify(d), next);
  assert.equal(JSON.stringify(initial()), before);
});
test("atomic import creates new source; disconnected run fails; recovery uses same records", () => {
  let d = importRows(initial(), raw, "quarantine", "contact_email");
  assert.equal(d.nodes[0].id, "august");
  assert.equal(d.edges.length, 2);
  assert.equal(runResult(d).node, "august");
  d = connect(d, "august", "normalize");
  assert.equal(runResult(d).node, "validate");
  d.nodes.push({
    id: "quarantine",
    name: "Quarantine Invalid Rows",
    kind: "quarantine",
  });
  d = connect(d, "validate", "quarantine");
  assert.equal(runResult(d).node, "warehouse");
  d.configs.warehouse = "customer_health";
  assert.deepEqual(runResult(d), expected.successful_run);
  assert.deepEqual(
    preview(d, "quarantine").map((r) => r.customer_id),
    ["C003", "C004", "C005"],
  );
  assert.deepEqual(
    preview(d, "warehouse").map((r) => r.customer_id),
    ["C001", "C002", "C006"],
  );
});
test("reject policy drops invalid rows and never quarantines them", () => {
  let d = connect(
    importRows(initial(), raw, "reject", "contact_email"),
    "august",
    "normalize",
  );
  d.configs.warehouse = "customer_health";
  assert.equal(runResult(d).rejected, 3);
  assert.equal(runResult(d).quarantined, 0);
});

test("missing required downstream edge blocks run; frozen expectations match each output", () => {
  let d = connect(
    importRows(initial(), raw, "reject", "contact_email"),
    "august",
    "normalize",
  );
  d.configs.warehouse = "customer_health";
  d.edges = d.edges.filter((e) => e[0] !== "normalize");
  assert.equal(runResult(d).node, "normalize");
  assert.deepEqual(normalize(raw), expected.normalized);
  assert.deepEqual(validate(normalize(raw)), expected.validation);
});

test("mapping must be confirmed; duplicate IDs are explicitly quarantined; BOM is accepted", () => {
  assert.throws(() => importRows(initial(), raw, "quarantine"), /Confirm/);
  assert.deepEqual(parseFile("\uFEFF" + csv, "bom.csv"), raw);
  const d = normalize([...raw, { ...raw[0] }]);
  assert.equal(
    validate(d).errors.filter((e) => e.column === "customer_id").length,
    2,
  );
  assert.equal(validate(d).valid.length, 2);
});

test("warehouse error names the attempted target", () => {
  let d = connect(
    importRows(initial(), raw, "reject", "contact_email"),
    "august",
    "normalize",
  );
  d.configs.warehouse = "other_missing_table";
  assert.match(runResult(d).reason, /other_missing_table/);
});
