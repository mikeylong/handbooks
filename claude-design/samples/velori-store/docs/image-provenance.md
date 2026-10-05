# Velori product image

The configurator uses a photorealistic Chalk robot with a Friendly face display and charging dock. The working app and current CLEAR storyboard frames share this image.

Asset: `app/assets/velori-chalk-friendly-dock.png` (1254 × 1254 PNG).

Generated on September 30, 2026 with the built-in imagegen tool. The image is a fictional product concept for Velori.

## Configuration images

The working configurator combines product photographs with separate finish and face layers. Dock and None use a matching photo for each shell. Carry bag uses one shared photograph with the robot’s finish layered above it. Friendly and Simple expressions appear on the glossy display in White, Mint, Blue, or Amber. The original single-accessory control produces 72 visible configurations. Applying the fourth suggestion adds a combined Dock + Carry bag option, producing 96 configurations.

The configuration assets are in `app/assets/velori/`. The [asset manifest](../app/assets/velori/manifest.json) lists the product photos, expression images, and the shared carry-bag composition. The [configuration prompt set](velori-configuration-prompts.json) records the built-in imagegen prompts used for the original eleven images and the carry-bag finish corrections. The original Chalk photo above remains the reference.

Finish, expression, accessory, and color selections update the product image and caption. Choices persist locally across reloads. CLEAR preview, original comparison, and saved fixes retain those choices. The color dropdown and option controls use Velori’s sample design system. The working site uses a 1024 × 768 landscape tablet frame with a 496px product visual. The earlier storyboard frames retain their 600 × 612px artifact. Continue retains its 48px height.

Consumer choices use the separate `velori.configuration.v1` storage key. Choosing an option does not apply a CLEAR fix, create a review event, or change the review version. The storyboards show the default Chalk, Friendly, White, Dock configuration with presentation-only controls.

## Consistent carry bag

The original carry-bag photos were generated separately for Chalk, Pebble, and Graphite, producing different fabric, handles, and shapes. The corrected rendering uses `chalk-bag.png` as the shared bag and studio photograph for every Carry bag choice.

Two built-in imagegen edits, `pebble-bag-shell-v2.png` and `graphite-bag-shell-v2.png`, recolor the robot from that same reference. A vector silhouette in `bag-robot-mask.svg` limits each finish layer to the robot. The face layer remains separate. The generated transparent cutout enlarged and shifted the robot, so the renderer uses a traced silhouette instead.

The original bag variants remain in the asset folder for provenance, but the working configurator no longer displays them. Carry-bag face alignment now matches Chalk. Other accessory photos retain their existing alignment.

Run `scripts/check-bag-consistency.js` through Playwright CLI in an isolated context, then `python3 scripts/check-bag-pixels.py`. The checks cover all 24 bag combinations, both color controls, comparison, reload, rapid changes, and preserved review data. The pixel check compares the same bag region across the 24 captures in `output/playwright/bag-consistency/`.

## Combined Dock + Carry bag

The fourth finding proposes independent accessory checkboxes. Its combined product shot shares the same carry-bag photograph and masked robot finish. A built-in imagegen extraction from `chalk-dock.png` supplies `dock-layer.png`, a transparent charcoal dock at the reference scale. The renderer places it behind the robot, preserving the bag and face layers. Dock-only photographs stay as they were.

The accessory-selection check exercises all 24 combined finish, face, and expression-color choices, along with the four accessory sets, reload, and original comparison.

## Generation prompt

```text
Use case: product-mockup.
Asset type: photorealistic studio product image for the fictional Velori home-companion robot in the CLEAR prototype's configurator.
Primary request: turn the existing simple robot concept into a believable manufactured consumer product. One small, friendly robot shown full body from a slightly elevated three-quarter front view, centered with comfortable margin.
Product design: warm Chalk off-white matte polymer shell; a broad rounded rectangular head with soft squircle edges, noticeably wider than its compact rounded torso; a dark charcoal glossy face display inset in the head, showing just two simple white curved happy eyes and a small white curved smile; a neat head-to-body joint; short rounded arms hanging gently at its sides; one small circular gray button or sensor on the chest; a stable low rounded pedestal base sitting on a slim charcoal charging dock. The dock must be visible beneath the robot. This is a compact home companion, with soft approachable proportions and realistic seams, finish, reflections and assembly details. No wheels, articulated industrial arm, humanoid legs, antennas, branding or extra accessories.
Scene: seamless pale neutral-gray studio background and matching floor, approximately #f1f2f1; gentle contact shadow, no horizon line, room, props, people or added graphics.
Style: premium consumer-electronics product photography, realistic satin plastic, finely controlled diffuse softbox lighting, subtle glossy display reflections, crisp product edges, natural material texture, no illustration or cartoon rendering. Entire product and dock in focus; front face clearly readable.
Composition: square image, product occupies roughly 70 percent of image height, balanced surrounding space suitable for fitting inside the existing narrow product panel.
Text: none. Do not add logos, labels, captions, watermark, UI, packaging or typography. Keep shell Chalk and Friendly face with Dock, matching the current selected configuration.
```
