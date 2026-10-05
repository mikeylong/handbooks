# Routes, state, and components

| Route | Purpose | State and return behavior |
| --- | --- | --- |
| `#configure` | Choose finish, face, expression color, and one accessory | Saves four choices; Continue opens review |
| `#details-bag` | Inspect the carry bag photograph and description | Browsing preserves selection; Back restores configurator and details-trigger focus |
| `#details-dock` | Inspect the charging dock | Shares details navigation and return behavior |
| `#review` | Review the chosen robot and four values | Edit and Back retain choices and restore Continue focus |
| `#specimens` | Inspect component states and exercise fixtures | Controls use the same configuration state |

The model has three finishes × two faces × four expression colors × three accessory choices, or 72 combinations. Defaults are Chalk, Friendly, White, and Dock. Carry bag uses the Chalk bag photograph with a masked Pebble or Graphite robot layer when needed. The original image prompts also describe historical variants; they do not expand this baseline.

| Export | Inputs and states |
| --- | --- |
| `FinishChoice`, `FaceChoice`, `AccessoryChoice` | `value`, `onChange`; default, selected, hover, and focus |
| `ChoiceGroup` | `group`, `value`, `onChange`; underlying reusable choice layout |
| `ExpressionSelect` | `value`, `onChange`; closed, open, active option, selected option, focus, and cancellation |
| `PrimaryButton` | Button props; optional `fixture="purple-continue"` |
| `ProductPreview` | `configuration`, optional `unavailable`, `onDetails`; loading, ready, failed, and retry |
| `ConfigurationSummary` | `configuration`; four labeled selected values |
| `AccessoryPhoto` | `accessory="bag"` or `"dock"`; consumer photo crop |
| `StoreHeader`, `Brand` | Header composition; `review` active step; optional `onBack` |
| `SelectionMark`, `VeloriIcon` | Selection mark; check, chevron, Friendly, and Simple icon anatomy |

Model helpers and storage constants are also exported from `src/index.js`. The library imports its CSS and expects a browser with React. `ProductPreview` resolves packaged assets relative to the Vite base URL; other hosts need the same asset paths. It contains no CLEAR host globals, canvas positioning contract, or reviewer coordination.

## Historical Figma correspondence for later verification

The working file is [Velori · Design System & Configurator](https://www.figma.com/design/jdGjI8zBJrvpMERKpBSCli?node-id=34-695). The original reference at `10:9` remains separate. The new page is **05 Store · Handbook exercise** (`34:694`).

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

These recorded identities are historical starting points. Inspect current bindings and test the actual prototype before claiming that variables persist between these frames within a prototype visit. Browser reload persistence and HTML dropdown keyboard behavior belong to the executable app. Figma keyboard triggers are limited to the explicitly configured prototype actions.

## Implemented extension and native provenance

`ReviewConfiguration` is an additional product export in `src/index.js`. Its bounded review column was adapted from the native Review source accepted on October 5, 2026, SHA-256 `03b16ac0f4fea25202384a1f355baddd71dcf70db20b0b976b68f0f46811150a`; the existing app retains configuration, routing, persistence, focus, and image recovery. The import configuration selects only the 13 baseline library exports and the accepted baseline guidance. [Portable provenance](../provenance.json) records package inputs and adaptation scope; private historical mappings are excluded from the public payload. All captured native source and runtime stay in the private review archive and outside the MIT sample. A new exercise must capture and validate a new native packet.
