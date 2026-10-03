export const clone = (v) => structuredClone(v);
export const initial = () => ({
  version: 1,
  nodes: [
    { id: "source", name: "Customers CSV", kind: "source", x: 0, y: 0 },
    { id: "normalize", name: "Normalize Email", kind: "transform", x: 0, y: 0 },
    {
      id: "validate",
      name: "Validate Customer Schema",
      kind: "quality",
      x: 0,
      y: 0,
    },
    {
      id: "warehouse",
      name: "Publish to Warehouse",
      kind: "destination",
      x: 0,
      y: 0,
    },
  ],
  edges: [
    ["source", "normalize"],
    ["normalize", "validate"],
    ["validate", "warehouse"],
  ],
  configs: {
    source: "customers-august.csv",
    normalize: "trim + lowercase",
    validate: "email + health_score",
    warehouse: "missing-warehouse",
  },
  rows: [],
  policy: "quarantine",
  imported: false,
});
export function parseCSV(text) {
  const out = [];
  let row = [],
    field = "",
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quote && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!quote && field.trim()) {
        throw Error("Quote must start a CSV field.");
      } else quote = !quote;
    } else if (ch === "," && !quote) {
      row.push(field);
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !quote) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v !== "")) out.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (quote) throw Error("Unclosed CSV quote.");
  if (field || row.length) {
    row.push(field);
    out.push(row);
  }
  if (out.length < 2)
    throw Error("The file needs headers and at least one data row.");
  const headers = out.shift().map((v) => v.trim());
  if (new Set(headers).size !== headers.length)
    throw Error("Duplicate CSV headers.");
  return out.map((r, i) => {
    if (r.length !== headers.length)
      throw Error(
        `Row ${i + 2} has ${r.length} columns; expected ${headers.length}.`,
      );
    return Object.fromEntries(headers.map((h, j) => [h, r[j]]));
  });
}
export function parseFile(text, name) {
  let r;
  if (name.endsWith(".csv")) r = parseCSV(text);
  else if (name.endsWith(".json")) {
    r = JSON.parse(text);
    if (
      !Array.isArray(r) ||
      !r.length ||
      r.some((v) => !v || typeof v !== "object" || Array.isArray(v))
    )
      throw Error("JSON must be a nonempty array of row objects.");
  } else throw Error("Choose a CSV or JSON file.");
  if (r.length > 1000)
    throw Error("The teaching importer supports at most 1,000 rows.");
  if (
    r.some(
      (v) =>
        !("customer_id" in v) ||
        !("contact_email" in v) ||
        !("health_score" in v),
    )
  )
    throw Error("Required fixture headers are missing.");
  return r;
}
export const normalize = (rows, mapping = "contact_email") =>
  rows.map((r, i) => ({
    customer_id: String(r.customer_id),
    email: String(r[mapping] ?? "")
      .trim()
      .toLowerCase(),
    health_score: String(r.health_score),
    fileRow: i + 2,
  }));
export function validate(rows) {
  const errors = [];
  const counts = new Map();
  for (const r of rows)
    counts.set(r.customer_id, (counts.get(r.customer_id) || 0) + 1);
  for (const r of rows) {
    if (!r.customer_id.trim() || counts.get(r.customer_id) > 1)
      errors.push({
        id: r.customer_id,
        row: r.fileRow,
        column: "customer_id",
        reason: "Use a unique nonempty customer ID",
      });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
      errors.push({
        id: r.customer_id,
        row: r.fileRow,
        column: "email",
        reason: r.email ? "Invalid email" : "Email is required",
      });
    if (
      !r.health_score.trim() ||
      !Number.isFinite(Number(r.health_score)) ||
      Number(r.health_score) < 0 ||
      Number(r.health_score) > 100
    )
      errors.push({
        id: r.customer_id,
        row: r.fileRow,
        column: "health_score",
        reason: "Use a number from 0 to 100",
      });
  }
  const invalid = new Set(errors.map((e) => e.row));
  return {
    valid: rows.filter((r) => !invalid.has(r.fileRow)),
    invalid: rows.filter((r) => invalid.has(r.fileRow)),
    errors,
  };
}
export function connect(doc, from, to) {
  if (from === to)
    throw Error("A node cannot connect to itself. The graph was not changed.");
  const f = doc.nodes.find((n) => n.id === from),
    t = doc.nodes.find((n) => n.id === to);
  if (!f || !t) throw Error("Choose two existing nodes.");
  if (doc.edges.some(([a, b]) => a === from && b === to))
    throw Error("This connection already exists. The graph was not changed.");
  const visit = (id, seen = new Set()) => {
    if (id === from) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return doc.edges.filter((e) => e[0] === id).some((e) => visit(e[1], seen));
  };
  if (visit(to))
    throw Error(
      `${f.name} cannot connect to ${t.name} because the connection would create a cycle. The graph was not changed.`,
    );
  if (
    f.kind === "destination" ||
    t.kind === "source" ||
    (t.kind === "quarantine" && f.kind !== "quality")
  )
    throw Error("The ports are incompatible. The graph was not changed.");
  return { ...doc, edges: [...doc.edges, [from, to]] };
}
export function importRows(
  doc,
  rows,
  policy,
  mapping,
  filename = "customers-august.csv",
) {
  if (mapping !== "contact_email")
    throw Error("Confirm the required contact_email mapping.");
  if (!["quarantine", "reject"].includes(policy))
    throw Error("Choose how to handle invalid rows.");
  const { source, ...configs } = doc.configs;
  return {
    ...doc,
    rows: clone(rows),
    mapping,
    filename,
    policy,
    imported: true,
    nodes: doc.nodes.map((n) =>
      n.id === "source"
        ? { ...n, id: "august", name: "Customers CSV (August import)" }
        : n,
    ),
    edges: doc.edges.filter((e) => e[0] !== "source" && e[1] !== "source"),
    configs: { ...configs, august: filename },
  };
}
export function preview(doc, id) {
  const n = normalize(doc.rows, doc.mapping),
    v = validate(n);
  const reached = (target, seen = new Set()) => {
    if (target === "august") return doc.imported;
    if (seen.has(target)) return false;
    seen.add(target);
    return doc.edges
      .filter((e) => e[1] === target)
      .some((e) => reached(e[0], seen));
  };
  if (id !== "source" && !reached(id)) return [];
  if (id === "source" || id === "august")
    return doc.rows.map((r, i) => ({
      ...r,
      email: r.contact_email,
      fileRow: i + 2,
    }));
  if (id === "normalize") return n;
  if (id === "quarantine") return v.invalid;
  if (id === "validate" || id === "warehouse") return v.valid;
  return [];
}
export function runResult(doc) {
  const v = validate(normalize(doc.rows, doc.mapping));
  if (!doc.imported)
    return {
      status: "failed",
      node: "source",
      reason: "Import the fixture before running.",
    };
  if (!doc.edges.some((e) => e[0] === "august" && e[1] === "normalize"))
    return {
      status: "failed",
      node: "august",
      reason: "Connect the imported source to Normalize Email.",
    };
  for (const [a, b] of [
    ["normalize", "validate"],
    ["validate", "warehouse"],
  ])
    if (!doc.edges.some((e) => e[0] === a && e[1] === b))
      return {
        status: "failed",
        node: a,
        reason: "Restore the required connection from " + a + " to " + b + ".",
      };
  if (
    doc.policy === "quarantine" &&
    !doc.edges.some((e) => e[0] === "validate" && e[1] === "quarantine")
  )
    return {
      status: "failed",
      node: "validate",
      reason: "Connect Validate Customer Schema to Quarantine Invalid Rows.",
    };
  if (doc.configs.warehouse !== "customer_health")
    return {
      status: "failed",
      node: "warehouse",
      reason: `Warehouse table ${doc.configs.warehouse} does not exist. Use customer_health.`,
    };
  return {
    status: "succeeded",
    published: v.valid.length,
    quarantined: doc.policy === "quarantine" ? v.invalid.length : 0,
    rejected: doc.policy === "reject" ? v.invalid.length : 0,
    ids: v.valid.map((r) => r.customer_id),
  };
}
