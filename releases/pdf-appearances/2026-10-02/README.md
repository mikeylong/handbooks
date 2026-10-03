# Approved PDF appearance evidence

The approved sidecars pin each released PDF and its generation records by SHA-256. `preflight.json` records the generation toolchain. `generation-toolkit.zip` preserves the exact toolkit used to generate the approved artifacts; later source changes do not rewrite that generation history. Each book directory retains its artwork normalization manifest, paired page maps, structural audits, and a render inventory covering every page in Poppler and Apple PDFKit at 144 dpi. Engineering also retains its Chromium raw PDF for finalization replay.

The full rendered PNG sets remain in the local review archive. Their filenames and hashes are preserved in the tracked render inventories; `localPageProofs` explicitly identifies those local archive locations. Mike approved the exact reviewed PDF hashes with the direct “Land this” command on October 2, 2026.
