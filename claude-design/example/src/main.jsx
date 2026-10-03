import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Button,
  InputField,
  Tag,
  Table,
  TableHead,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Dialog,
  DialogModal,
  DialogTitle,
  SelectField,
  SelectItem,
} from "primitives";
import "../../sds/src/index.css";
import "./studio.css";
import {
  initial,
  clone,
  parseFile,
  normalize,
  validate,
  connect,
  importRows,
  preview,
  runResult,
} from "./model.mjs";
const KEY = "studio-stage2-v1";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};
function App() {
  const saved = load();
  const [doc, setDoc] = useState(saved?.doc || initial),
    [status, setStatus] = useState("pristine"),
    [selected, setSelected] = useState("normalize"),
    [message, setMessage] = useState("Pipeline ready."),
    [run, setRun] = useState(saved?.run || { status: "ready" }),
    [permission, setPermission] = useState("edit"),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [importState, setImportState] = useState("initial"),
    [pending, setPending] = useState([]),
    [pendingName, setPendingName] = useState(""),
    [mapping, setMapping] = useState(false),
    [policy, setPolicy] = useState(""),
    [errors, setErrors] = useState([]),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("normalize"),
    [undo, setUndo] = useState([]),
    [redo, setRedo] = useState([]),
    [stale, setStale] = useState(false),
    [sheetState, setSheetState] = useState("rows"),
    [sheetSize, setSheetSize] = useState(260),
    [search, setSearch] = useState(""),
    [pageIndex, setPageIndex] = useState(0),
    [sort, setSort] = useState({ column: "id", direction: "ascending" }),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState(0),
    [mode, setMode] = useState(
      new URLSearchParams(location.search).has("baseline")
        ? "baseline"
        : "extension",
    ),
    [initialLoading, setInitialLoading] = useState(true),
    [forceFailure, setForceFailure] = useState(""),
    [remoteVersion, setRemoteVersion] = useState(saved?.doc.version || 1),
    [conflict, setConflict] = useState(false),
    [sheetError, setSheetError] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(innerWidth);
  const importToken = useRef(0),
    runToken = useRef(0),
    saveToken = useRef(0),
    importButton = useRef(null),
    pointer = useRef(null);
  const mobile = () => viewportWidth < 1024;
  const locked =
    permission !== "edit" || busy || status === "saving" || mobile();
  const invalid = Object.values(doc.configs).some((v) => !String(v).trim());
  useEffect(() => {
    const h = () => setViewportWidth(innerWidth);
    addEventListener("resize", h);
    return () => removeEventListener("resize", h);
  }, []);
  useEffect(() => {
    saveToken.current++;
  }, [permission]);
  useEffect(() => {
    document
      .querySelector(`[data-node="${selected}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 250);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setFrom("");
        setMessage("Connection cancelled. The graph was not changed.");
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    window.studio = {
      doc,
      status,
      selected,
      run,
      permission,
      busy,
      importState,
      stale,
    };
  }, [doc, status, selected, run, permission, busy, importState, stale]);
  function change(next) {
    if (locked) {
      setMessage("Editing is unavailable. Your work is preserved.");
      return;
    }
    setUndo([...undo, clone(doc)]);
    setRedo([]);
    setDoc(next);
    setStatus("dirty");
    setStale(true);
  }
  function pick(id) {
    if (invalid) {
      setMessage(
        "Complete the required configuration before changing nodes. Your draft is preserved.",
      );
      document.querySelector("#config-field input")?.focus();
      return;
    }
    setSelected(id);
    setSearch("");
    setPageIndex(0);
    setSheetState("rows");
  }
  function move(id, dx, dy) {
    change({
      ...doc,
      nodes: doc.nodes.map((n) =>
        n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n,
      ),
    });
  }
  function history(direction) {
    const stack = direction === "undo" ? undo : redo;
    if (!stack.length || locked) return;
    const next = stack.at(-1);
    if (direction === "undo") {
      setUndo(stack.slice(0, -1));
      setRedo([...redo, clone(doc)]);
    } else {
      setRedo(stack.slice(0, -1));
      setUndo([...undo, clone(doc)]);
    }
    setDoc(next);
    setStatus("dirty");
    setStale(true);
  }
  function edge() {
    try {
      change(connect(doc, from, to));
      setMessage("Connection created. Unsaved changes.");
      setFrom("");
      document.querySelector(`[data-node="${to}"]`)?.focus();
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function parse(file) {
    if (!file) return;
    const token = ++importToken.current;
    setImportState("parsing");
    setMapping(false);
    setPolicy("");
    setErrors([]);
    try {
      const text = await file.text();
      await new Promise((r) => setTimeout(r, 250));
      const rows = parseFile(text, file.name);
      setPendingName(file.name);
      if (token !== importToken.current) return;
      setPending(rows);
      setErrors(validate(normalize(rows)).errors);
      setImportState("mapping");
    } catch (e) {
      if (token === importToken.current) {
        setImportState("failed");
        setMessage(
          e.message + " The graph was not changed. Choose another file.",
        );
      }
    }
  }
  function closeImport() {
    importToken.current++;
    setOpen(false);
    setImportState("cancelled");
    setMessage("Import cancelled. The graph was not changed.");
    setTimeout(() => importButton.current?.focus(), 0);
  }
  async function commitImport() {
    if (!mapping || !policy || locked) return;
    const token = ++importToken.current;
    setImportState("importing");
    await new Promise((r) => setTimeout(r, 300));
    if (token !== importToken.current) return;
    const next = importRows(doc, pending, policy, "contact_email", pendingName);
    change(next);
    setSelected("august");
    setSheetState("rows");
    setStale(false);
    setOpen(false);
    setImportState("partial success");
    setMessage(
      `Imported ${pending.length} rows. ${validate(normalize(pending)).invalid.length} rows need recovery. Connect the new source to Normalize Email.`,
    );
    setTimeout(
      () => document.querySelector('[data-node="august"]')?.focus(),
      0,
    );
  }
  async function save() {
    if (locked || invalid) return;
    if (remoteVersion !== doc.version) {
      setConflict(true);
      setStatus("conflict");
      setMessage(
        "A newer version exists. Local changes are preserved. Review versions.",
      );
      return;
    }
    const token = ++saveToken.current;
    setStatus("saving");
    await new Promise((r) => setTimeout(r, 250));
    if (token !== saveToken.current) {
      setStatus("dirty");
      return;
    }
    if (forceFailure === "save") {
      setStatus("save failed");
      setMessage("Save failed. Local changes are preserved. Retry Save.");
      return;
    }
    const next = { ...doc, version: doc.version + 1 };
    setDoc(next);
    setRemoteVersion(next.version);
    localStorage.setItem(KEY, JSON.stringify({ doc: next, run }));
    setStatus("saved");
    setMessage("Pipeline saved.");
  }
  async function runPipeline() {
    if (locked || invalid || !["saved", "pristine"].includes(status)) return;
    const token = ++runToken.current;
    setBusy(true);
    setRun({ status: "running" });
    setMessage(
      "Pipeline running. Editing is locked; nodes remain inspectable.",
    );
    await new Promise((r) => setTimeout(r, 700));
    if (token !== runToken.current) return;
    const result = runResult(doc);
    setRun(result);
    setBusy(false);
    localStorage.setItem(KEY, JSON.stringify({ doc, run: result }));
    if (result.status === "failed") {
      setSelected(result.node);
      setMessage(result.reason + " Repair the node, Save, and Run again.");
      setTimeout(
        () => document.querySelector(`[data-node="${result.node}"]`)?.focus(),
        0,
      );
    } else
      setMessage(
        `Run succeeded. Published ${result.published}; quarantined ${result.quarantined}; rejected ${result.rejected}.`,
      );
  }
  function addQuarantine() {
    if (doc.nodes.some((n) => n.id === "quarantine")) return;
    change({
      ...doc,
      nodes: [
        ...doc.nodes,
        {
          id: "quarantine",
          name: "Quarantine Invalid Rows",
          kind: "quarantine",
          x: 0,
          y: 0,
        },
      ],
      configs: { ...doc.configs, quarantine: "invalid customer rows" },
    });
  }
  const node = doc.nodes.find((n) => n.id === selected);
  const rows = preview(doc, selected);
  let filtered = rows.filter((r) =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  filtered.sort(
    (a, b) =>
      String(a.customer_id).localeCompare(String(b.customer_id)) *
      (sort.direction === "ascending" ? 1 : -1),
  );
  const visible = filtered.slice(pageIndex * 3, pageIndex * 3 + 3);
  return (
    <>
      <div className="teaching-label">
        Local teaching example. Save, Run, permissions and conflicts use browser
        simulation. No Claude Design export.
      </div>
      <div className="app-shell">
        <nav aria-label="Product navigation">
          <strong>Pipeline Studio</strong>
          <a href="/pipelines/customer-health/edit" aria-current="page">
            Pipelines
          </a>
          <span>Data sources</span>
          <span>Runs</span>
        </nav>
        <main>
          <header data-shell="header">
            <div>
              <p>Pipelines / Customer health</p>
              <h1>
                Customer health <Tag scheme="neutral">Development</Tag>
              </h1>
              <p>Last run: {run.status}</p>
              {mobile() && (
                <p>View-only on mobile. Use at least 1024 × 768 to edit.</p>
              )}
            </div>
            <div className="actions">
              <Button
                ref={importButton}
                variant="neutral"
                isDisabled={locked || doc.imported}
                onPress={() => {
                  setOpen(true);
                  setImportState("initial");
                }}
              >
                Import data
              </Button>
              <Button
                variant="neutral"
                isDisabled={
                  locked ||
                  invalid ||
                  status === "pristine" ||
                  status === "saved"
                }
                onPress={save}
              >
                Save
              </Button>
              <Button
                isDisabled={
                  locked || invalid || !["saved", "pristine"].includes(status)
                }
                onPress={runPipeline}
              >
                Run
              </Button>
              <Button
                variant="subtle"
                aria-label="More actions"
                onPress={() =>
                  setMessage("No additional actions in this teaching example.")
                }
              >
                •••
              </Button>
            </div>
          </header>
          <div className="status" role="status" aria-live="polite">
            <Tag scheme={run.status === "failed" ? "danger" : "neutral"}>
              {busy ? "Running" : permission === "edit" ? status : permission}
            </Tag>{" "}
            {message}
          </div>
          {initialLoading ? (
            <p role="status">Loading pipeline…</p>
          ) : (
            <>
              <div className="workspace">
                <section className="canvas" aria-label="Pipeline graph">
                  <div className="toolbar">
                    <Button
                      variant="subtle"
                      onPress={() => setZoom(Math.min(1.25, zoom + 0.1))}
                    >
                      Zoom in
                    </Button>
                    <Button
                      variant="subtle"
                      onPress={() => setZoom(Math.max(0.6, zoom - 0.1))}
                    >
                      Zoom out
                    </Button>
                    <Button
                      variant="subtle"
                      onPress={() => {
                        setZoom(1);
                        setPan(0);
                      }}
                    >
                      Fit to view
                    </Button>
                    <Button
                      variant="subtle"
                      onPress={() => {
                        setZoom(1);
                        setPan(0);
                      }}
                    >
                      Reset view
                    </Button>
                    <Button variant="subtle" onPress={() => setPan(pan + 15)}>
                      Pan right
                    </Button>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <div
                    className={mode === "baseline" ? "linear" : "graph"}
                    style={{
                      transform: `scale(${zoom}) translateX(${pan}px)`,
                      transformOrigin: "top left",
                    }}
                  >
                    {doc.nodes.map((n) => (
                      <div
                        key={n.id}
                        onPointerDownCapture={(e) => {
                          pointer.current = {
                            id: n.id,
                            x: e.clientX,
                            y: e.clientY,
                          };
                        }}
                        onPointerMoveCapture={(e) => {
                          if (
                            pointer.current?.id === n.id &&
                            Math.abs(e.clientX - pointer.current.x) +
                              Math.abs(e.clientY - pointer.current.y) >
                              5
                          )
                            e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerUpCapture={(e) => {
                          if (pointer.current?.id === n.id) {
                            const dx = e.clientX - pointer.current.x,
                              dy = e.clientY - pointer.current.y;
                            if (Math.abs(dx) + Math.abs(dy) > 5)
                              move(n.id, dx, dy);
                            pointer.current = null;
                          }
                        }}
                        style={{ transform: `translate(${n.x}px,${n.y}px)` }}
                      >
                        <Button
                          variant={selected === n.id ? "primary" : "neutral"}
                          data-node={n.id}
                          className="pipeline-node"
                          onPress={() => pick(n.id)}
                          onKeyDown={(e) => {
                            if (
                              !e.shiftKey &&
                              [
                                "ArrowLeft",
                                "ArrowRight",
                                "ArrowUp",
                                "ArrowDown",
                              ].includes(e.key)
                            ) {
                              e.preventDefault();
                              const i = doc.nodes.findIndex(
                                  (x) => x.id === n.id,
                                ),
                                step = ["ArrowRight", "ArrowDown"].includes(
                                  e.key,
                                )
                                  ? 1
                                  : -1,
                                next =
                                  doc.nodes[
                                    (i + step + doc.nodes.length) %
                                      doc.nodes.length
                                  ];
                              pick(next.id);
                              document
                                .querySelector(`[data-node="${next.id}"]`)
                                ?.focus();
                            }
                            if (
                              e.shiftKey &&
                              [
                                "ArrowLeft",
                                "ArrowRight",
                                "ArrowUp",
                                "ArrowDown",
                              ].includes(e.key)
                            ) {
                              e.preventDefault();
                              move(
                                n.id,
                                e.key === "ArrowRight"
                                  ? 8
                                  : e.key === "ArrowLeft"
                                    ? -8
                                    : 0,
                                e.key === "ArrowDown"
                                  ? 8
                                  : e.key === "ArrowUp"
                                    ? -8
                                    : 0,
                              );
                            }
                            if (e.key.toLowerCase() === "c" && !locked) {
                              setFrom(n.id);
                              setMessage(
                                `Connect from ${n.name}. Choose a destination.`,
                              );
                            }
                          }}
                        >
                          <span>{n.name}</span>
                          <small>
                            {n.kind} ·{" "}
                            {busy
                              ? "running"
                              : run.node === n.id && run.status === "failed"
                                ? "! last run failed"
                                : "○ ready"}
                          </small>
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="connections" aria-label="Connections">
                    {doc.edges.map(([a, b]) => (
                      <p key={a + b}>
                        {doc.nodes.find((n) => n.id === a)?.name} →{" "}
                        {doc.nodes.find((n) => n.id === b)?.name}{" "}
                        <Button
                          variant="subtle"
                          size="small"
                          aria-label={`Delete connection ${a} to ${b}`}
                          isDisabled={locked}
                          onPress={() =>
                            change({
                              ...doc,
                              edges: doc.edges.filter(
                                (e) => e[0] !== a || e[1] !== b,
                              ),
                            })
                          }
                        >
                          Remove
                        </Button>
                      </p>
                    ))}
                  </div>
                  {mode !== "baseline" && (
                    <>
                      <div className="connect-controls">
                        <SelectField
                          label="Connect from"
                          selectedKey={from}
                          onSelectionChange={setFrom}
                          isDisabled={locked}
                        >
                          {doc.nodes.map((n) => (
                            <SelectItem key={n.id} id={n.id}>
                              {n.name}
                            </SelectItem>
                          ))}
                        </SelectField>
                        <SelectField
                          label="Connect to"
                          selectedKey={to}
                          onSelectionChange={setTo}
                          isDisabled={locked}
                        >
                          {doc.nodes.map((n) => (
                            <SelectItem key={n.id} id={n.id}>
                              {n.name}
                            </SelectItem>
                          ))}
                        </SelectField>
                        <Button isDisabled={locked || !from} onPress={edge}>
                          Connect
                        </Button>
                      </div>
                      <div className="actions">
                        <Button
                          variant="neutral"
                          isDisabled={locked}
                          onPress={addQuarantine}
                        >
                          Add quarantine
                        </Button>
                        <Button
                          variant="neutral"
                          isDisabled={locked || !undo.length}
                          onPress={() => history("undo")}
                        >
                          Undo
                        </Button>
                        <Button
                          variant="neutral"
                          isDisabled={locked || !redo.length}
                          onPress={() => history("redo")}
                        >
                          Redo
                        </Button>
                      </div>
                    </>
                  )}
                </section>
                <aside aria-label="Node inspector">
                  <h2>{node?.name || "No node selected"}</h2>
                  <InputField
                    id="config-field"
                    label="Configuration"
                    value={doc.configs[selected] || ""}
                    isDisabled={locked}
                    isInvalid={!String(doc.configs[selected] || "").trim()}
                    errorMessage="Configuration is required. Your draft is preserved."
                    onChange={(value) =>
                      change({
                        ...doc,
                        configs: { ...doc.configs, [selected]: value },
                      })
                    }
                  />
                  <p>
                    {selected === "warehouse"
                      ? `Configured warehouse target: ${doc.configs.warehouse}. Required target for this fixture: customer_health.`
                      : "Fixture configuration. Warehouse target controls the simulated run failure; other fields exercise draft mechanics."}
                  </p>
                  <Button
                    variant="neutral"
                    isDisabled={locked}
                    onPress={() => {
                      const v = validate(normalize(doc.rows));
                      setMessage(
                        selected === "warehouse" &&
                          doc.configs.warehouse !== "customer_health"
                          ? "Test Publish to Warehouse failed: use customer_health."
                          : selected === "validate"
                            ? `Test Validate Customer Schema: ${v.valid.length} valid rows, ${v.invalid.length} invalid rows.`
                            : `Test ${node?.name}: ${preview(doc, selected).length} output rows.`,
                      );
                    }}
                  >
                    Test node
                  </Button>
                  {busy && (
                    <Button
                      variant="neutral"
                      onPress={() => {
                        runToken.current++;
                        setBusy(false);
                        setRun({ status: "cancelled" });
                        setMessage("Run cancelled. The graph is preserved.");
                      }}
                    >
                      Cancel run
                    </Button>
                  )}
                </aside>
              </div>
              <section
                className="sheet"
                style={{ maxHeight: sheetSize }}
                aria-label="Data preview"
              >
                <div className="sheet-heading">
                  <h2>Data preview: {node?.name}</h2>
                  <Tag scheme={stale ? "warning" : "neutral"}>
                    {stale
                      ? "Stale"
                      : `Version ${doc.version} · ${rows.length} rows`}
                  </Tag>
                  <Button
                    variant="neutral"
                    onPress={() => {
                      setSheetState("loading");
                      setTimeout(() => {
                        setSheetState("rows");
                        setStale(false);
                        setSheetError(false);
                      }, 200);
                    }}
                  >
                    Refresh preview
                  </Button>
                </div>
                <div className="sheet-body">
                  <label>
                    Preview height{" "}
                    <input
                      type="range"
                      min="160"
                      max="380"
                      step="20"
                      value={sheetSize}
                      onChange={(e) => setSheetSize(Number(e.target.value))}
                    />
                  </label>
                  {mode === "baseline" ? (
                    <p>Preview collapsed in the baseline.</p>
                  ) : sheetState === "loading" ? (
                    <p role="status">Loading preview…</p>
                  ) : sheetError ? (
                    <p role="alert">
                      Preview failed. Existing rows are preserved. Refresh
                      preview to retry.
                    </p>
                  ) : (
                    <>
                      <InputField
                        label="Search rows"
                        value={search}
                        onChange={(v) => {
                          setSearch(v);
                          setPageIndex(0);
                        }}
                      />
                      <p>
                        Showing {visible.length} of {filtered.length} rows. Page{" "}
                        {pageIndex + 1}.
                      </p>
                      <Table
                        aria-label="Fixture data"
                        dense
                        sortDescriptor={sort}
                        onSortChange={setSort}
                      >
                        <TableHead>
                          <TableColumn id="id" isRowHeader allowsSorting>
                            Customer ID
                          </TableColumn>
                          <TableColumn>Email</TableColumn>
                          <TableColumn>Health score</TableColumn>
                          <TableColumn>Source row</TableColumn>
                        </TableHead>
                        <TableBody renderEmptyState={() => "No matching rows."}>
                          {visible.map((r) => (
                            <TableRow key={r.fileRow} id={String(r.fileRow)}>
                              <TableCell>{r.customer_id}</TableCell>
                              <TableCell>{r.email || "(missing)"}</TableCell>
                              <TableCell>{r.health_score}</TableCell>
                              <TableCell>{r.fileRow}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <Button
                        variant="neutral"
                        isDisabled={pageIndex === 0}
                        onPress={() => setPageIndex(pageIndex - 1)}
                      >
                        Previous rows
                      </Button>
                      <Button
                        variant="neutral"
                        isDisabled={(pageIndex + 1) * 3 >= filtered.length}
                        onPress={() => setPageIndex(pageIndex + 1)}
                      >
                        Next rows
                      </Button>
                      {selected === "validate" &&
                        validate(normalize(doc.rows)).errors.map((e) => (
                          <p key={e.row + e.column}>
                            <Button
                              variant="subtle"
                              onPress={() => {
                                pick("validate");
                                document
                                  .querySelector('[data-node="validate"]')
                                  ?.focus();
                              }}
                            >
                              Row {e.row}, {e.column}: {e.reason}
                            </Button>
                          </p>
                        ))}
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
      <details className="test-controls">
        <summary>Teaching test controls</summary>
        <p>
          These controls simulate external states. They do not change a server
          or organization setting.
        </p>
        <div className="actions">
          <Button
            variant="neutral"
            onPress={() => {
              localStorage.removeItem(KEY);
              location.href = "/pipelines/customer-health/edit";
            }}
          >
            Reset fixture
          </Button>
          <Button
            variant="neutral"
            onPress={() => {
              setMode(mode === "baseline" ? "extension" : "baseline");
            }}
          >
            Toggle baseline
          </Button>
          <Button
            variant="neutral"
            onPress={() =>
              setPermission(permission === "edit" ? "view-only" : "edit")
            }
          >
            Toggle permission
          </Button>
          <Button
            variant="neutral"
            onPress={() => {
              setPermission("session expired");
              setMessage(
                "Session expired. Local work is preserved. Sign in again to continue.",
              );
            }}
          >
            Expire session
          </Button>
          <Button
            variant="neutral"
            onPress={() => {
              setPermission("edit");
              setMessage("Signed in. Local work preserved.");
            }}
          >
            Sign in again
          </Button>
          <Button
            variant="neutral"
            onPress={() => {
              setForceFailure(forceFailure ? "" : "save");
            }}
          >
            Toggle save failure
          </Button>
          <Button
            variant="neutral"
            onPress={() => setRemoteVersion(remoteVersion + 1)}
          >
            Simulate newer version
          </Button>
          <Button variant="neutral" onPress={() => setSheetError(true)}>
            Simulate preview error
          </Button>
        </div>
        {mobile() && (
          <p>Mobile is view-only. Use at least 1024 × 768 for editing.</p>
        )}
      </details>
      <DialogModal
        isOpen={open}
        isDismissable
        onOpenChange={(v) => {
          if (!v) closeImport();
        }}
      >
        <Dialog aria-label="Import customer data">
          <DialogTitle>Import customer data</DialogTitle>
          <p role="status">Stage: {importState}</p>
          <div
            className="dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setImportState("drag-over");
            }}
            onDrop={(e) => {
              e.preventDefault();
              parse(e.dataTransfer.files[0]);
            }}
          >
            <label>
              CSV or JSON file{" "}
              <input
                autoFocus
                type="file"
                accept=".csv,.json"
                onChange={(e) => parse(e.target.files[0])}
              />
            </label>
          </div>
          {importState === "parsing" && <p role="status">Parsing file…</p>}
          {pending.length > 0 && importState !== "parsing" && (
            <>
              <p>
                {pending.length} rows. Proposed mappings: customer_id →
                customer_id; health_score → health_score. Choose the required
                email mapping. Confirm mappings and import accepts all three.
              </p>
              <SelectField
                label="Required email mapping"
                selectedKey={mapping ? "contact_email" : ""}
                onSelectionChange={(v) => setMapping(v === "contact_email")}
              >
                <SelectItem id="contact_email">
                  contact_email → email
                </SelectItem>
              </SelectField>
              <Button variant="neutral" onPress={() => setPolicy("reject")}>
                Reject invalid rows
              </Button>
              <Button variant="neutral" onPress={() => setPolicy("quarantine")}>
                Send to quarantine
              </Button>
              <p>Recovery choice: {policy || "unresolved"}</p>
              {errors.map((e) => (
                <p key={e.row + e.column}>
                  Row {e.row}, {e.column}: {e.reason}
                </p>
              ))}
              <p>
                Expected: {validate(normalize(pending)).valid.length}{" "}
                publishable rows and{" "}
                {validate(normalize(pending)).invalid.length} invalid rows.
              </p>
              <Button
                isDisabled={
                  !mapping || !policy || importState === "importing" || locked
                }
                onPress={commitImport}
              >
                Confirm mappings and import
              </Button>
            </>
          )}
          <Button variant="neutral" onPress={closeImport}>
            Cancel import
          </Button>
        </Dialog>
      </DialogModal>
      <DialogModal isOpen={conflict} isDismissable onOpenChange={setConflict}>
        <Dialog aria-label="Review versions">
          <DialogTitle>Review versions</DialogTitle>
          <p>
            Local version {doc.version}; newer version {remoteVersion}. The
            simulation changed only the revision, so local edits can be
            reapplied explicitly.
          </p>
          <Button
            onPress={() => {
              setDoc({ ...doc, version: remoteVersion });
              setConflict(false);
              setStatus("dirty");
              setMessage(
                "Local changes reapplied. Save to confirm the new version.",
              );
            }}
          >
            Reapply local changes
          </Button>
          <Button variant="neutral" onPress={() => setConflict(false)}>
            Keep editing
          </Button>
        </Dialog>
      </DialogModal>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
