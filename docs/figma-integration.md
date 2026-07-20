# Carry Forward Figma integration contract

> **Figma defines the authored experience. TypeScript owns authority. Validation decides what may render.**

## Canonical source

Figma file: `7qjuReLeQrMAx6MJgHUUgL`

The production implementation uses one browser route, `/carry-forward`, and a reducer-owned internal sequence. Screen names are documentation labels, not URL fragments. Task or source text is never placed in browser history.

## Authority hierarchy

1. The strict domain schema limits GPT-5.6 to `read`, `choice`, `compose`, `checklist`, and `review` steps.
2. Server validation and exact evidence verification decide whether output becomes a `ValidatedTaskPlan`.
3. `carryForwardReducer.ts` owns workflow state and legal transitions.
4. Fixed React renderers own controls, labels, dialogs, copy, download, filenames, focus, and cleanup.
5. Figma owns fixed product copy, screen purpose, action hierarchy, pacing, disclosure timing, visual hierarchy, and motion character.
6. Tests prove the design contract without making paid model calls.

Generated Figma code is reference material. Production uses the existing React, TypeScript, and CSS architecture; Tailwind is not installed.

## Canonical production map

| Canonical state | Figma node | Reducer / production state | Owning production code | Fixed copy owner | Dynamic data owner | Accessibility responsibility | Motion responsibility | Primary verification |
|---|---:|---|---|---|---|---|---|---|
| M01 Receipt qualification | `10:7` | `input / bridge` | `CarryForwardApp.tsx` → `ReceiptBridge` | Application | Consumed receipt ID only | Focused heading, semantic receipt article, clear primary and quiet exit | `carry-forward-parity.css` mode transition | `tests/e2e/carry-forward.spec.ts` receipt-origin journey |
| M02 Name one task | `10:41` | `input / task` | `CarryForwardApp.tsx` | Application | User task remains in memory | Associated label and hint, task-field focus, Cancel remains reachable | Mode transition; local field feedback | Direct-entry, ambiguity, viewport, accessibility tests |
| M03 Source context + privacy | `10:69` | `input / source` | `CarryForwardApp.tsx` | Application | Optional raw source remains in memory only | Associated textarea, explicit disclosure, continue-without-source path | Mode transition | Full journey and privacy regression tests |
| M04 Interaction Budget | `10:104` | `budget` | `CarryForwardApp.tsx`; `InteractionPolicyCard` | Application policy copy | User-declared booleans only | Native checkboxes, descriptions, keyboard toggles | 120 ms policy feedback; 280 ms screen handoff | Reducer, parity, accessibility tests |
| M05 Adaptation preview | `10:154` | `preview` | `CarryForwardApp.tsx`; `carryForwardPresentation.ts` | Application deterministic resolver | Declared policy state | Heading focus, technical details subordinate, Adjust and End Mode available | 180 ms disclosure; 280 ms screen handoff | Deterministic adaptation tests and E2E |
| M06 Compile task plan | `11:46` | `compiling` | `CarryForwardApp.tsx`; `carryForwardCompileRun.ts` | Application | Broad application-known phase only | Live status, visible Cancel and End Mode, abort-safe focus return | Stable shell; no percentage or looping progress claim | Cancellation, late-response, End Mode, accessibility tests |
| M07 Decision step | `11:79` | `active / choice` | `ActiveWorkspace`; `TaskStepRenderer.tsx` | Application action resolver | Validated options and user selection | Native radio group; Show All Choices with `aria-expanded` and `aria-controls` | 120 ms selection; 180 ms step change | Progressive-disclosure keyboard tests |
| M08 Essential facts | `11:113` | `active / read` or `active / checklist` | `ActiveWorkspace`; `TaskStepRenderer.tsx` | Application | Validated facts, exact evidence excerpts, checklist state | Semantic details, labels, native checkboxes | 180 ms step change | Evidence, renderer, and journey tests |
| M09 Working draft | `11:153` | `active / compose` | `ActiveWorkspace`; `TaskStepRenderer.tsx` | Application action resolver | Validated template and user draft | Associated textarea, protected-state status | 120 ms edit feedback; 180 ms step change | Storage and complete-journey tests |
| M10 Final review | `11:183` | `active / review` | `ActiveWorkspace`; `TaskStepRenderer.tsx` | Application boundary and final action | Validated review summary and include-list | Semantic review list; explicit no-external-action statement | 180 ms step change | Contextual-label and output tests |
| M11 Why This View | `12:54` | `explaining / why` | `RuntimeInspector`; `carryForwardPresentation.ts`; `InspectorSheet` | Application causal resolver | Current policies, validated plan, runtime state | Native modal dialog, labelled title and description, initial focus, Escape, focus restoration | 180 ms disclosure; transforms removed for reduced motion | Causal-copy and accessibility E2E |
| M12 One thing closed | `12:97` | `complete` | `CompletionScreen` | Application closure and proof framing | Validated task title and application-counted completion proof | Focused closure heading; details secondary; explicit cleanup actions | 280 ms completion transition | Completion, refresh, once-only telemetry tests |
| M13 Ambiguous task recovery | `12:128` | `input / recovery` | `CarryForwardApp.tsx` | Application fixed examples and recovery copy | Original user phrase only | Dedicated state, Try Again focus restoration, no request | 280 ms recovery handoff | No-request ambiguity journey and keyboard test |
| M14 Assisted fallback | `12:161` | `fallback` | `FallbackScreen` | Application safe error copy | Draft in memory; bounded manual work | Stable error status and manual controls | Mode transition | Existing fallback and API failure tests |
| M15 Expired task window | `12:190` | `expired` | `CarryForwardApp.tsx` | Application | Receipt ID only when available | Clear recovery actions and focused heading | Mode transition | Existing expiry and storage tests |

## Product sequence

Receipt-origin entry follows:

`M01 → M02 → M03 → M04 → M05 → M06 → M07–M10 → M11 as requested → M12`

Direct `/carry-forward` entry begins at M02. It never fabricates a receipt or shows M01 without a consumed receipt seed. M13 is entered before any model request when the task lacks one concrete action.

## State and effect ownership

The reducer contains no fetch, storage, clipboard, download, analytics, navigation, or timers. Effects remain explicit adapters:

- `compileCarryForwardTask()`
- `startCarryForwardCompileRun()`
- `saveCarryForwardSession()` / `clearCarryForwardSession()`
- `copyPlanOutput()` / `downloadPlanOutput()`
- telemetry emission with allowlisted properties
- expiry timer in the route component

Raw source is removed after successful compilation and never enters protected progress storage.

## Adaptation contract

M05 and M11 are generated by deterministic application resolvers, not the model.

- **One step at a time** controls required-step visibility.
- **Fewer decisions** shows the primary option first and keeps every approved alternative behind **Show All Choices**.
- **Protect my progress** controls the isolated four-hour progress record.
- **Defer optional work** places whole nonrequired activities in **Later**.
- The shell changes once and remains spatially stable.

Budget adjustment preserves the current validated session as a return point. Applying changed policies requires an explicit preview and recompilation. Compatible selections, checked items, drafts, expanded choices, completed steps, and the original start time are reconciled by application-owned IDs; incompatible values are not silently transferred.

## Motion contract

The shared tokens remain:

| Token | Use |
|---|---|
| `0ms` | focus restoration and immediate validation |
| `120ms` | control press, selection, local feedback |
| `180ms` | disclosures, inspector, step changes |
| `280ms` | screen-state transitions and completion |
| `420ms` | reserved full-scene handoff; not used to imply compiler progress |

Only changing content animates. The shell and action dock remain stable. No springs, bounce, parallax, ambient loops, fake percentage, or delayed control availability are permitted. Under `prefers-reduced-motion: reduce`, nonessential transforms are removed and authored transitions complete in 1 ms.

## Code Connect status

Code Connect is **not configured for this branch**. This document maps canonical nodes to production sources directly and does not claim a Code Connect relationship exists. Files are consolidated where that preserves reducer and runtime clarity; source files are not split merely to imitate Figma frame metadata.

## Release evidence

The release gate must prove:

- receipt-origin and direct-entry behavior
- deterministic M05 adaptation copy for every policy state
- Cancel and End Mode during compilation, including late-response protection
- exhaustive application-owned step labels
- both progressive-disclosure modes and keyboard operation
- M11 semantics, focus, Escape, and causal copy
- M12 closure hierarchy, copied/downloaded canonical output, cleanup, refresh, and once-only telemetry
- M13 no-request recovery
- 320 px, 390 × 844, tablet, and 1440 × 900 layouts
- 200% zoom and reduced motion
- exact evidence validation, no raw-source persistence, four-hour expiry, and FIELD–001 regression integrity
