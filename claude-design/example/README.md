# Data Pipeline Studio teaching example

Run a six-record import through mapping, a directed graph, preview, Save, a failed warehouse run, repair, and a successful re-run. The example uses actual SDS React primitives from the adjacent pinned source snapshot. The package was authored locally for the field guide and was not generated or exported by Claude Design.

## Run locally

For the full walkthrough, including application handoffs and access checks, use [Run the local coding exercise](../Local_Coding_Exercise.md).

1. Use Node 22 or later. From this directory, run `npm ci --ignore-scripts`, then `npm run dev`.
2. Open `http://127.0.0.1:4192/pipelines/customer-health/edit?baseline=1` for the preserved linear baseline. Open the same route without the query for the extension.
3. Choose `public/fixtures/customers-august.csv` in Import data. Choose `contact_email → email`, Send to quarantine, then Confirm mappings and import.
4. Select the imported source, press C, and choose Connect. Add quarantine, then connect Validate Customer Schema to Quarantine Invalid Rows.
5. Save and Run. The warehouse target `missing-warehouse` fails. Select Publish to Warehouse, set Configuration to `customer_health`, Save, and Run again.
6. Expect 3 published, 3 quarantined, and 0 rejected rows. The exact IDs and normalized values live in `public/fixtures/expected-results.json`. The JSON fixture has the same six logical records.
7. Run `npm run check` for model and fixture assertions and `npm run build` for the production bundle check. The browser action scripts and screenshots are in [the local test evidence](../review/2026-10-02/stage-2-evidence/).

The server binds only to 127.0.0.1:4192. Reset fixture clears only this example's named localStorage key. Save writes local browser storage. Run does not call a warehouse or publish customer rows. The controls under Teaching test controls simulate view-only access, session expiry, Save failure, a newer revision, and preview errors.

## Test inputs and rules

The fixture proposes customer_id and health_score mappings. The required email mapping starts unresolved; the commit button confirms all three mappings. Cancel and parse failure leave the graph unchanged. The exercise supports one committed import per reset, at most 1,000 records, and the fixture's fixed column schema. Duplicate or empty customer IDs are invalid. The fixed schema does not cover a general-purpose CSV importer.

Import replaces the unconfigured source placeholder with ID `august`, retains downstream nodes, removes the placeholder edge, and opens the imported source preview. Use the same records in every surface. The Reject invalid rows policy is fixed at import and yields 3 published, 0 quarantined, and 3 rejected records. A production replacement policy must be reviewed against existing data and references.

Save failure leaves the draft unsaved and keeps Run disabled. The local conflict simulation changes only the revision number; Reapply local changes explicitly updates the base revision. A real conflicting content change needs a reviewed comparison. Run failures persist after reload. Cancel run ignores a delayed completion callback.

## Keyboard and viewports

Tab and Shift+Tab reach controls. Enter activates them. Arrow keys move graph focus and selection; Shift+Arrow moves the selected node. C starts a named connection; the SDS Select controls choose its destination. Escape cancels a transient connection or importer. The preview height range has arrow-key controls. Dialog focus trapping and return focus were tested in Chromium.

Primary editing is 1440 × 900; minimum editing is 1024 × 768. Smaller viewports are view-only. Inspector and graph scroll independently at editing sizes. Preview provenance stays visible while its content scrolls. The mobile table may scroll within its own region.

## Evidence limits

The graph uses node tiles and a named adjacency list, rather than a production canvas with drawn edges and drag-to-connect ports. Pointer node movement, keyboard connections, cycle rejection, incompatible-port rejection, undo/redo, selection, and local persistence were tested. Pointer port dragging, zoom-aware world coordinates, node deletion, resizable columns, large-data virtualization, full schema-driven inspector behavior, complete telemetry, real authentication, server concurrency, idempotent publication, and screen-reader usability are not verified here.

Only the warehouse target changes the simulated execution outcome. Other configuration fields exercise draft mechanics. Preview outputs are deterministic fixture transforms and require a connected path; they are not cached server execution results. CSV source-row labels assume this fixture's single-line records without blank lines. JSON labels use corresponding logical record ordinals. A production parser must retain physical file provenance.

Claude Code inspected this manually assembled package using read-only tools. That establishes local file inspection, not Claude Design export or recipient access. Claude Design generation, system conversion/upload, three imported-system tests, correction persistence, and export are unverified. Native Figma component identity and Code Connect are also unverified.

SDS is distributed under its included MIT license. Preserve `../sds/LICENSE`, `../sds-revision.json`, the source archive and the locked dependencies when packaging this example. No existing product repository was edited.
