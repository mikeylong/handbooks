# Run the local coding exercise and continue across tools

Run Data Pipeline Studio locally, follow one import through failure and repair, then use the same brief and fixtures to test a prototype in Claude Design. If your team needs editable Figma screens, finish by checking their component instances and variable bindings in a working Figma copy.

The companion application is supplied React code. Save and Run simulate product behavior in the browser. Running it needs Node.js and the bundled SDS source; Claude and Figma accounts are needed only when you continue into those tools.

## 1. Start the companion application

Download the [local exercise package](https://handbooks.surfaces.systems/claude-design/claude-design-v1.1.0-local-exercise.zip), extract it, and open a terminal in `claude-design-local-exercise/`. Keep `example/` and `sds/` beside each other in that folder. The application imports SDS primitives from that sibling directory. Use Node.js 22 or later.

```sh
cd example
npm ci --ignore-scripts
npm run check
npm run build
npm run dev
```

Dependency installation needs access to the npm registry or a populated local cache. Leave the development server running while you use the browser. Stop it with Ctrl+C when finished.

Open the linear baseline at:

`http://127.0.0.1:4192/pipelines/customer-health/edit?baseline=1`

Then open the extension at:

`http://127.0.0.1:4192/pipelines/customer-health/edit`

Compare the shell, route, pipeline identity, Save, and Run controls. The extension changes the editor, inspector, preview, and importer. If you have used the example before, open **Teaching test controls** and choose **Reset fixture** before starting a fresh journey.

## 2. Import and connect the six records

1. Choose **Import data** and select `example/public/fixtures/customers-august.csv`. If your terminal is already in `example/`, the file is under `public/fixtures/`.
2. Map `contact_email` to `email`. Keep the proposed `customer_id` and `health_score` mappings. Choose **Send to quarantine**, then **Confirm mappings and import**.
3. Confirm that the new source is **Customers CSV (August import)** and that its preview contains six records.
4. Use **Connect from** and **Connect to** to connect the imported source to **Normalize Email**, then choose **Connect**. Keep the existing Normalize Email → Validate Customer Schema → Publish to Warehouse path.
5. Choose **Add quarantine**. Connect **Validate Customer Schema** to **Quarantine Invalid Rows**.
6. Select **Normalize Email** and inspect its preview. C001 should contain `alice@example.com`; C006 should contain `frank@example.com`.

If import fails or a mapping is missing, correct the indicated input before confirming. Import must leave the graph unchanged until confirmation succeeds.

## 3. Run, repair, and repeat

1. Choose **Save**, then **Run**. The first run should fail at **Publish to Warehouse**, whose target starts as `missing-warehouse`.
2. Reload the page. Confirm that the failure and saved graph remain available.
3. Select **Publish to Warehouse**. Set **Configuration** to `customer_health`.
4. Choose **Save**, then **Run** again.
5. Compare the result with `example/public/fixtures/expected-results.json`.

| Result | Expected records |
|---|---|
| Published: 3 | C001, C002, C006 |
| Quarantined: 3 | C003, C004, C005 |
| Rejected: 0 | None |

Reset the fixture before repeating with the JSON input or **Reject invalid rows**. The rejection policy should produce three published, zero quarantined, and three rejected records.

## 4. Check a failure and make one small code change

1. Use **Teaching test controls** to simulate a Save failure. Make an edit and attempt Save. The draft should remain available, and Run should stay disabled until Save succeeds. Reset the fixture to restore the initial state.
2. Try connecting Validate Customer Schema back to the imported source. The application should reject the cycle without changing the graph.
3. Use Tab, Enter, and the named connection controls to repeat the critical journey without a pointer. Test at 1440 × 900 and 1024 × 768. Smaller screens provide view-only access.
4. Ask your coding agent to inspect `example/src/main.jsx`, `example/src/model.mjs`, and `example/src/model.test.mjs`, then make one bounded change. For example, clarify the warehouse repair hint while preserving the target names, fixtures, and graph behavior.
5. Review the diff, run `npm run check` and `npm run build`, and repeat the affected browser steps.

Keep the model's expected IDs and counts unchanged for a copy-only edit. Use the [handoff template](./Claude_Design_Handoff_Template.md) when you need to communicate a larger change.

## 5. Continue in Claude Code and Claude Design

Use this path when you want to test system import, generated screens, and an actual Design handoff. Carry the same fixtures and expected outcomes into the prototype.

1. **In Claude Design:** sign in through your normal browser. Open the intended organization and confirm that Design and Design systems are available. Choose the destination for this experiment. Use the [system setup guide](./Simple_Design_System_Setup.md) to prepare a focused source package.
2. **In Claude Code:** open a session in that focused React source package. Run `/design-login`, complete the account authorization, then run `/design-sync [system name]`. This operation uploads the system. Confirm the source and destination before starting, and inspect the completion result. A large first sync can take hours. The commands require the supported Anthropic connection and claude.ai access. See the [Claude Code command reference](https://code.claude.com/docs/en/commands).
3. **Back in Claude Design:** inspect the imported tokens and components. Generate a settings form, dense table, and confirmation flow before generating the pipeline extension. Compare their component and token mappings with the source. Correct one mismatch and check that the correction persists. Organization owners may restrict system publication or default selection; follow the [design-system setup guidance](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design).
4. **In Claude Design:** use the [prompt pack](./Claude_Design_Prompt_Pack.md) to extend the baseline and test import, mapping, Save, failure, repair, and re-run. If you use Claude Code's `/design` path, inspect the artboard in the browser and check the interactions available on that surface. An artboard export and an interactive developer handoff have different acceptance checks.
5. **At export:** preserve the reviewed baseline and inspect the actual files or handoff URL. Confirm that the intended recipient can open it. Use the handoff controls available on your chosen surface; consult the [Claude Design guide](https://support.claude.com/en/articles/14604416-get-started-with-claude-design).
6. **Back in Claude Code:** inspect that actual export in the target repository. Map the design elements to existing components, implement a bounded slice, run repository checks, and repeat the browser journey. Use the [validation checklist](./Claude_Design_Validation_Checklist.md) to record the results.

## 6. Continue in Figma when editable screens are required

1. Make a working copy of the SDS Community file and record its URL and the target frame link. Confirm that the account connected to your coding agent can access that copy.
2. Connect the Figma MCP server in Claude Code or Codex and complete its account authorization. Figma documents setup for both clients in its [remote-server guide](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/).
3. Ask the agent to inspect one target frame before requesting edits. For native writing, confirm a Full seat and edit permission on the existing file. See [write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/).
4. Create the proposed screen beside the baseline. Review it in Figma. Check that reused components remain instances and that colors, spacing, and typography use the intended variables. Browser capture can create editable content; inspect those identities before treating it as system reuse.
5. Add Code Connect only if the team needs published component-to-code mappings and has an eligible Dev or Full seat on an Organization or Enterprise plan. Check Code Connect eligibility separately from permission to edit a Figma file. See [Code Connect eligibility](https://developers.figma.com/docs/code-connect/).

## Check access at each handoff

| Step | What you need | What to check if it stops |
|---|---|---|
| Local application | Node.js, dependencies, sibling SDS folder, free port 4192 | Read the terminal error. Check the folder layout and port before changing code. |
| Claude Code session | A working Claude login and access to the selected source folder | Confirm the account, connection type, working directory, and available commands. |
| Design login and sync | Design-system authorization and a chosen upload destination | Inspect the authorization result and destination. A listed command does not establish upload access. |
| Design browser | Signed-in account, correct organization, enabled Design surface | Complete browser sign-in or security verification yourself. Ask the organization owner about disabled features or restricted actions. |
| Export and recipient | A reviewed prototype and access to its exported files or URL | Open the export using the intended recipient's access. Resolve missing files and sharing restrictions. |
| Figma read | Connected account and a file or node it can access | Check identity, file membership, and the exact link. Read a small selection first. |
| Native Figma write | Full seat and edit permission for the existing file | Confirm both seat and file access before editing. |
| Code Connect publication | Eligible plan and seat, mapping configuration, authorized destination | Check eligibility separately from Figma editing access. |

When a step stops, record the application, account, destination, attempted action, returned error, and next action. Use **permission denied** only when an attempted operation returns an access denial. Mark an action **not attempted** when its destination or required input has not been established. Figma's [access guide](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) explains account and file checks.

## Use Codex to coordinate the work

A person owns the account sign-ins, organization and file choices, and review of the results. Codex can prepare source packages, work on local code, run tests, and use connected Figma tools. Automation also needs a working browser or application connection for the surface being tested.

Keep the prototype URL, export path, repository revision, and Figma frame link available at each handoff. Continue directly in an application when automation cannot reach its signed-in session, then bring the resulting artifact back to the coding agent. A failed automation connection leaves the affected workflow check unfinished; it does not establish that the account lacks permission.

For the specific gaps in our earlier review, see the separate [access-gap follow-up](./review/2026-10-03-prose/access-gap-follow-up.md). The handbook's instructions remain focused on the reader's workflow.
