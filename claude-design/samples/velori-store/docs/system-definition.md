# Velori source-system definition

The source system preserves a personal-robot configurator, its product imagery, and one shared configuration. The exercise adds Review configuration after source preparation and native fidelity checks. This definition records the current files and their rules. The inventory does not establish a new native import, generation, Code handoff, or Figma prototype result. Resolve starting-screen source decisions in [source-conflicts.md](source-conflicts.md) before upload; native acceptance requires the separately listed returned evidence.

## Source authority and scope

| Decision | Governing input | Status |
|---|---|---|
| Product identity, vocabulary, images, masks, captions | [frozen reference](../reference/index.html), [consumer rules](../reference/design-system.js), [extraction manifest](../reference/extraction-manifest.json) | Observed frozen source |
| Executable component anatomy, props, selection, image handling | [library.jsx](../src/library.jsx), [model.mjs](../src/model.mjs), [main.jsx](../src/main.jsx) | Observed implementation |
| Named design values | [tokens.json](../tokens.json), [tokens.css](../src/tokens.css) | Observed; 27 tokens agree |
| Applied type, spacing, layout, states, and literal values | [velori.css](../src/velori.css) | Observed; complete declaration inventory below |
| Native anatomy, variants, variables, prototype wiring, and fonts | [identified Figma file](https://www.figma.com/design/jdGjI8zBJrvpMERKpBSCli?node-id=10-9) | Native reinspection required; recorded identities are historical starting points |
| Bounded extension | [product brief](product-brief.md), [prompts](prompts.md), [walkthrough](walkthrough.md) | Documented assignment; fresh execution unfinished |

The source snapshot records commit `62c6dca572bd310be3c9cfc9084d91b014f6409b`, snapshot date October 3, 2026, and source manifest SHA-256 `837514be77b068da286feab91314846435a1cab499a0db4e30f34130879bd270` in [source-freeze.json](../provenance/source-freeze.json). That record includes modified and untracked source inputs, so the commit alone cannot reproduce the frozen package. All 27 copied files in the extraction manifest matched their recorded hashes during this inventory. The original source checkout was not changed or consulted for new owner state.

The baseline consists of configure, the expression menu, accessory details, and the unavailable-image configurator. Import only the 13 named library exports. [index.js](../src/index.js) also exports model helpers and the completed ReviewConfiguration answer key; importing every export from that entry would widen the baseline. The configured [host entry](../.design-sync/host-entry.mjs) exports only the library. Exclude `src/ReviewConfiguration.jsx`, historical `handoff/`, frozen `reference/`, credentials, owner state, build outputs, and validation captures from native upload.

The clean baseline follows the existing consumer rules: Continue uses Ink/white, 12px corners, and 48px height; finish and accessory card groups use the declared 24px rule. The frozen reference retains the original purple Continue, 24px Continue corners, and 8px accessory gaps. Preserve that reference. The clean React implementation retains those violations only through named teaching fixtures. The scoped continuation accepts the existing 16px narrow finish/face gap exception; accessory gaps remain 24px.

## Configuration and application ownership

| Field | Valid values | Default | Review fixture | Source |
|---|---|---|---|---|
| `shell` | `chalk`, `pebble`, `graphite` | Chalk | Graphite | `model.mjs:2–5`, `FinishChoice` |
| `face` | `friendly`, `simple` | Friendly | Simple | `model.mjs:2–5`, `FaceChoice` |
| `color` | `white`, `mint`, `blue`, `amber` | White | Amber | `model.mjs:2–5`, `ExpressionSelect` |
| `accessory` | `dock`, `bag`, `none` | Dock | Carry bag | `model.mjs:2–6`, `AccessoryChoice` |

The product has 3 × 2 × 4 × 3 = 72 configurations. Color chips and independent accessory checkboxes remain proposed extensions. The parent App in `main.jsx:8–26` owns configuration, routes, browser storage, teaching URL parameters, and heading/return focus. Controlled library components receive values and callbacks. `normalize` in `model.mjs:7` restores invalid saved values to defaults; callers still need to pass valid controlled props.

Only the sample key `claude-design.velori-store.configuration.v1` is read, written, or removed (`model.mjs:1,9–11`). The reference has its own separate namespace. Browsing `#details-bag` or `#details-dock` changes the route, not `configuration.accessory` (`main.jsx:24`). Returning restores configurator focus. Review uses the same four values; the answer-key component does not own storage or navigation. Reload restores configuration from storage and the screen from the URL. Blocked storage keeps current-visit state and displays the sample notice. These statements describe source logic; browser acceptance requires actual test output.

## Named tokens

| Token | Value | Source and role | Status |
|---|---|---|---|
| `--velori-color-ink` | `#20262b` | `src/tokens.css:1`; tokens.json `color-ink`; Named color role | Observed |
| `--velori-color-text` | `#20262b` | `src/tokens.css:1`; tokens.json `color-text`; Named color role | Observed |
| `--velori-color-secondary` | `#515a60` | `src/tokens.css:1`; tokens.json `color-secondary`; Named color role | Observed |
| `--velori-color-subtle` | `#6b7378` | `src/tokens.css:1`; tokens.json `color-subtle`; Named color role | Observed |
| `--velori-color-border` | `#c7ccd0` | `src/tokens.css:1`; tokens.json `color-border`; Named color role | Observed |
| `--velori-color-white` | `#fff` | `src/tokens.css:1`; tokens.json `color-white`; Named color role | Observed |
| `--velori-color-canvas` | `#fcfcf9` | `src/tokens.css:1`; tokens.json `color-canvas`; Named color role | Observed |
| `--velori-color-soft` | `#f7f8f9` | `src/tokens.css:1`; tokens.json `color-soft`; Named color role | Observed |
| `--velori-color-selectedFill` | `#edf0f2` | `src/tokens.css:1`; tokens.json `color-selectedFill`; Named color role | Observed |
| `--velori-color-selectedBorder` | `#20262b` | `src/tokens.css:1`; tokens.json `color-selectedBorder`; Named color role | Observed |
| `--velori-color-focus` | `#20262b` | `src/tokens.css:1`; tokens.json `color-focus`; Named color role | Observed |
| `--velori-color-hover` | `#edf0f2` | `src/tokens.css:1`; tokens.json `color-hover`; Named color role | Observed |
| `--velori-expression-white` | `#f4f6f2` | `src/tokens.css:1`; tokens.json `expression-white`; Expression fill | Observed |
| `--velori-expression-mint` | `#78ebc8` | `src/tokens.css:1`; tokens.json `expression-mint`; Expression fill | Observed |
| `--velori-expression-blue` | `#80c8ff` | `src/tokens.css:1`; tokens.json `expression-blue`; Expression fill | Observed |
| `--velori-expression-amber` | `#ffcc70` | `src/tokens.css:1`; tokens.json `expression-amber`; Expression fill | Observed |
| `--velori-control-radius` | `12px` | `src/tokens.css:1`; tokens.json `control-radius`; Control, menu, or icon metric | Observed |
| `--velori-primary-height` | `48px` | `src/tokens.css:1`; tokens.json `primary-height`; Control, menu, or icon metric | Observed |
| `--velori-option-gap` | `24px` | `src/tokens.css:1`; tokens.json `option-gap`; Control, menu, or icon metric | Observed |
| `--velori-select-height` | `40px` | `src/tokens.css:1`; tokens.json `select-height`; Control, menu, or icon metric | Observed |
| `--velori-menu-radius` | `16px` | `src/tokens.css:1`; tokens.json `menu-radius`; Control, menu, or icon metric | Observed |
| `--velori-menu-padding` | `8px` | `src/tokens.css:1`; tokens.json `menu-padding`; Control, menu, or icon metric | Observed |
| `--velori-menu-gap` | `8px` | `src/tokens.css:1`; tokens.json `menu-gap`; Control, menu, or icon metric | Observed |
| `--velori-menu-option-height` | `40px` | `src/tokens.css:1`; tokens.json `menu-option-height`; Control, menu, or icon metric | Observed |
| `--velori-font-body` | `Arial,Helvetica,sans-serif` | `src/tokens.css:1`; tokens.json `font-body`; Font family | Observed |
| `--velori-font-display` | `Georgia,'Times New Roman',serif` | `src/tokens.css:1`; tokens.json `font-display`; Font family | Observed |
| `--velori-icon-stroke` | `1.5` | `src/tokens.css:1`; tokens.json `icon-stroke`; Control, menu, or icon metric | Observed |

## Typography and layout roles

Every value below is a CSS declaration. Font-size, weight, and line-height are specified values, not measured glyph bounds or proven Arial/Georgia to Arimo/Lora parity.

| Role | Values | Source selector and use | Status |
|---|---|---|---|
| Body/UI family | Arial, Helvetica, sans-serif; body has no explicit size or line-height | `body`, `--velori-font-body`; browser inheritance supplies unspecified metrics | Observed; inherited metrics unresolved for native correspondence |
| Display family | Georgia, Times New Roman, serif | `--velori-font-display`; product and accessory titles | Observed |
| Brand | 22px, weight 600, tracking 4px | `.brand b` | Observed |
| Brand descriptor | 12px, secondary ink; left padding 20px | `.brand>span` | Observed |
| Steps | 12px; active weight 600; numbered mark 11px in 24px circle | `.steps`, `.steps li[aria-current]`, `.steps li>span` | Observed |
| Product eyebrow | 10px/16px, weight 500, tracking 1.5px | `.product-eyebrow` | Observed |
| Product title | 27px/36px, weight 400, tracking -0.6px | `.product-title` | Observed |
| Product caption | 12px/20px, secondary ink, max-width 450px | `.caption` | Observed |
| Page eyebrow | 10px/16px, tracking 1.2px | `.eyebrow` | Observed |
| Page heading | 32px/40px, weight 500, tracking -1.1px | `.options h1` | Observed |
| Subheading | 14px/20px; margin 4px 0 24px | `.sub` | Observed |
| Choice label | 13px/20px, weight 600; current-value label weight 400 | `.row-label`, `.row-label>span+span` | Observed |
| Card label | 12px/16px | `.choices button` | Observed |
| Face label | 13px/20px | `.face button` | Observed |
| Description | 12px/20px, min-height 20px | `.description` | Observed |
| Primary action | 14px/20px, weight 600, tracking 0.1px | `.primary` | Observed |
| Dropdown trigger | 14px/20px, weight 500 | `.select-trigger` | Observed |
| Dropdown options | 14px/20px, weight 400; selected weight 600 | `.select-menu`, `[aria-selected=true]` | Observed |
| Detail link | 14px, weight 600, width 244px, min-height 44px | `.details-link`; final override at CSS line 12 | Observed |
| Accessory heading | 44px/52px, weight 400, tracking -1px | `.detail-copy h1` | Observed |
| Accessory introduction | 18px/28px; bottom margin 32px | `.detail-intro`; final override at CSS line 8 | Observed |
| Detail controls | 14px/20px, weight 500; padding 10px 16px | `.detail-tabs button`, `.store-header>.back-link` | Observed |
| Detail facts | 14px; descriptions 14px/24px | `.detail-facts`, `.detail-facts dd`; CSS line 8 | Observed |
| Summary | 14px/20px; selected values weight 600 | `.summary div`, `.summary dd` | Observed; reusable baseline export |
| Sample tools | 12px, secondary ink | `.sample-tools`; outside shopper column | Observed teaching surface |

| Layout/control | Values and constraints | Source | Status |
|---|---|---|---|
| Store frame | `min(100%,1024px)`, min-height 768px, centered, 1px border | `.store` | Observed reference composition |
| Header | 80px height, horizontal padding 40px; flex space-between | `.store-header` | Observed |
| Configure/review grid | 544px product column plus `minmax(0,1fr)`; min-height 686px | `.configuration-layout` | Observed |
| Product panel | Padding 40px 24px 36px; centered column; right border | `.product-panel` | Observed |
| Product image frame | Width 496px, square aspect ratio, bottom margin 24px; final desktop max-width none | `.product-view`; CSS lines 1, 6, 10 | Observed; preserve cascade |
| Options column | Padding 32px 40px 24px | `.options` | Observed |
| Finish/accessory tiles | Height 72px, 1px border; selected 2px border/Mist fill; 12px corners | `.choices button`, `[aria-pressed=true]` | Observed |
| Face tiles | Height 44px, row composition, 12px gap; right padding 32px for marker | `.face`, `.face button`; CSS lines 1, 6 | Observed |
| Selection mark | 16px Ink circle, white 12px check; top/right 8px on ordinary tiles | `.selection-mark`; CSS lines 1, 6 | Observed |
| Face selection mark | Vertical center, right 12px | `.face .selection-mark`; CSS line 6 | Observed composition exception |
| Primary button | Full width, 48px height, 12px corners, Ink/white | `.primary`, named tokens | Observed normalized rule |
| Expression trigger | 40px height, 12px corners; padding 8px 48px 8px 16px; gap 12px | `.select-trigger` | Observed |
| Expression menu | 8px below trigger; 16px corners; 8px padding/gap; option height 40px | `.select-menu`, `[role=option]` | Observed |
| Accessory detail grid | 576px photo column plus `minmax(0,1fr)`; min-height 686px | `.detail-layout` | Observed |
| Detail photos | 576px square, top 48px; bag scale 1.8 origin 94% 70%; dock scale 1.6 origin 50% 95% | `.accessory-photo img`, `.bag img`, `.dock img` | Observed; preserve crop |
| Narrow layout | At max-width 800px: one column; header padding 20px; product padding 48px 24px 32px; options 32px 24px; detail copy 40px 24px; detail photo height 480px | CSS media rules at lines 2, 9, 10 | Observed responsive behavior |
| Narrow choice gaps | General choices 16px; accessories 24px; face override also resolves to 16px | `.choices`, `.accessory` in max-width 800px | Accepted existing responsive exception; accessories remain 24px |
| Focus | 3px Ink outline with 3px offset | `button:focus-visible,a:focus-visible` | Observed; compare reference dropdown's separate 2px declaration |
| Named fixtures | Purple `#7357d8`/24px corners; hover `#6245cb`; accessory gaps 8px | `.fixture-purple`, `.fixture-tight .accessory` | Observed teaching defects; never accepted system variants |

## Component anatomy and usage

The [library](../src/library.jsx) owns all 13 baseline exports. The [import config](../.design-sync/config.json) maps each export to that file and adds synthetic props declarations. The source implementation governs any difference between those declarations and the actual props. Native cards and compiled props still require new-run verification.

| Export and source lines | Valid inputs | Anatomy/states | Composition and ownership |
|---|---|---|---|
| `VeloriIcon`, line 6 | `name`: check, chevron, friendly, simple; SVG attributes | 24×24 viewBox; rounded 1.5 stroke; simple face uses filled circles; aria-hidden/focusable false | Decorative icon; inherit currentColor. Unknown names currently fall through to simple, so restrict names rather than rely on fallback. |
| `SelectionMark`, line 7 | No props | Ink circle containing white check; rendered only for selected choices | Place inside a positioned tile. Face composition centers the marker vertically. Do not render an unpositioned floating mark. |
| `PrimaryButton`, line 8 | Ordinary button props; `children`, callback, ID; optional teaching `fixture` | Button type button, full-width primary styles; default/hover/active/focus | Parent owns the action. `fixture="purple-continue"` is teaching-only and absent from baseline synthetic props. |
| `ChoiceGroup`, lines 9–11 | group shell/face/accessory; matching valid value; onChange callback | Named role group; native buttons, labels, aria-pressed, selected marks; finish swatch or face icon where applicable | One controlled value. Invalid group is unsupported and can fail; values need normalization in the owner. |
| `FinishChoice`, line 12 | chalk/pebble/graphite; onChange | ChoiceGroup shell; three finish cards | Changes only shell through callback. Colors come from model COLORS. |
| `FaceChoice`, line 13 | friendly/simple; onChange | ChoiceGroup face; two icon-and-label buttons | Changes only face; preserve selected marker and 44px control composition. |
| `AccessoryChoice`, line 14 | dock/bag/none; onChange | ChoiceGroup accessory; three labeled cards | Exactly one accessory; browsing details must not call onChange. |
| `ExpressionSelect`, lines 15–28 | white/mint/blue/amber; onChange | Label, combobox button, color dot, selected text, caret, listbox options/check; closed/open/active/selected/focus | Owns transient open/active/type-ahead state. Parent owns committed color. No provider wrapper. |
| `ProductPreview`, lines 29–42 | Valid configuration; optional unavailable Boolean; optional onDetails | Photo, optional shell layer/robot mask, expression face mask; loading/ready/error/retry; optional details button | Owns loading state, active request guard, and retry attempt. Preserve values while images load or fail. Do not write configuration from image callbacks. |
| `Brand`, line 43 | No props | VELORI wordmark and Personal robotics descriptor | Preserve identity text; descriptor hides at narrow width. |
| `StoreHeader`, line 44 | review Boolean; optional onBack | Brand plus numbered Configure/Review steps, or Back to configurator button | Parent supplies navigation. Step 2 describes the completed answer key; baseline import can reuse header without importing ReviewConfiguration. |
| `ConfigurationSummary`, line 45 | Valid configuration | Definition list with four rows and labels/data-summary values | Read the same configuration; no independent defaults or local saved state. Reusable before new review composition. |
| `AccessoryPhoto`, line 46 | bag/dock | Original Chalk accessory photo in crop wrapper | Describes browsed accessory, not selected accessory. No own load-recovery UI; see unresolved source coverage. |

## Keyboard, states, and asset composition

1. `ExpressionSelect` keeps focus on its trigger. Enter/Space opens or commits; ArrowUp/Down, Home/End, and type-ahead change the active option. Escape, Tab, Alt+ArrowUp, outside pointer, and external blur close without committing. Click/Enter/Space commits through onChange and returns trigger focus. The active option is conveyed through aria-activedescendant; selection uses aria-selected. A new native prototype needs its own interaction evidence.
2. Finish, face, and accessory controls are native buttons with aria-pressed and visible marks. Focus styles, forced-color adjustments, and reduced-motion declarations are in the CSS inventory. Source declarations do not establish a screen-reader audit.
3. `ProductPreview` loads each required asset and waits for decode. Its effect cancellation flag rejects stale completions after rapid changes. A true failed load shows Retry image; simulated `unavailable` deliberately suppresses Retry. Loading/failure do not change the four values. The current App's teaching `?image=unavailable` parameter applies to product preview on configure or review.
4. `productAssets` in `model.mjs:12` uses the original finish/accessory photo for dock or none. Carry bag uses Chalk bag as the base, with the Pebble/Graphite shell layer and robot mask where needed. The selected face mask and COLORS expression fill overlay the photograph. Friendly transform is `translate(17.854%,2.926%) matrix(.706,-.02,0,.75,0,0)`; Simple is `translate(18.34%,-7.74%) matrix(.694,-.032,0,.83,0,0)`. Preserve those applied alignments until measured native comparison supports a change.
5. The [asset manifest](../public/assets/velori/manifest.json) names nine finish/accessory products, two face masks, bag base/robot mask, and dock layer. The implementation computes equivalent asset paths rather than parsing the manifest at runtime. The empty alignment object does not document the CSS transforms. Preserve all asset hashes and [image provenance](image-provenance.md).
6. The [host adapter](../.design-sync/host-entry.mjs) sets asset base from the compiled classic script's URL. `src/library.jsx:5` computes URLs from import.meta.env.BASE_URL and document.baseURI. No currentScript means the adapter keeps the root fallback. Inspect actual hosted bundle loading and both generated-screen asset routes before claiming portability.

## Native correspondence and unresolved additions

The currently documented component and variable IDs in [inventory.md](inventory.md) are historical. They identify candidate reuse seams, not a completed replacement run. The original reference starts at `10:9`; preserve that frame and its foundation/source components. The historical exercise page `34:694` and its frames remain starting points requiring actual file inspection.

The React source specifies Arial/Georgia. The recorded native system uses Arimo/Lora. That family mapping is a documented comparison convention; current native font weights, glyph dimensions, line breaks, and control measurements require returned evidence. Never describe substitution as pixel parity.

Useful values without a complete named-token role include shell swatches, primary hover/active colors, opacity colors in borders/shadows, type sizes and line heights, tracking, control paddings, layout columns, responsive breakpoints, face/image transforms, and non-primary radii. The declaration appendix preserves their exact source vocabulary. Naming those values is a proposed source change. Keep their current values until the required source decisions are settled, and validate the existing conventions against the fresh converted build before proposing edits.

The accepted baseline projection in [native-baseline.md](native-baseline.md) derives tokens, exports, valid props, starting-screen layout/menu/details rules and state ownership from this full definition. guidelinesGlob selects only that projection and the bounded product brief, excluding this full inventory, historical native identities, reference files and completed screen source. The declared original-code adapter also adds guidelines/velori-runtime-assets.md with sorted16file hashes before native hashing and capture; it does not change component discovery or installed hash recipes. Actual converted/uploaded inventory must prove accepted guidance, asset scope and exact component scope. The current public MIT payload includes this source definition and the accepted baseline projection, and its provenance manifest records their exact packaged bytes. Preserve earlier archives when accepted source changes require a new public package; the new package's hash and fresh-extraction validation results establish that payload only.

## Complete applied CSS inventory

Each row records an actual rule in source order, including duplicate selectors, final overrides, media scope, literals, and token references. Treat source-order/media changes as behavior changes. `Observed` describes a declaration's presence, not native acceptance or a rendered test. The layout/type summaries above identify intent; this appendix prevents the token inventory from hiding applied values.

| Rule | Media scope | Source selector | Exact declarations | Status |
|---|---|---|---|---|
| 1 | `All viewports` | `src/velori.css:1` `*` | `box-sizing:border-box` | Observed |
| 2 | `All viewports` | `src/velori.css:1` `body` | `margin:0`<br>`background:var(--velori-color-canvas)`<br>`color:var(--velori-color-text)`<br>`font-family:var(--velori-font-body)` | Observed |
| 3 | `All viewports` | `src/velori.css:1` `button,a` | `color:inherit` | Observed |
| 4 | `All viewports` | `src/velori.css:1` `button` | `font:inherit`<br>`cursor:pointer` | Observed |
| 5 | `All viewports` | `src/velori.css:1` `button:focus-visible,a:focus-visible` | `outline:3px solid var(--velori-color-focus)`<br>`outline-offset:3px` | Observed |
| 6 | `All viewports` | `src/velori.css:1` `p,h1,h2` | `margin:0` | Observed |
| 7 | `All viewports` | `src/velori.css:1` `.store` | `width:min(100%,1024px)`<br>`min-height:768px`<br>`margin:0 auto`<br>`border:1px solid var(--velori-color-border)`<br>`background:var(--velori-color-canvas)` | Observed |
| 8 | `All viewports` | `src/velori.css:1` `.store-header` | `height:80px`<br>`padding:0 40px`<br>`display:flex`<br>`align-items:center`<br>`justify-content:space-between`<br>`border-bottom:1px solid var(--velori-color-border)` | Observed |
| 9 | `All viewports` | `src/velori.css:1` `.brand` | `display:flex`<br>`align-items:center`<br>`gap:20px` | Observed |
| 10 | `All viewports` | `src/velori.css:1` `.brand b` | `font-size:22px`<br>`font-weight:600`<br>`letter-spacing:4px` | Observed |
| 11 | `All viewports` | `src/velori.css:1` `.brand>span` | `padding-left:20px`<br>`border-left:1px solid var(--velori-color-border)`<br>`font-size:12px`<br>`color:var(--velori-color-secondary)` | Observed |
| 12 | `All viewports` | `src/velori.css:1` `.steps` | `display:flex`<br>`align-items:center`<br>`gap:28px`<br>`list-style:none`<br>`padding:0`<br>`margin:0`<br>`font-size:12px`<br>`color:var(--velori-color-subtle)` | Observed |
| 13 | `All viewports` | `src/velori.css:1` `.steps li` | `display:flex`<br>`align-items:center`<br>`gap:8px` | Observed |
| 14 | `All viewports` | `src/velori.css:1` `.steps li>span` | `display:inline-flex`<br>`align-items:center`<br>`justify-content:center`<br>`width:24px`<br>`height:24px`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:50%`<br>`font-size:11px` | Observed |
| 15 | `All viewports` | `src/velori.css:1` `.steps li[aria-current]` | `font-weight:600`<br>`color:var(--velori-color-ink)` | Observed |
| 16 | `All viewports` | `src/velori.css:1` `.steps li[aria-current]>span` | `color:#fff`<br>`background:var(--velori-color-ink)`<br>`border-color:var(--velori-color-ink)` | Observed |
| 17 | `All viewports` | `src/velori.css:1` `.configuration-layout` | `display:grid`<br>`grid-template-columns:544px minmax(0,1fr)`<br>`min-height:686px` | Observed |
| 18 | `All viewports` | `src/velori.css:1` `.product-panel` | `position:relative`<br>`display:flex`<br>`flex-direction:column`<br>`align-items:center`<br>`justify-content:center`<br>`padding:40px 24px 36px`<br>`background:var(--velori-color-soft)`<br>`border-right:1px solid var(--velori-color-border)` | Observed |
| 19 | `All viewports` | `src/velori.css:1` `.product-eyebrow` | `position:absolute`<br>`left:32px`<br>`top:28px`<br>`font:500 10px/16px var(--velori-font-body)`<br>`letter-spacing:1.5px`<br>`color:var(--velori-color-secondary)` | Observed |
| 20 | `All viewports` | `src/velori.css:1` `.product-view` | `position:relative`<br>`width:100%`<br>`max-width:496px`<br>`aspect-ratio:1`<br>`flex:none`<br>`margin-bottom:24px` | Observed |
| 21 | `All viewports` | `src/velori.css:1` `.product-render` | `position:relative`<br>`width:100%`<br>`height:100%` | Observed |
| 22 | `All viewports` | `src/velori.css:1` `.product-photo,.product-shell` | `position:absolute`<br>`inset:0`<br>`width:100%`<br>`height:100%`<br>`object-fit:contain` | Observed |
| 23 | `All viewports` | `src/velori.css:1` `.product-photo` | `mix-blend-mode:multiply` | Observed |
| 24 | `All viewports` | `src/velori.css:1` `.product-shell` | `mask:var(--robot-mask) center/contain no-repeat`<br>`-webkit-mask:var(--robot-mask) center/contain no-repeat`<br>`pointer-events:none` | Observed |
| 25 | `All viewports` | `src/velori.css:1` `.face-light` | `position:absolute`<br>`inset:0`<br>`pointer-events:none`<br>`clip-path:polygon(33% 14%,72% 14%,74% 41%,33% 42%)` | Observed |
| 26 | `All viewports` | `src/velori.css:1` `.expression-layer` | `position:absolute`<br>`inset:0`<br>`transform-origin:0 0`<br>`mask:var(--face-mask) center/contain no-repeat`<br>`-webkit-mask:var(--face-mask) center/contain no-repeat` | Observed |
| 27 | `All viewports` | `src/velori.css:1` `.face-light[data-face=friendly] .expression-layer` | `transform:translate(17.854%,2.926%) matrix(.706,-.02,0,.75,0,0)` | Observed |
| 28 | `All viewports` | `src/velori.css:1` `.face-light[data-face=simple] .expression-layer` | `transform:translate(18.34%,-7.74%) matrix(.694,-.032,0,.83,0,0)` | Observed |
| 29 | `All viewports` | `src/velori.css:1` `.product-title` | `font:400 27px/36px var(--velori-font-display)`<br>`letter-spacing:-.6px`<br>`text-align:center` | Observed |
| 30 | `All viewports` | `src/velori.css:1` `.caption` | `max-width:450px`<br>`font-size:12px`<br>`line-height:20px`<br>`color:var(--velori-color-secondary)`<br>`margin-top:8px`<br>`text-align:center` | Observed |
| 31 | `All viewports` | `src/velori.css:1` `.details-link` | `position:absolute`<br>`right:16px`<br>`top:16px`<br>`min-height:44px`<br>`padding:8px 12px`<br>`background:var(--velori-color-canvas)`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:var(--velori-control-radius)`<br>`font-size:12px` | Observed |
| 32 | `All viewports` | `src/velori.css:1` `.image-placeholder` | `width:100%`<br>`height:100%`<br>`display:flex`<br>`flex-direction:column`<br>`align-items:center`<br>`justify-content:center`<br>`gap:12px`<br>`padding:40px`<br>`font-size:14px`<br>`line-height:20px`<br>`text-align:center` | Observed |
| 33 | `All viewports` | `src/velori.css:1` `.image-placeholder button` | `padding:8px 16px`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:12px`<br>`background:var(--velori-color-canvas)` | Observed |
| 34 | `All viewports` | `src/velori.css:1` `.options` | `padding:32px 40px 24px` | Observed |
| 35 | `All viewports` | `src/velori.css:1` `.eyebrow` | `font-size:10px`<br>`line-height:16px`<br>`letter-spacing:1.2px`<br>`color:var(--velori-color-secondary)`<br>`margin-bottom:8px` | Observed |
| 36 | `All viewports` | `src/velori.css:1` `.options h1` | `font-size:32px`<br>`line-height:40px`<br>`font-weight:500`<br>`letter-spacing:-1.1px` | Observed |
| 37 | `All viewports` | `src/velori.css:1` `.sub` | `font-size:14px`<br>`line-height:20px`<br>`color:var(--velori-color-secondary)`<br>`margin:4px 0 24px` | Observed |
| 38 | `All viewports` | `src/velori.css:1` `.row-label` | `display:flex`<br>`justify-content:space-between`<br>`font-size:13px`<br>`line-height:20px`<br>`font-weight:600`<br>`margin:20px 0 8px` | Observed |
| 39 | `All viewports` | `src/velori.css:1` `.row-label>span+span` | `font-weight:400`<br>`color:var(--velori-color-secondary)` | Observed |
| 40 | `All viewports` | `src/velori.css:1` `.options>.row-label:first-of-type` | `margin-top:0` | Observed |
| 41 | `All viewports` | `src/velori.css:1` `.choices` | `display:flex`<br>`gap:var(--velori-option-gap)` | Observed |
| 42 | `All viewports` | `src/velori.css:1` `.choices button` | `flex:1`<br>`min-width:0`<br>`height:72px`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:var(--velori-control-radius)`<br>`background:var(--velori-color-canvas)`<br>`color:var(--velori-color-ink)`<br>`font-size:12px`<br>`line-height:16px`<br>`display:flex`<br>`flex-direction:column`<br>`align-items:center`<br>`justify-content:center`<br>`gap:8px`<br>`padding:0 4px` | Observed |
| 43 | `All viewports` | `src/velori.css:1` `.choices button[aria-pressed=true]` | `border:2px solid var(--velori-color-selectedBorder)`<br>`background:var(--velori-color-selectedFill)` | Observed |
| 44 | `All viewports` | `src/velori.css:1` `button:not(.primary):hover` | `background:var(--velori-color-hover)`<br>`border-color:var(--velori-color-secondary)` | Observed |
| 45 | `All viewports` | `src/velori.css:1` `.choices button.chosen:hover` | `border-color:var(--velori-color-selectedBorder)` | Observed |
| 46 | `All viewports` | `src/velori.css:1` `.choice-name` | `display:flex`<br>`align-items:center`<br>`gap:8px`<br>`white-space:nowrap` | Observed |
| 47 | `All viewports` | `src/velori.css:1` `.swatch` | `width:24px`<br>`height:24px`<br>`border:1px solid #20262b25`<br>`border-radius:50%`<br>`box-shadow:inset 0 0 0 2px #ffffff70` | Observed |
| 48 | `All viewports` | `src/velori.css:1` `.selection-mark` | `display:inline-flex`<br>`align-items:center`<br>`justify-content:center`<br>`width:16px`<br>`height:16px`<br>`border-radius:50%`<br>`background:var(--velori-color-ink)`<br>`color:#fff`<br>`flex:none` | Observed |
| 49 | `All viewports` | `src/velori.css:1` `.selection-mark svg` | `width:12px`<br>`height:12px` | Observed |
| 50 | `All viewports` | `src/velori.css:1` `.velori-icon` | `width:24px`<br>`height:24px`<br>`fill:none`<br>`stroke:currentColor`<br>`stroke-width:var(--velori-icon-stroke)`<br>`stroke-linecap:round`<br>`stroke-linejoin:round` | Observed |
| 51 | `All viewports` | `src/velori.css:1` `.velori-icon circle` | `fill:currentColor`<br>`stroke:none` | Observed |
| 52 | `All viewports` | `src/velori.css:1` `.face` | `gap:12px` | Observed |
| 53 | `All viewports` | `src/velori.css:1` `.face button` | `height:44px`<br>`flex-direction:row`<br>`padding:8px 12px`<br>`font-size:13px`<br>`line-height:20px` | Observed |
| 54 | `All viewports` | `src/velori.css:1` `.description` | `font-size:12px`<br>`line-height:20px`<br>`min-height:20px`<br>`color:var(--velori-color-secondary)`<br>`margin:8px 0 20px` | Observed |
| 55 | `All viewports` | `src/velori.css:1` `.primary` | `display:flex`<br>`align-items:center`<br>`justify-content:center`<br>`width:100%`<br>`height:var(--velori-primary-height)`<br>`border:0`<br>`border-radius:var(--velori-control-radius)`<br>`font:600 14px/20px var(--velori-font-body)`<br>`letter-spacing:.1px`<br>`background:var(--velori-color-ink)`<br>`color:var(--velori-color-white)` | Observed |
| 56 | `All viewports` | `src/velori.css:1` `.primary:hover` | `background:#38434c` | Observed |
| 57 | `All viewports` | `src/velori.css:1` `.primary:active` | `background:#10181e` | Observed |
| 58 | `All viewports` | `src/velori.css:1` `.fixture-purple` | `background:#7357d8`<br>`border-radius:24px` | Observed |
| 59 | `All viewports` | `src/velori.css:1` `.fixture-purple:hover` | `background:#6245cb` | Observed |
| 60 | `All viewports` | `src/velori.css:1` `.fixture-tight .accessory` | `gap:8px` | Observed |
| 61 | `All viewports` | `src/velori.css:1` `.expression-select` | `position:relative`<br>`margin:20px 0 0` | Observed |
| 62 | `All viewports` | `src/velori.css:1` `.expression-select>label` | `display:block`<br>`font-size:13px`<br>`line-height:20px`<br>`font-weight:600`<br>`margin-bottom:8px` | Observed |
| 63 | `All viewports` | `src/velori.css:1` `.select-trigger` | `position:relative`<br>`display:flex`<br>`align-items:center`<br>`gap:12px`<br>`width:100%`<br>`height:var(--velori-select-height)`<br>`padding:8px 48px 8px 16px`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:var(--velori-control-radius)`<br>`background:var(--velori-color-soft)`<br>`color:var(--velori-color-ink)`<br>`font:500 14px/20px var(--velori-font-body)`<br>`text-align:left`<br>`box-shadow:0 1px 2px #20262b08` | Observed |
| 64 | `All viewports` | `src/velori.css:1` `.select-trigger[aria-expanded=true]` | `border-color:var(--velori-color-ink)`<br>`box-shadow:0 0 0 3px #20262b16` | Observed |
| 65 | `All viewports` | `src/velori.css:1` `.color-dot` | `display:block`<br>`flex:none`<br>`width:16px`<br>`height:16px`<br>`border:1px solid #20262b24`<br>`border-radius:50%`<br>`box-shadow:inset 0 0 0 2px #ffffff70` | Observed |
| 66 | `All viewports` | `src/velori.css:1` `.select-arrow` | `position:absolute`<br>`right:16px`<br>`top:50%`<br>`transform:translateY(-50%)`<br>`width:12px`<br>`height:12px`<br>`color:var(--velori-color-secondary)` | Observed |
| 67 | `All viewports` | `src/velori.css:1` `.select-trigger[aria-expanded=true] .select-arrow` | `transform:translateY(-50%) rotate(180deg)` | Observed |
| 68 | `All viewports` | `src/velori.css:1` `.select-menu` | `position:absolute`<br>`top:calc(100% + 8px)`<br>`left:0`<br>`right:0`<br>`z-index:10`<br>`display:flex`<br>`flex-direction:column`<br>`gap:var(--velori-menu-gap)`<br>`padding:var(--velori-menu-padding)`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:var(--velori-menu-radius)`<br>`background:var(--velori-color-white)`<br>`font:400 14px/20px var(--velori-font-body)`<br>`box-shadow:0 16px 40px #20262b24,0 2px 8px #20262b0a` | Observed |
| 69 | `All viewports` | `src/velori.css:1` `.select-menu [role=option]` | `display:flex`<br>`align-items:center`<br>`gap:12px`<br>`height:var(--velori-menu-option-height)`<br>`padding:8px 12px`<br>`border-radius:8px`<br>`cursor:pointer` | Observed |
| 70 | `All viewports` | `src/velori.css:1` `.select-menu [role=option]>span:nth-child(2)` | `flex:1` | Observed |
| 71 | `All viewports` | `src/velori.css:1` `.select-menu svg` | `width:14px`<br>`height:14px` | Observed |
| 72 | `All viewports` | `src/velori.css:1` `.select-menu [aria-selected=true]` | `background:var(--velori-color-selectedFill)`<br>`font-weight:600` | Observed |
| 73 | `All viewports` | `src/velori.css:1` `.select-menu [data-active=true]` | `background:var(--velori-color-hover)`<br>`box-shadow:inset 0 0 0 1px var(--velori-color-border)` | Observed |
| 74 | `All viewports` | `src/velori.css:1` `.summary` | `margin:32px 0 24px` | Observed |
| 75 | `All viewports` | `src/velori.css:1` `.summary div` | `display:flex`<br>`justify-content:space-between`<br>`gap:16px`<br>`padding:16px 0`<br>`border-bottom:1px solid var(--velori-color-border)`<br>`font-size:14px`<br>`line-height:20px` | Observed |
| 76 | `All viewports` | `src/velori.css:1` `.summary dt` | `color:var(--velori-color-secondary)` | Observed |
| 77 | `All viewports` | `src/velori.css:1` `.summary dd` | `margin:0`<br>`font-weight:600` | Observed |
| 78 | `All viewports` | `src/velori.css:1` `.back-link` | `padding:8px 0`<br>`min-height:44px`<br>`border:0`<br>`background:transparent`<br>`font-size:12px`<br>`color:var(--velori-color-secondary)` | Observed |
| 79 | `All viewports` | `src/velori.css:1` `.review-back` | `display:block`<br>`margin-top:12px` | Observed |
| 80 | `All viewports` | `src/velori.css:1` `.detail-layout` | `display:grid`<br>`grid-template-columns:576px minmax(0,1fr)`<br>`min-height:686px` | Observed |
| 81 | `All viewports` | `src/velori.css:1` `.accessory-photo` | `position:relative`<br>`min-height:686px`<br>`overflow:hidden`<br>`background:var(--velori-color-soft)`<br>`border-right:1px solid var(--velori-color-border)` | Observed |
| 82 | `All viewports` | `src/velori.css:1` `.accessory-photo img` | `position:absolute`<br>`top:48px`<br>`width:576px`<br>`height:576px`<br>`object-fit:contain`<br>`mix-blend-mode:multiply` | Observed |
| 83 | `All viewports` | `src/velori.css:1` `.accessory-photo.bag img` | `transform:scale(1.8)`<br>`transform-origin:94% 70%` | Observed |
| 84 | `All viewports` | `src/velori.css:1` `.accessory-photo.dock img` | `transform:scale(1.6)`<br>`transform-origin:50% 95%` | Observed |
| 85 | `All viewports` | `src/velori.css:1` `.detail-copy` | `padding:64px 40px` | Observed |
| 86 | `All viewports` | `src/velori.css:1` `.detail-copy .eyebrow` | `letter-spacing:1.5px`<br>`margin-bottom:16px` | Observed |
| 87 | `All viewports` | `src/velori.css:1` `.detail-copy h1` | `font:400 44px/52px var(--velori-font-display)`<br>`letter-spacing:-1px` | Observed |
| 88 | `All viewports` | `src/velori.css:1` `.detail-intro` | `font-size:16px`<br>`line-height:26px`<br>`margin-top:20px`<br>`color:var(--velori-color-secondary)` | Observed |
| 89 | `All viewports` | `src/velori.css:1` `.detail-tabs` | `display:flex`<br>`gap:12px`<br>`margin:32px 0` | Observed |
| 90 | `All viewports` | `src/velori.css:1` `.detail-tabs button` | `flex:1`<br>`height:44px`<br>`border:1px solid var(--velori-color-border)`<br>`border-radius:12px`<br>`font-size:12px`<br>`background:var(--velori-color-canvas)` | Observed |
| 91 | `All viewports` | `src/velori.css:1` `.detail-tabs button[aria-pressed=true]` | `background:var(--velori-color-selectedFill)`<br>`border:2px solid var(--velori-color-selectedBorder)` | Observed |
| 92 | `All viewports` | `src/velori.css:1` `.detail-facts` | `font-size:13px`<br>`line-height:20px` | Observed |
| 93 | `All viewports` | `src/velori.css:1` `.detail-facts dt` | `font-weight:600`<br>`margin-top:24px` | Observed |
| 94 | `All viewports` | `src/velori.css:1` `.detail-facts dd` | `margin:8px 0 0`<br>`color:var(--velori-color-secondary)` | Observed |
| 95 | `All viewports` | `src/velori.css:1` `.sample-tools` | `max-width:1024px`<br>`margin:16px auto`<br>`display:flex`<br>`gap:24px`<br>`flex-wrap:wrap`<br>`align-items:center`<br>`padding:0 16px`<br>`font-size:12px`<br>`color:var(--velori-color-secondary)` | Observed |
| 96 | `All viewports` | `src/velori.css:1` `.sample-tools button` | `border:0`<br>`background:transparent`<br>`text-decoration:underline`<br>`padding:8px 0` | Observed |
| 97 | `All viewports` | `src/velori.css:1` `.sample-tools p` | `flex-basis:100%` | Observed |
| 98 | `All viewports` | `src/velori.css:1` `.specimen-content` | `max-width:480px`<br>`padding:40px`<br>`margin:auto` | Observed |
| 99 | `All viewports` | `src/velori.css:1` `.specimen-content h1` | `font-size:28px` | Observed |
| 100 | `All viewports` | `src/velori.css:1` `.specimen-content h2` | `font-size:18px`<br>`margin:32px 0 16px` | Observed |
| 101 | `All viewports` | `src/velori.css:1` `.specimen-content>.primary` | `margin-top:24px` | Observed |
| 102 | `@media(max-width:800px)` | `src/velori.css:2` `.store-header` | `padding:0 20px` | Observed |
| 103 | `@media(max-width:800px)` | `src/velori.css:2` `.brand>span` | `display:none` | Observed |
| 104 | `@media(max-width:800px)` | `src/velori.css:2` `.configuration-layout,.detail-layout` | `grid-template-columns:1fr` | Observed |
| 105 | `@media(max-width:800px)` | `src/velori.css:2` `.product-panel` | `padding:48px 24px 32px`<br>`border-right:0`<br>`border-bottom:1px solid var(--velori-color-border)` | Observed |
| 106 | `@media(max-width:800px)` | `src/velori.css:2` `.product-view` | `max-width:420px` | Observed |
| 107 | `@media(max-width:800px)` | `src/velori.css:2` `.options` | `padding:32px 24px` | Observed |
| 108 | `@media(max-width:800px)` | `src/velori.css:2` `.product-eyebrow` | `left:24px`<br>`top:20px` | Observed |
| 109 | `@media(max-width:800px)` | `src/velori.css:2` `.detail-copy` | `padding:40px 24px` | Observed |
| 110 | `@media(max-width:800px)` | `src/velori.css:2` `.accessory-photo` | `min-height:480px`<br>`border-right:0` | Observed |
| 111 | `@media(max-width:800px)` | `src/velori.css:2` `.accessory-photo img` | `width:100%`<br>`height:480px`<br>`top:0` | Observed |
| 112 | `@media(max-width:800px)` | `src/velori.css:2` `.choices` | `gap:16px` | Observed |
| 113 | `@media(max-width:800px)` | `src/velori.css:2` `.accessory` | `gap:24px` | Observed |
| 114 | `@media(prefers-reduced-motion:reduce)` | `src/velori.css:3` `*` | `scroll-behavior:auto` | Observed |
| 115 | `@media(forced-colors:active)` | `src/velori.css:4` `button[aria-pressed=true]` | `border-color:Highlight` | Observed |
| 116 | `@media(forced-colors:active)` | `src/velori.css:4` `.color-dot,.swatch` | `forced-color-adjust:none` | Observed |
| 117 | `@media(forced-colors:active)` | `src/velori.css:4` `.selection-mark,.primary` | `border:1px solid ButtonText` | Observed |
| 118 | `@media(forced-colors:active)` | `src/velori.css:4` `.select-menu [aria-selected=true],.select-menu [data-active=true]` | `outline:1px solid Highlight` | Observed |
| 119 | `All viewports` | `src/velori.css:6` `.choices button` | `position:relative` | Observed |
| 120 | `All viewports` | `src/velori.css:6` `.selection-mark` | `position:absolute`<br>`top:8px`<br>`right:8px` | Observed |
| 121 | `All viewports` | `src/velori.css:6` `.face .selection-mark` | `top:50%`<br>`right:12px`<br>`transform:translateY(-50%)` | Observed |
| 122 | `All viewports` | `src/velori.css:6` `.face button` | `padding-right:32px` | Observed |
| 123 | `All viewports` | `src/velori.css:6` `.product-view` | `width:496px`<br>`max-width:100%` | Observed |
| 124 | `All viewports` | `src/velori.css:8` `.store-header>.back-link` | `border:1px solid var(--velori-color-border)`<br>`border-radius:12px`<br>`padding:10px 16px`<br>`color:var(--velori-color-ink)`<br>`font:500 14px/20px var(--velori-font-body)` | Observed |
| 125 | `All viewports` | `src/velori.css:8` `.detail-copy h1` | `margin-bottom:16px` | Observed |
| 126 | `All viewports` | `src/velori.css:8` `.detail-intro` | `font-size:18px`<br>`line-height:28px`<br>`margin:0 0 32px` | Observed |
| 127 | `All viewports` | `src/velori.css:8` `.detail-tabs` | `margin:0`<br>`flex-wrap:wrap` | Observed |
| 128 | `All viewports` | `src/velori.css:8` `.detail-tabs button` | `flex:initial`<br>`font:500 14px/20px var(--velori-font-body)`<br>`padding:10px 16px`<br>`min-height:44px` | Observed |
| 129 | `All viewports` | `src/velori.css:8` `.detail-facts` | `border-top:1px solid var(--velori-color-border)`<br>`margin:40px 0 0`<br>`padding-top:24px`<br>`font-size:14px` | Observed |
| 130 | `All viewports` | `src/velori.css:8` `.detail-facts dt` | `margin:0 0 8px` | Observed |
| 131 | `All viewports` | `src/velori.css:8` `.detail-facts dd` | `font-size:14px`<br>`line-height:24px`<br>`margin:0 0 24px` | Observed |
| 132 | `All viewports` | `src/velori.css:9` `.product-panel,.options,.detail-copy` | `min-width:0` | Observed |
| 133 | `@media(max-width:800px)` | `src/velori.css:9` `.configuration-layout,.detail-layout` | `grid-template-columns:minmax(0,1fr)` | Observed |
| 134 | `All viewports` | `src/velori.css:10` `.product-render` | `isolation:isolate` | Observed |
| 135 | `All viewports` | `src/velori.css:10` `.product-view` | `max-width:none` | Observed |
| 136 | `All viewports` | `src/velori.css:10` `.select-arrow` | `fill:none`<br>`stroke:currentColor`<br>`stroke-width:1.5`<br>`stroke-linecap:round`<br>`stroke-linejoin:round` | Observed |
| 137 | `@media(max-width:800px)` | `src/velori.css:10` `.product-view` | `max-width:100%` | Observed |
| 138 | `All viewports` | `src/velori.css:12` `.details-link` | `width:244px`<br>`font-size:14px`<br>`font-weight:600`<br>`padding:8px 20px` | Observed |

## Source hashes

The following hashes bind this definition to the accepted sample inputs. The config hash describes the portable reader projection, which excludes private native pins and owner fields; a private native run must separately hash its actual source configuration. The documents themselves and later native results need their own receipt. Source changes require a new inventory and affected validation.

| Source | SHA-256 |
|---|---|
| [src/library.jsx](../src/library.jsx) | `634cf3802efe934b10d86958e8339649eeda80ac8acf0981f70d6ac0408b73ea` |
| [src/model.mjs](../src/model.mjs) | `26555075b2e1fcc07cdf3d296a5e052a53ca0950c0395c7fa4531dcf645b6b2d` |
| [src/main.jsx](../src/main.jsx) | `56b9e74f5f869af62bc5e5435b58f599e16a0d7f38ae8c5ea797ec69dc748950` |
| [src/index.js](../src/index.js) | `62d7f9aa5ee876a8d607c47e6e2a70c6efdcbb9d407a61028b837066ed107ab6` |
| [src/ReviewConfiguration.jsx](../src/ReviewConfiguration.jsx) | `2dc2844d45a3dcbfa8e1f9b03809eec375a2939e8de5587f697b8068aefa8608` |
| [src/velori.css](../src/velori.css) | `6fa156bf66843cd5b072e75a951fef75b297cf845b3a4f5907d2b7d117f07e31` |
| [src/tokens.css](../src/tokens.css) | `f3c1ac263d33aaa92941a617049ef5ce906b55d6fa6ac208b84267165f0abcab` |
| [tokens.json](../tokens.json) | `84d9516c7c291d1dfd9f23709b23ca9fe00e001fed8ed8ad5623e69799f53c8d` |
| [.design-sync/config.json](../.design-sync/config.json) | `88c0282fbff7adfe296f55904e02efe90a281432154f36a8383c5f5c62a00ecb` |
| [.design-sync/host-entry.mjs](../.design-sync/host-entry.mjs) | `d95e4125972f66a02a13b31f1bbb778e46e35795b434e0d84fc64b8131837c97` |
| [.design-sync/conventions.md](../.design-sync/conventions.md) | `f06c0c14e0743f04e3e48804ea4ccd697c6031cc329af2ed8f6e3cbb88de7618` |
| [reference/index.html](../reference/index.html) | `de3ad905e57a2a3f1fa3a439312f65326c4948b6956b217287e37b4e07f66f58` |
| [reference/design-system.js](../reference/design-system.js) | `da1e34fc9e81bdab3da3ab9539b37aabd5d70d44f81cdf449a51fc57802f13a3` |
| [reference/extraction-manifest.json](../reference/extraction-manifest.json) | `ec29582f0d8ebbd59cde00a37f808bb20946c26e1584ccc139f4567eb5207d63` |
| [provenance/source-freeze.json](../provenance/source-freeze.json) | `262b1b41ff6e67cf2b0f42a26ffd2bd0fa956fe4c7609c48fd8cb007bfece37b` |
| [public/assets/velori/manifest.json](../public/assets/velori/manifest.json) | `05890ca379bc627bed2527867822d39c8151c44c95ce3ba412380ab1e0497e40` |
| [docs/product-brief.md](../docs/product-brief.md) | `77c40d938eaa35844367ec7eb9963df8214e68dd881f519488856af46c971e52` |
| [docs/inventory.md](../docs/inventory.md) | `f93a3967b1cb811c2e5e47f3ea158bdd3e05c6e1e2c70d5a073f02accd6e19c6` |
| [docs/native-baseline.md](../docs/native-baseline.md) | `7f1c6d32c06765be8892139b922c9fa981217e6f7bb6018e80d33b43fc944a49` |
| [.design-sync/package-assets.mjs](../.design-sync/package-assets.mjs) | `5ad8c250a877c028cfe0a6215b3e3ca14eb45328dcaad5ae2317eb381441d355` |
| [.design-sync/overrides/source-kit.mjs](../.design-sync/overrides/source-kit.mjs) | `154ee356eccb0193c19596c390eb444eedb8213347e102e8fd261d013d542531` |
