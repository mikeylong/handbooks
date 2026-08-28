# Illustration workflow

Read this file when a handbook create, redesign, or authorized art repair requires new illustration. The governing project visual system takes precedence; otherwise use the bundled specimen and design system.

## Decide whether generation is required

- **Create or redesign:** generate original raster art for every chapter-opener placement required by the governing system.
- **Text-only research or editorial update:** preserve approved illustration unless the user also authorized art changes.
- **Build or PDF repair:** preserve frozen art unless the defect is an illustration defect.
- **Project-supplied illustration system:** follow it instead of the bundled subject or style, while preserving the same provenance and PDF gates.

An opener illustration and an explanatory diagram are different assets. Use image generation for original raster illustration. Use deterministic SVG, HTML, CSS, or canvas for diagrams, tables, flows, labels, and repo-native vector systems. Do not use a diagram as an unannounced fallback for missing illustration.

## Generate with the specialist capability

1. Read the host's image-generation skill completely and use its built-in generation path by default.
2. Inspect every local style reference before generation and label its role as a style reference, not an edit target.
3. Write one brief per distinct image. State the chapter mental model, intended print placement, style and medium, composition, negative space, palette, and avoid list.
4. Issue one generation call per distinct image. For a set, use the approved specimen and the selected first image as references where supported so camera angle, engraving density, scale, contrast, and whitespace remain coherent.
5. Keep headings, captions, numbers, and safety instructions in the editable document source. Unless the governing art explicitly requires lettering, prohibit text, labels, logos, and watermarks inside generated art.
6. Inspect each result at full size and in its proposed crop. Iterate with one targeted correction at a time. Reject generic clip art, vector-like schematics, accidental species-identification claims, inconsistent style, clipped subjects, gray paper, illegible detail, or visual artifacts.

If the built-in generator is unavailable and new art is required, stop at a failed illustration gate. Do not silently use a CLI model, a deterministic drawing, stock imagery, or a lower-quality asset. Reuse is acceptable only when an already approved illustration remains in scope and unchanged.

## Normalize and freeze selected assets

Copy each selected project-bound result into the candidate workspace. Preserve the original selected bitmap and create a normalized print asset without overwriting unrelated files.

- Precompose on pure opaque white; remove alpha, masks, live filters, clip paths, and blend modes.
- Preserve sufficient pixels for at least 240 effective PPI at final size; prefer 300 PPI.
- Use a stable color space and a lossless or high-quality print-safe format.
- Give every asset a stable, descriptive filename and explicit source dimensions.
- Record the exact final placement size so effective PPI can be recomputed.

Create an illustration manifest beside the assets with, for each image: asset ID, chapter/placement, final path, original selected path, generation date, built-in or approved fallback mode, prompt, negative constraints, reference paths and hashes, selected-output hash, normalized-output hash, pixel dimensions, intended print dimensions, effective PPI, normalization command or transform, and selection rationale. Record the generator/model identifier only when the tool exposes it; never invent it.

The normalized files and manifest become deterministic inputs to the PDF build. Rebuilding from those frozen inputs must not call image generation again.

## Validate the PDF placement

Mark every required opener illustration in the candidate-specific page map. Validate the final PDF, not only the HTML:

- exactly one raster image paint at each required placement;
- no raster image masks or soft masks;
- at least 240 effective PPI at final size;
- one coherent illustration, not fragmented tiles or duplicate paints;
- opaque white background and no unintended transparency;
- perceptual match to the governing specimen or project system.

Render every opener in each required renderer and inspect it both at page scale and full size. A page-map label or a generated-file manifest cannot substitute for the PDF-side check.
