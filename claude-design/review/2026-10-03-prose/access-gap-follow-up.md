# Access gaps in the earlier Claude Design review

The local application could be built and tested. The actual Design-to-Code-to-Figma workflow was left unfinished. The records show browser access failures, missing destinations, and operations that were never attempted. They do not establish a general inability to coordinate this workflow from Codex.

| Guide step | Recorded result | Why the review stopped | Next action |
|---|---|---|---|
| Start and test local code | Passed | No external account was required. Save, Run, and permissions were browser simulations. | Repeat the documented fixture journey after each relevant code change. |
| Open Claude Code | Authenticated | CLI 2.1.285 was installed with a first-party Team session. `/design`, `/design-login`, and `/design-sync` were listed. | Use that session to attempt the actual workflow once its source and destination are chosen. |
| Open Claude Design in the isolated browser | Access failed | The page returned HTTP 403 and a security verification screen. The authenticated canvas was not reached. The record does not show a Design entitlement denial. | Have the person open Design in their normal signed-in browser and complete any required verification. Confirm the organization and system there. |
| Inspect the existing signed-in application | Tool failed | Computer use could not start because its configured writable workspace root was a symlink. This was a local runtime failure, not a Claude account permission error. | Use a supported workspace configuration or continue manually in the signed-in application. Confirm the automation connection before relying on it. |
| Run `/design` | Not attempted | The review pivoted to a locally authored React example after the browser failures. No generation-command error was obtained. | Attempt generation on an accessible surface and inspect the returned artifact and required interactions. |
| Run `/design-login` and `/design-sync` | Not attempted | No selected system/upload destination or inspected owner controls were established. The blocked Design surface prevented checking the resulting system. Those prerequisites remained unresolved. | Choose the source and destination, complete authorization, run sync, and inspect the uploaded system. Do not infer a permission denial from command availability alone. |
| Export from Claude Design | Not attempted | No actual Design prototype was produced. The handoff was assembled from local files instead. | Export a reviewed Design prototype, inspect its contents, and test recipient access. |
| Inspect or edit the working Figma file | Not attempted | One Figma account authenticated with a Full seat on Pro. No working file/node was selected or read. A second connection requested authentication/retry. The successful account's file permissions were never tested. | Supply a working-copy URL and inspect a small selection with the intended account before editing. |
| Publish Code Connect mappings | Not attempted | The observed Pro seat did not establish the Organization/Enterprise eligibility documented for Code Connect. No eligible destination or published mapping was verified. | Check eligibility only if published mappings are needed. Native Figma editing and the local exercise do not require Code Connect publication. |

The review chose to complete the local example and report the remaining checks as unverified. That choice produced useful local evidence, but it did not fulfill the native workflow verification. The missing destination and Figma file should have been resolved, and the available CLI path should have been attempted or explicitly left as blocked work.

## Evidence

1. [Capability observations](../2026-10-02/stage-2-capability-checks.json)
2. [Test matrix](../2026-10-02/stage-2-test-matrix.md)
3. [Stage 2 handoff](../2026-10-02/stage-2-handoff.md)
4. [Claude Code commands](https://code.claude.com/docs/en/commands)
5. [Figma native writing requirements](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/)
6. [Code Connect eligibility](https://developers.figma.com/docs/code-connect/)

The historical results above come from the recorded review. Current vendor instructions were checked on October 3, 2026. This follow-up does not claim that the external workflow has since been executed.
