# ImageGen generation record

This is the exact generation and transformation record for the 11 chapter-opening illustrations in the *Claude Design Field Guide*.

## Generator and evidence boundary

- Generation tool: built-in `image_gen`, used under the ImageGen skill.
- Calls: one completed generation call per final chapter asset; no rerolls or rejected alternates.
- Generator identity: every original contains a C2PA manifest naming `gpt-image` version `2.0`, with the digital source type `trainedAlgorithmicMedia`.
- Call IDs and timestamps: copied from the completed `image_generation_end` events. Timestamps below are UTC.
- Seed: not exposed by the tool.
- Rights note: the three style references were existing local plates from the user’s AI Evaluation Field Guide project and were used only for line, stipple, contrast, and white-space treatment. No separate legal or third-party rights review was performed.
- Approval: rendered-artifact QA completed August 5, 2026; all 11 final selections passed semantic fit, prohibited-text, crop, white-space, and A5-legibility review.

## Style references used in every call

| Reference | Role | SHA-256 |
|---|---|---|
| AI Evaluation Field Guide `chapter-01.png` | Line, stipple, contrast, and white-space style only | `213537b85d95e0cd550adab3d94361fd54a60b9670684ad8cda3fabf9dc690b3` |
| AI Evaluation Field Guide `chapter-06.png` | Line, stipple, contrast, and white-space style only | `7e23e1fd8494f689ef1180b45bfb0a78fd343f3a47e201abca17d815cb82fd60` |
| AI Evaluation Field Guide `chapter-12.png` | Line, stipple, contrast, and white-space style only | `1f5f1750cc3552c89382545c6f88da125230a7ddd17909b6ffcf31c916da8c78` |

The three references were passed through `referenced_image_paths` in the order shown. Each submitted prompt explicitly restricted them to style and required a new mechanism and composition.

## Asset manifest

| Chapter | PDF page | UTC completion | ImageGen call ID | Original SHA-256 | PDF derivative SHA-256 | QA |
|---:|---:|---|---|---|---|---|
| 1 | 7 | 2026-08-06T00:12:15.359Z | `exec-78658f67-4c6d-46c1-8199-9620468611f7` | `150499b63865dc1fa52b27a8bccf96166da7c86f8f4fd86f9c845b4d78b8211f` | `45a4950a0ea2f97e2db2b656a374b127d359b59575677d276e982f9cc3f28268` | Pass |
| 2 | 14 | 2026-08-06T00:15:58.756Z | `exec-6f549a1b-cee4-44ef-a194-27bd669e9754` | `bdc40205f69bb1aa47e837d21a0d9e8f1da0e332ee3bcca950c2fa845eb88922` | `85061834917459495362c885405f978b39007b575b217c31c7af4b7bef0f926d` | Pass |
| 3 | 21 | 2026-08-06T00:15:20.447Z | `exec-c6c5a9a4-fcc8-47a5-bce7-15a72dab162f` | `b6950424cc89583d27326970e9761fc50c3587a5476685f985f00888cd62fe6d` | `e33beecf78f3c7efebd28e391a1b69609feae960f87a4293ad9c11bee09d749c` | Pass |
| 4 | 27 | 2026-08-06T00:16:36.296Z | `exec-b2539943-c82d-46e6-9845-ad8258fcce7d` | `c7f34cb72b0d7dd5ad7c302d1148d4485e4bbab54e22e9fdab3a6b86644acd9e` | `2436be42c35e5398f9d0c3b6517f63cbbd66053a503941669fa3beb19e4d10f6` | Pass |
| 5 | 34 | 2026-08-06T00:17:15.016Z | `exec-1913cf2c-93cd-46b4-b72d-0cf3f65f082d` | `d884e3588d7e0ab850cd97ed0c228b9e14c9dda159ee49b915a8626bc82ca431` | `718e066ccdbc3531ec428591dc4727801b99113b784d865bc2f2fee9f3a97c3b` | Pass |
| 6 | 41 | 2026-08-06T00:13:24.268Z | `exec-fbfed88a-2616-4d45-85af-5cecc7ef9728` | `a6fb3c0b8288f3aa3669b8aaa8528b507d4d3845daa5aa263f3dce673dacae80` | `2bc8eab509f777387d6c69693d0299e2b57b755feeb14b99c62d2a0f1b281d07` | Pass |
| 7 | 48 | 2026-08-06T00:18:30.845Z | `exec-fc1b6d0a-d8dc-4598-9fd3-be43eca28ac9` | `e5ff2bcd3fbde29c2a28ba1440c517920359841449ec3b9d8a08837f2234b435` | `0a186b5d3674b6c85e2310246794f4f64ee5c8772e3df4472d36b6c1140799c0` | Pass |
| 8 | 54 | 2026-08-06T00:19:13.476Z | `exec-d22b483e-d5b0-4eab-bb5b-8700df5a29e4` | `00bf478a24a6ee48133866166d4d16e9da47d81dee14898a8a8aa4e49d9e3567` | `4967cbe54ab195b7273539298eaa75787a62dc4d85a56aa41ade58cafc850364` | Pass |
| 9 | 60 | 2026-08-06T00:19:49.615Z | `exec-0a895238-cfd1-4b6a-b970-61016fc1bff9` | `2da7481415047513db47f24ab4a76e4b6bfc6f9d86d9306eadf01ff55d91d76e` | `aa5c18546d6090f5299d4f044d427f3a35102710f9d31fcecc32b00bcd65c445` | Pass |
| 10 | 68 | 2026-08-06T00:20:36.018Z | `exec-b1aa489b-b4d8-464e-bf66-fec44e41edd5` | `2ab8fe2d2ac214d3da037179f7ac99edc732f46a90b3450e2325006fcaaa6349` | `6c40f541db193d8e256da824208545f549030d0e53582c74dcac82d3063628d7` | Pass |
| 11 | 75 | 2026-08-06T00:14:05.136Z | `exec-b69a83b7-15e2-411b-95b4-5ad72a982574` | `ebbd91c42cc192784faf37f4d3a4f906898cc4f271d393ee7f86c0aecd0e5708` | `d81af04b927f6a5869aaeb054539d3b5947c93d0ab0a50980c8468d23d270411` | Pass |

## Transformation recipe

`prepare_chapter_art.py` performs the complete derivative transformation:

1. Convert the RGB original to grayscale.
2. Starting at the outer canvas edge, flood-fill only connected near-white pixels at a threshold of 247 to paper white.
3. Fit the image proportionally inside a 1200×686 canvas using Lanczos resampling.
4. Center it on a grayscale white canvas without cropping.
5. Save an optimized PNG with 280 ppi metadata.

The normalization preserves internal highlights because it changes only near-white pixels connected to the canvas edge. The structural validator checks the final dimensions, grayscale mode, DPI metadata, pure-white outer edge, and placement on the expected chapter page.

## Exact submitted prompts

### Chapter 1

- Output: `original/chapter-01.png`
- Completion event: `exec-78658f67-4c6d-46c1-8199-9620468611f7`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Primary request: Create the Chapter 1 illustration, "Decide what is authoritative."
Scene/backdrop: Pure untextured white.
Subject: A single coherent precision optical-comparator apparatus accepts four distinct source plates—component specimens, a screen blueprint, a code-pattern plate, and a feature brief represented only as unlabeled physical forms—and aligns each against a shared master datum rail. A mechanical selector visibly engages one source at a time for separate gauges, communicating governed authority without words.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 2

- Output: `original/chapter-02.png`
- Completion event: `exec-6f549a1b-cee4-44ef-a194-27bd669e9754`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 2 illustration, "Prepare Simple Design System."
Subject: A compact precision pattern-maker's cabinet and workbench. Standardized component dies, spacing gauges, type scales, token weights, and reusable fittings are organized in equal drawers and assembled into one portable inspection kit. The visual should communicate turning a broad public kit into a compact, inspectable working system.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 3

- Output: `original/chapter-03.png`
- Completion event: `exec-c6c5a9a4-fcc8-47a5-bce7-15a72dab162f`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 3 illustration, "Validate the imported system."
Subject: A calibration bench passes three deliberately different standardized mechanisms through one master comparator: a control-panel specimen, a dense rack of repeated rows, and a guarded confirmation latch. Shared gauges test alignment, spacing, and behavior before the specimens leave the bench.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 4

- Output: `original/chapter-04.png`
- Completion event: `exec-b2539943-c82d-46e6-9845-ad8258fcce7d`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 4 illustration, "Extend the existing screen."
Subject: One established machine frame with its outer shell, control rail, and main drive visibly preserved. A new branching gear-and-track module is carefully bolted into a single open central bay, extending the existing mechanism while leaving the surrounding machine intact.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 5

- Output: `original/chapter-05.png`
- Completion event: `exec-1913cf2c-93cd-46b4-b72d-0cf3f65f082d`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 5 illustration, "Design the adjacent surfaces."
Subject: A single central selection shaft synchronizes three coordinated working surfaces: a branching graph plate, a vertical inspector bank of controls, and a sliding data tray fed by a small import hopper. Linkages make it clear that all three surfaces share the same selected object and machine state.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 6

- Output: `original/chapter-06.png`
- Completion event: `exec-fbfed88a-2616-4d45-85af-5cecc7ef9728`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 6 illustration, "Specify states and transitions."
Subject: A precision rotary cam-and-detent state machine. Several distinct mechanical stations sit around one central indexed drum, connected by visible one-way linkages and guarded transition gates. A return linkage closes the loop. The apparatus should clearly suggest controlled states, allowed transitions, blocked transitions, and recovery without using words.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```

### Chapter 7

- Output: `original/chapter-07.png`
- Completion event: `exec-fc1b6d0a-d8dc-4598-9fd3-be43eca28ac9`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 7 illustration, "Prove responsive and accessible behavior."
Subject: A telescoping control bridge shown as one coherent adjustable apparatus between wide and compact positions. The same central carriage remains usable as the frame contracts. Two independent control paths—a large rotary handwheel and a bank of broad tactile key levers—connect through parallel linkages to the same carriage. A raised mechanical flag and a bell repeat the carriage state through different signals. Keep both input paths, the adjustable span, and the shared output large and visually separate.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references. Use a broad readable silhouette, medium structural detail, and fine detail only around the focal mechanism.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, pseudo-writing, labels, captions, border, frame, diagram sheets, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or crop. Keep the background and all four corners pure white. Gauge faces may have simple ticks and needles only.
```

### Chapter 8

- Output: `original/chapter-08.png`
- Completion event: `exec-d22b483e-d5b0-4eab-bb5b-8700df5a29e4`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 8 illustration, "Run the design evidence gate."
Subject: A four-head evidence inspection gate. One specimen rides on a central sled beneath four large, distinct comparator heads arranged around it. All four heads connect through visible rods to one interlocked release latch. The exit shutter opens only when all four comparator needles align; one incomplete reading keeps the latch closed. Make the four independent checks and one consequential release decision instantly clear.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references. Use a broad readable silhouette, medium structural detail, and fine detail only around the focal mechanism.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, pseudo-writing, labels, captions, border, frame, diagram sheets, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or crop. Keep the background and all four corners pure white. Gauge faces may have simple ticks and needles only.
```

### Chapter 9

- Output: `original/chapter-09.png`
- Completion event: `exec-0a895238-cfd1-4b6a-b970-61016fc1bff9`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 9 illustration, "Hand off to Claude Code and developers."
Subject: A precision keyed transfer cartridge traveling on a short rail between two benches. The left cradle packs five bold fitted objects—a miniature mechanism, matched component keys, a sample capsule, a state cam, and an acceptance gauge—into large recesses. The complete cartridge visibly mates with corresponding keyed sockets in a receiving machine on the right. Exposed alignment pins show that an incomplete or mismatched cartridge cannot connect. No papers or envelopes.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references. Use a broad readable silhouette, medium structural detail, and fine detail only around the focal mechanism.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, pseudo-writing, labels, captions, border, frame, diagram sheets, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or crop. Keep the background and all four corners pure white. Gauge faces may have simple ticks and needles only.
```

### Chapter 10

- Output: `original/chapter-10.png`
- Completion event: `exec-b1aa489b-b4d8-464e-bf66-fec44e41edd5`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 10 illustration, "Implement, verify, and reconcile."
Subject: A closed-loop differential comparator with two large gears side by side: one fixed master gear and one newly manufactured working gear. Both engage a central differential that raises a mismatch pointer when their profiles diverge. A single return linkage runs from the differential back to the adjustment screw on the working-gear spindle, while both original gears remain visible and separate. Make comparison, detected deviation, correction loop, and preserved master the complete read.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references. Use a broad readable silhouette, medium structural detail, and fine detail only around the focal mechanism.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, pseudo-writing, labels, captions, border, frame, diagram sheets, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or crop. Keep the background and all four corners pure white. Gauge faces may have simple ticks and needles only.
```

### Chapter 11

- Output: `original/chapter-11.png`
- Completion event: `exec-b69a83b7-15e2-411b-95b4-5ad72a982574`
- Status: `completed`

```text
Use case: stylized-concept
Asset type: chapter-opening illustration for a printed A5 field guide about Claude Design workflows.
Primary request: Create the Chapter 11 illustration, "Guided capstone."
Subject: One complete compact pipeline apparatus: an input hopper feeds a mapping gate, then a branching conveyor passes through an inspection tray and a visible fault bell; a repair bypass reconnects the failed branch before a final success gauge and output vessel. Make the end-to-end path and recovery loop mechanically legible without words.
Input images: Images 1-3 are style references only. Generate a completely new illustration; do not copy their objects or composition.
Scene/backdrop: Pure untextured white.
Style/medium: Black-and-white pointillist technical engraving with fine ink outlines, restrained crosshatching, and nineteenth-century scientific-instrument craft, matching the visual grammar of the references.
Composition/framing: Centered wide 7:4 composition, slight isometric three-quarter view, apparatus fully visible, clear silhouette, generous white space on every side, readable when printed about 4.25 inches wide.
Color palette: Pure white, black, and restrained grayscale only.
Constraints: One coherent mechanical metaphor. No text, letters, numbers, labels, captions, border, frame, UI, logo, watermark, decorative background, people, color, dark background, photorealism, or repeated generic icons. Keep the background and all four corners pure white.
```
