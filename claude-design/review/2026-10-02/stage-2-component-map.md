# Stage 2 local component map

The local app directly imports the pinned SDS source. Native Figma identity and Claude Design import remain unverified. Product composites have no approved production/shared-library owner.

| Element | Disposition | Local source import | Props used |
|---|---|---|---|
| Button | direct local code reuse | `sds/src/ui/primitives/Button/Button.tsx` | variant, isDisabled, onPress, onKeyDown |
| InputField | direct local code reuse | `sds/src/ui/primitives/Input/Input.tsx` | label, value, onChange, isInvalid, errorMessage |
| SelectField | direct local code reuse | `sds/src/ui/primitives/Select/Select.tsx` | label, selectedKey, onSelectionChange, isDisabled |
| Dialog / DialogModal / DialogTitle | direct local code reuse | `sds/src/ui/primitives/Dialog/Dialog.tsx` | isOpen, onOpenChange, isDismissable, aria-label |
| Tag | direct local code reuse | `sds/src/ui/primitives/Tag/Tag.tsx` | scheme, children |
| Table family | direct local code reuse | `sds/src/ui/primitives/Table/Table.tsx` | dense, sortDescriptor, onSortChange, row identity |

Product wrappers, graph state, importer mapping, preview provenance, run/recovery and test controls live in `data-pipeline-studio/src/main.jsx` and `src/model.mjs`. The product composites are teaching code, not promoted SDS components. The JSON map records source hashes and the upstream revision.

Local CSS uses SDS semantic variables for color, spacing, borders, typography and focus. Dynamic geometry belongs to product wrappers; SDS Button intentionally drops its style prop. The upstream source contains its own raw values, which were preserved.
