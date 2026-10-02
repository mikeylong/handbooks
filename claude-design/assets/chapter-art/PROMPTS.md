# Claude Design Field Guide chapter artwork

Generation mode: built-in `image_gen`, one completed call per chapter illustration.

This file is the compact creative specification. The exact submitted prompts,
completion timestamps, tool call IDs, C2PA generator identity, reference and
output hashes, derivative recipe, and per-image approval status are recorded in
`GENERATION_RECORD.md`.

Style references: the AI Evaluation Field Guide's final `chapter-01.png`,
`chapter-06.png`, and `chapter-12.png` plates. They were passed to every call in
that order and used only for line, stipple, contrast, and white-space treatment.
Every Claude Design plate is a new composition. The generation record contains
portable SHA-256 identities for all three references.

## Shared prompt specification

- Use case: `stylized-concept`.
- Asset type: chapter-opening illustration for a printed A5 field guide about
  Claude Design workflows.
- Style: black-and-white pointillist technical engraving with fine ink outlines,
  restrained crosshatching, and nineteenth-century scientific-instrument craft.
- Composition: one coherent mechanical metaphor, centered in a wide 7:4 frame,
  slight isometric or three-quarter view, fully visible, with generous white
  space on every side and a silhouette that reads at roughly 4.25 inches wide.
- Backdrop: pure untextured white, with at most sparse stippled grounding directly
  beneath the apparatus.
- Constraints: no text, letters, numbers, pseudo-writing, labels, captions,
  borders, frames, diagram sheets, UI, logos, watermarks, decorative scenery,
  people, color, dark background, photorealism, or cropping. Gauge faces may use
  simple ticks and needles only.
- Source: model-generated RGB PNG originals in `original/`.
- PDF derivative: exact 1200 x 686 grayscale PNG at 280 ppi in `pdf/`, with the
  connected near-white canvas normalized to paper white.

## Chapter concepts and prompt subjects

1. `chapter-01.png` - A precision optical comparator accepts four distinct
   physical source plates and aligns them against one master datum rail. A
   mechanical selector engages one source at a time for separate gauges.
2. `chapter-02.png` - A compact pattern-maker's cabinet and workbench organizes
   standardized component dies, spacing gauges, token weights, and reusable
   fittings into one portable inspection kit.
3. `chapter-03.png` - A calibration bench passes three deliberately different
   standard mechanisms through one master comparator: a control panel, a dense
   repeated rack, and a guarded confirmation latch.
4. `chapter-04.png` - An established machine keeps its outer shell, control rail,
   and main drive fixed while a new branching gear-and-track module is bolted
   into one bounded central bay.
5. `chapter-05.png` - A central selection shaft synchronizes a branching graph
   plate, a vertical inspector bank, and a sliding data tray fed by an import
   hopper so all three share the same selected object and machine state.
6. `chapter-06.png` - A rotary cam-and-detent state machine connects distinct
   stable stations with visible one-way linkages, guarded transition gates, and
   a return path that closes the recovery loop.
7. `chapter-07.png` - A telescoping control bridge keeps one carriage usable
   across wide and compact positions. A handwheel and tactile key levers operate
   the same carriage while a flag and bell repeat its state through other signals.
8. `chapter-08.png` - A four-head evidence gate checks one specimen on a central
   sled. All comparator heads interlock with one release latch and exit shutter.
9. `chapter-09.png` - A fitted transfer cartridge packs five bold implementation
   objects and mates with corresponding keyed sockets in a receiving machine.
10. `chapter-10.png` - A differential comparator checks a fixed master gear and a
    working gear, raises a mismatch pointer, and returns an adjustment linkage to
    the working spindle.
11. `chapter-11.png` - One complete pipeline apparatus moves material from an
    input hopper through mapping, branching, inspection, fault, repair, re-entry,
    and a final success gauge.

## Semantic QA gate

- One apparatus and one primary action per chapter.
- The meaning survives at the 1200 x 686 derivative and the final A5 placement.
- The dominant silhouette is distinct from the other chapter plates.
- No essential meaning depends on tiny bolts, ticks, wires, or stipple.
- No text, pseudo-text, UI, signage, border, caption, watermark, or decorative
  background appears.
- The apparatus is fully visible with quiet paper-white space on all sides.
- Grayscale conversion preserves the focal linkage and removes any stray color.
- Every PDF derivative has pure-white corners and a 1200 x 686 pixel canvas.

All 11 final assets passed this gate in the rendered A5 PDF. The chapter-level
evidence is recorded in `../../Claude_Design_Diagram_and_Illustration_QA.md`;
technical provenance and hashes are recorded in `GENERATION_RECORD.md`.
