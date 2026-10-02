# Focused consolidation review

The review covered collection ownership, imported history, public package selection, file traversal and symlink handling, reader/PDF/art identity, canonical URLs, CI, private output, worktree repair, and rollback.

1. High: Copying complete reader asset directories could publish untracked files. Fixed by copying only declared approved package files and a separate declared shared-asset inventory.
2. Medium: Engineering's release validator addressed Git files without the collection prefix. Fixed by using the book's Git prefix for historical reads and changed-file checks.
3. Medium: New edition details lacked shared appearance controls. Fixed by using the existing desktop/mobile reader shell and running recursive appearance validation.
4. Low: Legacy host text survived beside updated hyperlinks. Fixed in the URL transformation without changing the frozen manuscript or PDF.

Collection validation, publication negative cases, all existing release checks, navigation/search structure, and shared appearance tests pass. The original reader bodies compare identically after normalizing the intended hostname change. No unresolved in-scope source finding remains. Hosted CI and staged/production browser checks are recorded separately.
