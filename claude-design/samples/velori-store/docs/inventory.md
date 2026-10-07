# Routes, state, and components

| Route | Purpose | State and return behavior |
| --- | --- | --- |
| `#/configure` | Choose finish, face, expression color, and one accessory | Saves four choices; Continue opens Review |
| `#/edit` | Edit active choices or a restored cart item | Primary label stays Continue; changes reach the cart only after Review and Add to cart |
| `#/details-bag` or `#/accessory/carry-bag` | Inspect the carry bag photograph and description | Browsing preserves selection; Back returns to Configure or Edit and restores details-trigger focus |
| `#/details-dock` or `#/accessory/dock` | Inspect the charging dock | Shares details navigation and return behavior |
| `#/review` | Review the chosen robot and four values | Edit and Back retain choices; Add to cart snapshots one item; unavailable accessory requires replacement |
| `#/cart` | Show the saved configured item or empty cart | Image, four choices, Quantity: 1; Edit cart item restores the snapshot; empty cart offers Configure Velori |
| `#/specimens` | Inspect component states and exercise fixtures | Controls use the same active configuration state |

The retained routes without a slash, including `#configure`, `#review`, `#details-bag`, and `#details-dock`, remain aliases. Unknown routes recover to Configure. The current exercise is [Add to cart · v2.1.1](add-to-cart.md).

Active choices use local storage key `claude-design.velori-store.configuration.v1`. The saved one-item cart uses session storage key `claude-design.velori-store.cart.v1`. Cart imagery and summaries read the snapshot rather than later active choices. Reset clears both sample keys, restores defaults, and returns to Configure; unrelated storage is preserved.

The model has three finishes × two faces × four expression colors × three accessory choices, or 72 combinations. Defaults are Chalk, Friendly, White, and Dock. Carry bag uses the Chalk bag photograph with a masked Pebble or Graphite robot layer when needed. The original image prompts also describe historical variants; they do not expand this baseline.

| Export | Inputs and states |
| --- | --- |
| `FinishChoice`, `FaceChoice`, `AccessoryChoice` | `value`, `onChange`; default, selected, hover, and focus |
| `ChoiceGroup` | `group`, `value`, `onChange`; underlying reusable choice layout |
| `ExpressionSelect` | `value`, `onChange`; closed, open, active option, selected option, focus, and cancellation |
| `PrimaryButton` | Button props; optional `fixture="purple-continue"` |
| `ProductPreview` | `configuration`, optional `unavailable`, `onDetails`; loading, ready, failed, and retry |
| `ConfigurationSummary` | `configuration`, optional `unavailable`; four labeled selected values and an unavailable-accessory badge |
| `AccessoryPhoto` | `accessory="bag"` or `"dock"`; consumer photo crop |
| `StoreHeader`, `Brand` | Header composition; `step` selects Configure, Review, or Cart; retained `review` prop; optional `onBack` and `backLabel` |
| `SelectionMark`, `VeloriIcon` | Selection mark; check, chevron, Friendly, and Simple icon anatomy |

Model helpers and storage constants are also exported from `src/index.js`. The library imports its CSS and expects a browser with React. `ProductPreview` resolves packaged assets relative to the Vite base URL; other hosts need the same asset paths. It contains no CLEAR host globals, canvas positioning contract, or reviewer coordination.

## Figma companion and your working copy

The [native Figma file](https://handbooks.surfaces.systems/claude-design/editions/v2.1.1/velori-design-exploration-starter.fig) and its [companion manifest](https://handbooks.surfaces.systems/claude-design/editions/v2.1.1/figma-companion.json) are available in the exploration ZIP and through the edition downloads. Import the file into your own Drafts and record the new file URL and companion SHA-256.

Navigate the imported starter by named pages and frames from its manifest, and preserve the starting material. Create a separate working page for the exercise. The completed answer key is `answer-key/velori-review-continuation.fig` in the exploration ZIP; use its Review and Cart frames only for later comparison, outside initial Claude Design generation context. The recorded author-file identities below describe the earlier system and are historical correspondence.

Verify local main components, internal instance links, variable collections and modes, image resources, and available fonts in the imported copy. Stop if a required external library or resource is inaccessible. Record actual imported identities and test the prototype; the original IDs below do not identify your new file.

## Historical Figma correspondence for later verification

The following IDs were recorded in the [author’s Velori file](https://www.figma.com/design/jdGjI8zBJrvpMERKpBSCli?node-id=34-695). The original reference was `10:9`, and **05 Store · Handbook exercise** was `34:694`. The author link is optional historical context; use your imported file for the exercise.

| React behavior | Native Figma identity |
| --- | --- |
| Primary button | Component set `7:46`, default component `7:44` |
| Finish choices | Component set `7:68` |
| Face choices | Component set `7:190` |
| Accessory choices | Component set `7:306` |
| Expression select | Component set `7:460` |
| Product photo composition | Component set `7:544` |
| Face expression composition | Component set `9:140` |
| Shared shopper choices | Collection `37:80`, mode `37:0`; shell `37:81`, face `37:82`, color `37:83`, accessory `37:84` |
| Configure / menu | Frames `34:695` / `43:216` |
| Review / unavailable review | Frames `43:80` / `43:475` |
| Carry bag / charging dock details | Frames `43:383` / `43:425` |

These recorded identities describe the author file. Inspect the imported copy’s actual component and variable bindings and test its prototype before claiming that variables persist between frames within a visit. Browser reload persistence and HTML dropdown keyboard behavior belong to the executable app. Figma keyboard triggers are limited to the explicitly configured prototype actions.

## Implemented extension and native provenance

`ReviewConfiguration` and `CartConfirmation` are product exports in `src/index.js`. The earlier Review column cited the native source accepted on October 5, 2026, SHA-256 `03b16ac0f4fea25202384a1f355baddd71dcf70db20b0b976b68f0f46811150a`. The v2.1.1 extension implements the v2.1.0 standalone answer key's cart behavior in React. The app owns configuration, the cart snapshot, navigation, persistence, and focus; ProductPreview retains image recovery. The initial import selects only the 13 baseline library exports and accepted baseline guidance. Exclude both completed product screens from initial generation context. [Portable provenance](../provenance.json) records package inputs and adaptation scope. A new exercise must capture and validate a new native packet.
