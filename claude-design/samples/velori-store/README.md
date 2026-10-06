# Run the Velori store

From the extracted `velori-store` folder, start the app:

```sh
cd velori-store
npm ci
npm run dev
```

Open http://127.0.0.1:4197. Use Node.js 22 and npm. The first install needs access to the npm registry. All product assets ship in this folder; the app runs without CLEAR, a Claude account, or a Figma account. If port 4197 is occupied, run `npm run dev -- --port 4200` and open the address Vite prints.

## Try the journey

1. Choose Graphite, Simple, Amber, and Carry bag. The photo, face, selection marks, and caption should agree.
2. Open **View accessory details**. Explore Carry bag and Charging dock, then use **Back to configurator**. Browsing an accessory does not select it.
3. Select **Continue**. Review configuration shows the same robot and all four choices. The Review screen checks your four chosen values.
4. Select **Edit configuration**. The configurator keeps your choices and returns focus to Continue. Browser Back also returns to the configurator.
5. Reload. Your choices should survive. Use **Reset configuration** below the store to restore Chalk, Friendly, White, and Dock.

The reference composition is 1024 × 768. Narrow screens stack the product and controls. The package uses Arial and Georgia from the consumer source. The supplied native Figma system uses Arimo and Lora; record that font mapping when comparing the two.

## Open your Figma working copy

The variable-driven native journey requires a **paid Figma Design plan or eligible Education plan**, with **can edit** access to your working file. [Figma’s variable guide](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma) explains this requirement. Starter can [import the `.fig` into Drafts](https://help.figma.com/hc/en-us/articles/360041003114-Import-files-to-the-file-browser), but its [prototype features](https://help.figma.com/hc/en-us/articles/360040328273-Compare-Figma-plans-and-features) do not include variables, expressions, or conditional logic.

Download the [native Figma companion](https://handbooks.surfaces.systems/claude-design/editions/v1.2.1/velori-design-system-configurator.fig) and its [manifest](https://handbooks.surfaces.systems/claude-design/editions/v1.2.1/figma-companion.json) separately from this ZIP. Import the `.fig` file into your own Figma Drafts. Record the new file URL and companion SHA-256; the author file is not required for the exercise.

Preserve **01 Foundations**, **02 Components**, **03 Configurator**, and **04 Source Assets**, including **Configure · White** on **03 Configurator**. Create a separate working page. The completed **05 Store · Handbook exercise** page is an answer key for later comparison. Keep it outside initial Claude Design generation context.

Before editing, inspect local main components, internal instance links, variable collections and modes, image resources, and available fonts. Stop if a required external library or resource is inaccessible. Use named pages and frames from the manifest, then record actual IDs in your imported file. Follow the [walkthrough](docs/walkthrough.md) for prototype checks and keep the companion copyright and third-party notices. Arimo and Lora are font references; the companion includes no font software.

## Use the keyboard

Tab to each control. Enter or Space selects a finish, face, or accessory. In the expression dropdown, Enter or Space opens and commits; arrows move through options; Home and End reach the first and last option. Typing an option's name moves to it. Escape cancels, Tab closes, and Alt+ArrowUp closes. The dropdown returns focus to its trigger after a selection. Review and details place focus on the new heading, then restore focus when you return.

## Inspect the system

Open `/#specimens` for controls and named exercise fixtures. The corrected baseline uses an Ink/white Continue button, 12px corners, 48px height, and 24px accessory gaps. Visit `/?fixture=purple-continue` or `/?fixture=accessory-gap-8` to inspect the two original teaching violations separately. Use `/?image=unavailable#review` to see a missing image while choices remain available. A real failed image request offers Retry image.

The sample saves only `claude-design.velori-store.configuration.v1` in this origin's local storage. Reset touches only that key. Private browsing or blocked storage can limit persistence to the current visit; the app explains that limitation. Changing ports creates a different storage origin.

## Validate an extracted copy

```sh
npm run check
npm run build
npx playwright install chromium
npm run dev
```

Leave the server running. In another terminal in this folder:

```sh
npm run validate:browser
```

The browser check covers all 72 configurations, the complete journey, keyboard dropdown behavior, rapid changes, reload, unavailable images, reset isolation, and mobile layout. It writes results and screenshots to `validation/`. Set `VELORI_URL` for another port and `VELORI_VALIDATION_DIR` for another output folder. A passing local test establishes app behavior. Native import, generation, export, and Figma reuse each require their own returned evidence.

## Capture a native handoff

Follow [the tool walkthrough](docs/walkthrough.md) to import the prepared system, generate the bounded change, and capture an executable handoff from your own Design project. Preserve and validate that new packet independently. The public sample includes a bounded React Review adaptation. Captured Claude Design source and runtime remain in the private review archive and outside the public downloads.

## Start a new native exercise

The running app is the completed answer key. Use Configure, its expression menu, accessory details, and the unavailable-image configurator as the starting screens. Import the 13 baseline exports from `src/library.jsx` with the configured host entry and [accepted baseline guidance](docs/native-baseline.md); exclude `src/ReviewConfiguration.jsx` and `handoff/` from initial generation context. Ask Design to create a new review screen only after source definition, known-screen fidelity, and correction persistence pass.

The public archive omits historical native metadata and projects a reader configuration without any owner project pin. Packaging preserves the private source config. The bounded React Review configuration column was adapted from the native Review source accepted on October 5, 2026, SHA-256 `03b16ac0f4fea25202384a1f355baddd71dcf70db20b0b976b68f0f46811150a`. The existing app retains configuration, routing, persistence, focus, and image recovery. Capture and validate your own new packet; the answer key does not verify your generation. Follow [the walkthrough](docs/walkthrough.md) and keep a new handoff record.

## Extend Velori

Read [the product brief](docs/product-brief.md), [route and component inventory](docs/inventory.md), [tool walkthrough](docs/walkthrough.md), [prompts](docs/prompts.md), and [expected results](docs/expected-results.md). Record the result with [the handoff template](docs/handoff-template.md).

Named React exports live in `src/index.js`. Styles and tokens live in `src/velori.css`, `src/tokens.css`, and `tokens.json`. `reference/` retains the extracted consumer reference with the original teaching violations. [Provenance](provenance.json) records the frozen source inputs and adaptations. The sample source and assets use the [MIT license](LICENSE); retain the [applicable notices](docs/asset-terms.md).
