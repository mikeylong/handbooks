# Accepted Velori baseline

This document projects the accepted starting-screen rules from the full source definition into native generation guidance. It includes tokens, the 13 library exports, valid props, configure/menu/details layout, image composition, and state ownership. It excludes completed screen implementation, historical native records and destinations, frozen reference files, credentials, owner storage, build outputs, and validation captures. A fresh converted and uploaded inventory must prove this boundary; this document does not prove native execution.

## Source and state

Read the imported files below when generating a screen. Original repository paths identify provenance; they are not readable paths in the imported system.

| Original source authority | Imported equivalent |
|---|---|
| `src/library.jsx` through `.design-sync/host-entry.mjs` | `_ds_bundle.js` exposes the 13 exports at `window.Velori`; read `components/general/<Name>/<Name>.d.ts` for props and `<Name>.prompt.md` in the same folder for usage |
| `src/tokens.css`, `tokens.json`, accepted declarations in `src/velori.css` | `styles.css` imports `_ds_bundle.css`; the compiled stylesheet contains the 27 tokens and accepted classes |
| `src/model.mjs` | Valid values, labels, caption and descriptions are projected below; internal model helpers are not additional `window.Velori` exports |
| Configure and details portions of `src/main.jsx` | The copy, composition and behavior below; the application source and completed new screen are not imported |
| `docs/native-baseline.md` | `guidelines/docs/native-baseline.md`, this accepted baseline projection |

There is no provider or theme wrapper. Load React first, load `_ds_bundle.js`, and import `styles.css` once so its `_ds_bundle.css` closure reaches the generated screen. Keep the shared configuration in the parent, with shell chalk/pebble/graphite, face friendly/simple, color white/mint/blue/amber, and accessory dock/bag/none. Defaults are chalk/friendly/white/dock. These 3 × 2 × 4 × 3 values yield 72 configurations.

Controlled components invoke callbacks; the parent owns shared configuration, routing, persistence and return focus. The product details action opens dock details when the selected accessory is dock; bag and none both open bag details. Details tabs change the viewed accessory without changing the selected accessory. Use the header Back action to return to configure with every choice retained, then focus `#accessory-details`. Every details-screen change, including Carry bag to Charging dock or the reverse, focuses the newly mounted `#page-heading`, which accepts programmatic focus with `tabIndex="-1"`. Preserve `id="page-heading"` and `tabIndex="-1"` on the configure h1 as well. The product title is a paragraph with class `product-title`; do not add a second-level heading. These starting-screen behaviors and element choices come from `src/main.jsx:14–19`, `:22` and `:24`.

The sample storage namespace is `claude-design.velori-store.configuration.v1`; reset touches only that key. Read and normalize saved choices field by field: retain each valid value and default only an invalid or missing field. A JSON parse or storage-access error falls back to all defaults. Each save writes the normalized four values; a successful save clears the storage-error flag, and a failed save sets it. Reset similarly records the result of removing only the sample key and restores defaults. Blocked storage keeps choices for the current visit and displays the exact sample notice: "Browser storage is unavailable. Choices will last for this visit." These rules come from `src/model.mjs:7–11` and `src/main.jsx:10–12`, `:26`. Preserve caption, selection, photograph, face mask, and color agreement.

## Library exports and valid props

| Export | Accepted use |
|---|---|
| VeloriIcon | name check/chevron/friendly/simple; SVG attributes; no invented icon names |
| SelectionMark | No props; use within a positioned choice tile |
| PrimaryButton | children, onClick and optional id; ordinary Ink primary action; teaching variants are excluded |
| ChoiceGroup | group shell/face/accessory, matching valid value and onChange |
| FinishChoice | shell value and onChange |
| FaceChoice | face value and onChange |
| AccessoryChoice | one accessory value and onChange |
| ExpressionSelect | color value and onChange; use the existing dropdown |
| ProductPreview | complete valid configuration, optional unavailable and onDetails |
| Brand | No props; preserve authored brand composition |
| StoreHeader | optional review and onBack; preserve steps or details Back action |
| ConfigurationSummary | complete valid configuration; four labeled values; reusable primitive only |
| AccessoryPhoto | accessory bag/dock; direct photograph with the accepted crop |

The host entry exports this library only. Explicit discovery exclusions guard the completed-screen boundary. Supported primitives may describe two steps or summarize choices; they do not supply a completed new screen. Pass valid props: unsupported values have no guaranteed fallback. A ChoiceGroup with an invalid group can fail; an unknown icon name falls through to the Simple drawing. Do not treat either as an accepted variant.

The generated README's bare `<AccessoryChoice />` mount omits required props. Follow its imported `.d.ts` contract instead. Examples that refer to `noop`, `tile` or `cell` are isolated component-card demos, not screen state or layout helpers. Supply real parent state and callbacks for a screen. This bounded example updates only the accessory field:

```jsx
<AccessoryChoice
  value={configuration.accessory}
  onChange={accessory => setConfiguration(current => ({ ...current, accessory }))}
/>
```

`configuration` and `setConfiguration` belong to the parent; neither is a library export.

## Named values

Each token below matches `tokens.json` and `src/tokens.css`.

| Token | Value |
|---|---|
| `--velori-color-ink` | `#20262b` |
| `--velori-color-text` | `#20262b` |
| `--velori-color-secondary` | `#515a60` |
| `--velori-color-subtle` | `#6b7378` |
| `--velori-color-border` | `#c7ccd0` |
| `--velori-color-white` | `#fff` |
| `--velori-color-canvas` | `#fcfcf9` |
| `--velori-color-soft` | `#f7f8f9` |
| `--velori-color-selectedFill` | `#edf0f2` |
| `--velori-color-selectedBorder` | `#20262b` |
| `--velori-color-focus` | `#20262b` |
| `--velori-color-hover` | `#edf0f2` |
| `--velori-expression-white` | `#f4f6f2` |
| `--velori-expression-mint` | `#78ebc8` |
| `--velori-expression-blue` | `#80c8ff` |
| `--velori-expression-amber` | `#ffcc70` |
| `--velori-control-radius` | `12px` |
| `--velori-primary-height` | `48px` |
| `--velori-option-gap` | `24px` |
| `--velori-select-height` | `40px` |
| `--velori-menu-radius` | `16px` |
| `--velori-menu-padding` | `8px` |
| `--velori-menu-gap` | `8px` |
| `--velori-menu-option-height` | `40px` |
| `--velori-font-body` | `Arial,Helvetica,sans-serif` |
| `--velori-font-display` | `Georgia,'Times New Roman',serif` |
| `--velori-icon-stroke` | `1.5` |

## Accepted starting-screen copy and composition

Preserve the Configure copy and order from `src/main.jsx:19` and `:22`, with the existing component text from `src/library.jsx:25`, `:40` and `:43–44`.

| Starting-screen element | Exact copy or composition |
|---|---|
| Brand | VELORI; Personal robotics |
| Header steps | 1 Configure; 2 Review; Configure is the current step |
| Product panel accessible name | Your configured Velori |
| Product eyebrow | YOUR EVERYDAY COMPANION |
| Product title below ProductPreview | Velori, made for your home. |
| Product details action inside ProductPreview | View accessory details |
| Configure eyebrow | THE DETAILS MAKE IT YOURS |
| Configure heading | Make Velori yours. |
| Configure introduction | A finish, a face, a little personality. |
| Controls, in order | Shell finish with FinishChoice; Face display with FaceChoice; Face expression color with ExpressionSelect; Accessories with AccessoryChoice |
| Selected row values | Show the current label beside Shell finish, Face display and Accessories |
| Continue | Place the ordinary PrimaryButton directly in `.options`, after `.description`, with `id="continue"` and the text Continue. Leave its Review action unwired during known-screen verification; wire the parent navigation callback when adding Review configuration after correction persistence passes |

The caption follows `src/model.mjs:4` and `:8`: `{shell label} shell · {face label} face · {color label} · {accessory label}`. Labels are Chalk/Pebble/Graphite, Friendly/Simple, White/Mint/Blue/Amber and Dock/Carry bag/None. Preserve the middle dots and word order. The default caption is `Chalk shell · Friendly face · White · Dock`; the nondefault example is `Graphite shell · Simple face · Amber · Carry bag`. Place it below the product title in `.caption` with `aria-live="polite"`.

The `.description` below AccessoryChoice uses the selected accessory's exact copy from `src/model.mjs:6`:

| Selected accessory | Exact description |
|---|---|
| dock | A charging dock gives your robot a place to rest. |
| bag | A padded carry bag keeps Velori protected on the move. |
| none | Just Velori, ready to make itself at home. |

Both details screens use the accepted AccessoryPhoto beside `.detail-copy` and the following text from `src/main.jsx:24`. Keep the explicit line break in each `.detail-intro`.

| Details element | Carry bag | Charging dock |
|---|---|---|
| Eyebrow | MADE TO GO TOGETHER | MADE TO GO TOGETHER |
| Heading | Carry bag. | Charging dock. |
| Introduction, two lines | A place for Velori.<br>A little room for everything else. | A place to recharge.<br>Ready for another day together. |
| First fact heading | Made for everyday travel | Made for a place at home |
| First fact body | Soft gray fabric, a padded interior, and an easy carry handle. | A steady home for your robot between adventures. |
| Second fact heading | Keep the details close | Keep the details close |
| Second fact body | Explore the accessory before choosing your configuration. | Explore the accessory before choosing your configuration. |

The `.detail-tabs` group is labeled `Explore accessories`. Its two buttons appear in this order: `Carry bag`, then `Charging dock`. Set `aria-pressed` from the browsed details route. Switching tabs replaces that route while retaining the return destination and selected configuration. The header action reads `← Back to configurator` (`src/library.jsx:44`). Keep the `.detail-facts` heading/body pairs in a definition list. The library's existing product image messages and retry behavior remain those in `ProductPreview`; this projection adds no new details-photo recovery state.

## Applied configure and details rules

`src/velori.css` governs the declarations below. Preserve its source order and media scope.

1. `.store` uses min(100%,1024px), minimum height 768px and a 1px frame. `.store-header` is 80px high with 40px horizontal padding. `.configuration-layout` uses a 544px product column and a flexible options column. `.product-panel` has 40px 24px 36px padding; `.options` has 32px 40px 24px padding.
2. `.product-view` is a 496px square on desktop. `.product-title` uses Georgia at 27px/36px with weight 400; `.caption` is 12px/20px. `.options h1` is 32px/40px, weight 500. UI uses the Arial stack; body size and line-height inherit browser defaults. Figma font correspondence requires measured native evidence.
3. Finish and accessory tiles are 72px high with 12px corners. Desktop finish/accessory gaps are 24px. Face tiles are 44px high with a 12px desktop gap. At max-width 800px, finish and face gaps remain 16px and accessory gaps remain 24px. This is the accepted responsive exception.
4. Selected tiles have a 2px Ink border and Mist fill. Ordinary selection marks sit top/right 8px; face marks sit vertically centered at right 12px. Primary actions use Ink/white, height 48px and radius 12px. Button/link focus uses a 3px Ink outline with 3px offset. Hover, active and selected rules remain those in the actual stylesheet.
5. The expression trigger is 40px high, radius 12px, padding 8px 48px 8px 16px and gap 12px. Its menu opens 8px below, with radius 16px, padding/gap 8px and 40px options. Enter/Space opens and commits; arrows, Home/End and typeahead move the active option; Escape cancels; Tab and Alt+ArrowUp close; commit returns trigger focus.
6. `.detail-layout` uses a 576px photo column and flexible copy column. Bag/dock photo crops remain scale 1.8 at 94% 70% and scale 1.6 at 50% 95%, respectively. The detail heading is Georgia at 44px/52px; intro is 18px/28px. Use `.detail-copy`, `.detail-intro`, `.detail-tabs` and `.detail-facts` for the supplied composition. AccessoryPhoto receives the browsed accessory only and uses the original Chalk bag/dock reference photograph, independent of finish, face and expression. Browsing details must preserve configuration. `AccessoryPhoto` has no loading, error or retry state; do not add one in this change.
7. At max-width 800px, layout stacks; header padding is 20px, product padding 48px 24px 32px, options padding 32px 24px, and detail copy padding 40px 24px. Preserve the final product/detail image overrides in the stylesheet and verify narrow overflow in the rendered result.

## Product composition and native acceptance

`model.mjs` and `ProductPreview` govern asset composition. Dock/none use the selected shell photograph. Carry bag uses the Chalk bag base; Pebble/Graphite add the corrected shell layer and robot mask. Face masks are friendly/simple and the expression layer uses the selected color. All files ship at `assets/velori/`. ProductPreview handles loading, ready, failure and Retry image; retained choices remain usable when an image fails.

Asset inventory hashes describe the source upload bytes. The native service can attach C2PA provenance metadata and reserialize an SVG, changing its bytes without changing its drawing. If that occurs, preserve source and returned hosted files separately and compare the SVG viewBox, paths, fills, transforms, styles and filters. Accept a provenance-only difference only after the drawing structure is proved unchanged. Do not rewrite original inventory hashes or substitute another mask; stop for a drawing change or an unverified difference.

The host adapter derives asset base from the classic bundle script URL. Inline/module loading keeps a root fallback. Verify component cards and both generated-screen asset paths in the actual native surface before accepting portability. Recreate configure, the open menu, bag and dock details, and unavailable-image configure with default and Graphite/Simple/Amber/Carry bag choices. Record component/rule evidence for brand/navigation, heading, Continue, finish, face, dropdown, single accessory, imagery, caption and layout. Correct an isolated teaching defect and prove the accepted rule persists in a second generation before extending the product.
