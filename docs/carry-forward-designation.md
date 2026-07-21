# Carry Forward designation

Issue: #84  
Parent: #79

This document describes the user-owned designation and recommended One Thing Mode preset that precede the physical Carry Forward ritual.

## Product invariant

Only the user decides what crosses from a completed receipt into Carry Forward.

The application never derives a task from:

- receipt line items
- total
- selected paper theme
- receipt status or verdict
- emotional wording
- interaction behavior
- inferred capacity or mental state
- model output

A model request is not involved in designation.

## Domain boundary

Receipt ending owns only the shared choice:

```text
documented
  └── Carry One Thing Forward
      └── carry-selected
```

`carry-selected` mounts the independent designation domain. Receipt-ending state continues to contain only the frozen receipt and never receives task or source text.

The designation reducer owns:

```text
choosing explicit suggestion(s)
  or editing manual obligation
        ↓ explicit confirmation
optional source context
        ↓
recommended preset
        ↔ policy customization
        ↓ explicit approval
ritual-ready
```

The designation reducer contains no storage, DOM access, React effects, analytics, navigation, compiler requests, or model output.

## Provenance contract

```ts
type RemainingObligation = {
  text: string
  source:
    | 'explicit-current-input'
    | 'explicit-prior-input'
    | 'authored-demo-fixture'
    | 'manual'
  confirmedByUser: boolean
}
```

`confirmedByUser` remains false until a user selects a suggestion or confirms a manual field.

The runtime provenance parser accepts only explicit input collections. Its schema has no receipt, total, theme, verdict, emotional, behavioral, inferred-capacity, or model-output fields. Unsupported shapes yield no suggestion.

One valid explicit candidate appears as an unselected possible remaining thing. Several candidates appear as an unselected semantic radio group. No valid explicit candidate opens the native manual field immediately.

The current receipt workflow does not supply an implicit suggestion, so it begins with manual designation unless an explicitly authored candidate is provided by a future trusted intake boundary.

## Receipt-origin flow

```text
The day is documented
  → Carry One Thing Forward
  → What is still asking something from you?
  → explicit user designation
  → optional source
  → One Thing Mode preset
  → Issue Adjustment
  → ritual-ready
```

The completed receipt remains mounted throughout the designation. The designation domain is in memory only and does not mutate receipt-machine persistence.

## Direct route

When `VITE_THREE_ENDINGS=true`, `/carry-forward` uses the same designation components but begins with manual input and labels itself as direct entry. It never claims receipt continuity and creates an Interaction Budget with `receiptId: null`.

When the feature flag is disabled, `/carry-forward` continues to mount the existing `CarryForwardApp`, compiler, fallback, temporary session storage, and One Thing Mode runtime unchanged.

## Nothing After All

`NOTHING AFTER ALL`:

- resets designation-only state
- removes optional source from memory
- makes no network request
- changes no receipt content
- changes no private archive content
- makes no compiler call
- returns receipt-origin flow to `documented` without replaying the completion pause
- returns direct entry to the receipt application

It remains available before confirmation, after source entry, on the preset, and at the truthful ritual-ready boundary.

## Optional source

The collapsed disclosure reads:

```text
ADD SOURCE TEXT OR CONTEXT
```

Privacy copy:

```text
Source text is used only to prepare this task and is not added to receipt history.
```

Source text:

- uses the existing `TASK_PLAN_LIMITS.source` maximum
- remains optional
- is never written to receipt-machine storage
- is never written to receipt history
- is never added to receipt exports
- is never sent to analytics
- remains in memory when the disclosure collapses
- is cleared by Nothing After All

## Recommended preset

The primary path presents one explicit preset:

```text
ONE THING MODE

One active step
Fewer visible choices
Progress preserved
Nothing sent automatically
```

It uses the existing `DEFAULT_INTERACTION_POLICIES` and `createInteractionBudget`. The resulting object is validated by the existing `InteractionBudgetSchema`, contains the existing four-hour expiry, and remains compatible with the current compiler contract.

The main path does not require four separate policy choices. `CUSTOMIZE` opens the existing modal focus-management primitive and the existing `InteractionPolicyCard` controls. Closing the sheet returns focus to the Customize trigger.

## Ritual-ready boundary

`ISSUE ADJUSTMENT` is explicit approval of the typed budget. It transitions only to:

```text
The adjustment is ready to be issued.
Nothing has been compiled or applied yet.
```

At this boundary:

- the obligation is confirmed
- optional source remains in memory
- a typed Interaction Budget exists
- receipt origin is present only when truthful
- no stub has printed
- no paper has been torn or reinserted
- no actuator exists
- no Field Transfer exists
- `/api/compile-task` has not been called
- One Thing Mode has not started

#85 owns the physical Carry Forward ritual. #86 owns the in-tree compiler and runtime Apply boundary.

## Network boundary

The designation branch never imports `compileCarryForwardTask`, `startCarryForwardCompileRun`, or the OpenAI endpoint.

No request to `/api/compile-task` is legal during:

- suggestion display
- manual entry
- source entry
- preset review
- customization
- Issue Adjustment
- ritual-ready display

Browser tests install a compiler route guard and fail if that endpoint is requested.

## Storage and telemetry

Receipt-machine storage never receives:

- obligation text
- source text
- Interaction Budget
- generated plan
- compiler output

The designation implementation adds no telemetry emission. Existing feature-disabled Carry Forward telemetry and temporary-session behavior remain unchanged.

## Focus and accessibility

- native text input and label
- semantic suggestion buttons or radio choices
- no clickable `div`
- concise live validation error
- 44×44 minimum actions
- source disclosure uses `aria-expanded` and restores focus on collapse
- Customize uses the existing modal focus and return-focus behavior
- each semantic screen focuses one heading
- Nothing After All has one consistent accessible name
- reduced motion does not change logic

## Responsive ownership

One component tree supports:

```text
320×568
375×667
390×844
393×852
430×932
667×375
768×1024
1440×900
200% zoom
```

Short and landscape viewports scroll intentionally. Inputs, descriptions, and touch targets do not shrink to force the flow above the fold.

## Feature flag

```text
VITE_THREE_ENDINGS=true
```

enables receipt-origin designation and the new direct route.

Production remains disabled by default.

## Deferred scope

- #85: printed Carry stub, tear, reinsertion, actuator, detent, and Field Transfer
- #86: compiler invocation, validated Apply boundary, and in-tree One Thing Mode
- #87: exact interruption recovery
- #88: sensory and affective motion refinement
- #89: final accessibility and responsive audit
- #90: production visual parity and release gate

## Validation status

Provenance, reducer, component, browser, privacy, network-guard, accessibility, and visual fixtures are committed. GitHub-hosted execution remains unavailable while the monthly Actions allowance is exhausted. Vercel rate-limit rejection is reported separately from compilation failure. Browser certification is claimed only when assertions execute in an available browser environment.
