# Velori conventions

Velori is a small configurator kit for a personal-robot store. Every export lives on `window.Velori`. There is no provider or theme wrapper. Styling comes entirely from `styles.css`, which imports `_ds_bundle.css`. That file holds the `:root` tokens and every component class.

## Setup
- Load `styles.css` once and render components directly. Nothing needs a context wrapper.
- `styles.css` sets `body` to `var(--velori-color-canvas)` with `var(--velori-font-body)`. Don't override the body font.
- `FinishChoice`, `FaceChoice`, `AccessoryChoice` and `ExpressionSelect` are controlled. Always pass `value` and `onChange`, and keep the state in your own `useState`.
- Valid values: shell `chalk | pebble | graphite`, face `friendly | simple`, color `white | mint | blue | amber`, accessory `dock | bag | none`. Pass only valid values and a valid shell/face/accessory group. Unsupported inputs have no guaranteed fallback; an invalid group can fail and an unknown icon name falls through to Simple.
- `SelectionMark` is absolutely positioned (top 8px, right 8px). Only place it inside a `position: relative` tile. Face tiles use the stylesheet's centered marker at right 12px.
- `ProductPreview` and `AccessoryPhoto` load the original product photos from `assets/velori/` next to `_ds_bundle.js` (the classic-script adapter sets its asset base from its own script URL; inline/module loading keeps the root fallback, which requires native verification). `ProductPreview` renders any valid `configuration`; pass `unavailable` only to show its placeholder state on purpose. `AccessoryPhoto` takes `accessory="dock" | "bag"` and is a tall detail crop meant for a 576px desktop detail column. It has no loading/error/retry state; preserve that scope. Details browsing changes the viewed accessory, never the selected accessory.

## Styling idiom: CSS custom properties plus the kit's own classes
Use tokens for anything you build yourself. Never hard-code the hex values.
- Color: `--velori-color-ink`, `--velori-color-text`, `--velori-color-secondary`, `--velori-color-subtle`, `--velori-color-border`, `--velori-color-canvas`, `--velori-color-soft`, `--velori-color-selectedFill`, `--velori-color-selectedBorder`, `--velori-color-focus`, `--velori-color-hover`, `--velori-color-white`
- Expression colors: `--velori-expression-white | -mint | -blue | -amber`
- Shape and size: `--velori-control-radius` (12px), `--velori-menu-radius` (16px), `--velori-primary-height` (48px), `--velori-select-height` (40px), `--velori-option-gap` (24px), `--velori-menu-padding` (8px), `--velori-menu-gap` (8px), `--velori-menu-option-height` (40px)
- Type: `--velori-font-body` (Arial stack) for UI, `--velori-font-display` (Georgia stack) for product headlines only

Page-layout classes that already exist: `store` (1024px framed page), `configuration-layout` (544px product column + options column), `product-panel`, `options`, `eyebrow` (10px tracked caps label), `sub` (secondary subhead), `row-label` (label row above a choice group), `description`, `product-title`, `caption`, `summary`, `detail-layout`, `detail-copy`, `detail-intro`, `detail-tabs`, `detail-facts`, `accessory-photo`. An `h1` inside `.options` gets the 32px page heading style.

At max-width 800px, finish/face gaps remain 16px; accessory gaps remain 24px. Preserve button/link focus: 3px Ink outline with 3px offset. The parent owns shared choices, routes, storage and heading/return focus. Read the accepted baseline guidance before recreating screens.

The declared repository source adapter copies runtime photos/masks before native hashing, validation and capture. Read [the runtime asset inventory](guidelines/velori-runtime-assets.md). Any inventory change requires fresh ProductPreview and AccessoryPhoto captures and visual grades, even with unchanged component source keys. Upload `assets/**` explicitly and review obsolete remote paths before naming deletes.

## Where the truth lives
- `_ds_bundle.css` has every token and class above. Read it before styling.
- `components/general/<Name>/<Name>.d.ts` is each component's props. `<Name>.prompt.md` has its usage.

## Example
```jsx
const { StoreHeader, FinishChoice, ExpressionSelect, PrimaryButton } = window.Velori;
function Configure() {
  const [shell, setShell] = React.useState('chalk');
  const [color, setColor] = React.useState('white');
  return (
    <main className="store">
      <StoreHeader />
      <section className="options">
        <p className="eyebrow">THE DETAILS MAKE IT YOURS</p>
        <h1>Make Velori yours.</h1>
        <p className="sub">A finish, a face, a little personality.</p>
        <div className="row-label"><span>Shell finish</span><span>{shell}</span></div>
        <FinishChoice value={shell} onChange={setShell} />
        <ExpressionSelect value={color} onChange={setColor} />
        <div style={{ marginTop: 24 }}><PrimaryButton>Continue</PrimaryButton></div>
      </section>
    </main>
  );
}
```
