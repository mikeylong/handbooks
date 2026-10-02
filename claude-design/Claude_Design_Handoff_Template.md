# Claude Design to Development — Handoff Template

## Feature

**Name:** `[Feature name]`  
**Route:** `[Current route]`  
**Owner:** `[Product / design / engineering owner]`  
**Design approval:** `[Reviewer and date]`  
**Target repository revision:** `[Commit or branch]`

## Decision

`[One paragraph: what is changing, for whom, and why.]`

## Scope

### Change

- `[Approved surface or behavior]`

### Preserve

- `[Shell, navigation, routes, actions, data, permissions, and unaffected behavior]`

### Non-goals

- `[Explicit exclusion]`

## Source-of-truth stack

| Priority | Source | Revision or link | Governs |
|---:|---|---|---|
| 1 | Production behavior | `[route, tests, API]` | `[behavior and persistence]` |
| 2 | Component code | `[package and revision]` | `[imports, props, semantics]` |
| 3 | Working Figma library | `[editable file and revision]` | `[anatomy, variants, variables]` |
| 4 | Shipped screens | `[references]` | `[composition and density]` |
| 5 | Product brief | `[artifact and approval]` | `[intent, scope, success]` |

## Approved journey

1. `[Entry state]`
2. `[Action and feedback]`
3. `[Validation or recovery]`
4. `[Save or commit]`
5. `[Success state]`

## Design references

- Baseline and preserve annotations: `[link or path]`
- Approved screens: `[link]`
- Interactive prototype: `[link]`
- Responsive references: `[links]`
- State matrix: `[link]`
- Transition contracts: `[link]`
- Claude Design handoff bundle: `[URL]`
- Decision log: `[link]`

## Component-to-code map

| Design element | Disposition | Production import or path | Props / variants | Notes |
|---|---|---|---|---|
| `[element]` | `[reuse / variant / composition / proposal / reference-only / unverified]` | `[real import]` | `[mapping]` | `[constraint]` |

## Product-specific extensions

| Component | Why existing primitives are insufficient | Required states | Accessibility contract | Owner | Intended code path |
|---|---|---|---|---|---|
| `[component]` | `[reason]` | `[states]` | `[behavior]` | `[owner]` | `[path]` |

## Design-system delta

### Components and variants

- `[Proposal, owner, review status]`

### Tokens

- `[Semantic token, derivation, owner, review status]`

### Guidance

- `[New usage rule or composition pattern]`

## Data and fixtures

| Fixture | Path | Purpose | Expected result |
|---|---|---|---|
| `[fixture]` | `[path]` | `[state or test]` | `[observable result]` |

**Data provenance rules:** `[live, cached, stale, truncated, sample]`

## States and transitions

**State matrix:** `[link]`

| Action | Trigger / precondition | Immediate feedback | Success | Failure and recovery | Persistence |
|---|---|---|---|---|---|
| `[action]` | `[contract]` | `[feedback]` | `[result]` | `[stable state and recovery]` | `[reload rule]` |

## Copy

| Context | Exact copy | Dynamic values | Notes |
|---|---|---|---|
| `[label / helper / error / confirmation / empty state]` | `[approved text]` | `[variables]` | `[localization or truncation]` |

## Accessibility contract

- Keyboard path: `[critical flow]`
- Focus entry and restoration: `[rules]`
- Accessible names: `[rules and exceptions]`
- State announcements: `[status and progress]`
- Error summary and field links: `[behavior]`
- Table or grid semantics: `[behavior]`
- Reduced motion: `[behavior]`
- Implementation-only tests: `[screen reader, browser, OS, zoom]`

## Responsive contract

| Viewport | Layout behavior | Surface priority | Known constraint |
|---|---|---|---|
| `[primary]` | `[behavior]` | `[priority]` | `[constraint]` |
| `[minimum]` | `[behavior]` | `[priority]` | `[constraint]` |
| `[mobile]` | `[edit / view-only / unsupported]` | `[priority]` | `[constraint]` |

## Acceptance tests

1. `[Preservation test]`
2. `[Component and token traceability test]`
3. `[Critical success-path test]`
4. `[Invalid-action test]`
5. `[Failure and recovery test]`
6. `[Persistence and reload test]`
7. `[Keyboard and focus test]`
8. `[Responsive test]`
9. `[Data correctness test]`
10. `[Rendered visual comparison]`

## Prototype-code warning

Prototype code demonstrates design intent. Use only mappings explicitly identified in the component-to-code table. Do not copy scratch components, simulated data, local styles, or generated state management into production without review.

## Suggested implementation sequence

1. `[Read-only model or shell integration]`
2. `[Core interaction]`
3. `[Adjacent surface]`
4. `[Data and persistence]`
5. `[Failure and recovery]`
6. `[Responsive and accessibility]`
7. `[Regression and reconciliation]`

## Verification plan

### Static

- `[type check]`
- `[lint]`
- `[build]`
- `[design-token / duplicate-component audit]`

### Behavior and data

- `[unit and integration checks]`

### Rendered

- `[route, state, viewport, screenshot baseline]`

### Human

- Product: `[reviewer]`
- Design / design system: `[reviewer]`
- Engineering: `[reviewer]`
- Accessibility: `[reviewer]`

## Open decisions and deviations

| Severity | Item | User or implementation consequence | Owner | Due | Status |
|---|---|---|---|---|---|
| `[High / Medium / Low]` | `[item]` | `[consequence]` | `[owner]` | `[date]` | `[status]` |

## Final proof record

**Repository revision:** `[commit]`  
**Implemented route:** `[URL]`  
**Checks passed:** `[commands and results]`  
**Rendered evidence:** `[links]`  
**Approved deviations:** `[links]`  
**Unverified items:** `[items]`  
**Figma / Code Connect reconciliation:** `[not required / completed / assigned]`
