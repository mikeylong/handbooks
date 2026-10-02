# Consolidation rollback

Keep the local file archive, verified Git bundles, original metadata copies, SHA maps, and moved metadata until Mike explicitly authorizes a retention change. Recovery storage is ignored and never uploaded to the public site.

Before local cutover, leave the originals untouched. After local cutover, preserve any intervening edits, move the root `.git` into recovery, and restore each child's `original-metadata` to its prior `.git` path. Run `git worktree repair` for every recorded Engineering worktree and verify HEAD, branch, status, and files against the saved baseline. Do not overwrite new edits from an archive.

For hosting rollback, restore the Surfaces project's recorded `handbooks-site` Git connection and build settings from `recovery/surfaces-project.json`, then promote deployment `dpl_BXVwYf6BF1oQw2vCKL7RUd7HTZ6f`. Verify https://handbooks.surfaces.systems and all three approved PDF hashes. Do not reconnect or reactivate legacy handbook publishing. Unrelated projects and domains remain untouched.

Former repositories are archived only after verified cutover. They retain original tags and release assets, and can be unarchived under separate authority if future source recovery is required.
