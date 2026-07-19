# Carry Forward Figma integration contract

> **Figma defines the interaction rights. TypeScript encodes them. The validator enforces them. GPT-5.6 operates only inside them.**

**Status:** Implemented Build Week contract. The current branch maps the approved Figma interaction rights into the reducer, strict plan boundary, responsive runtime, inspector, and focused release gates described below.

## Canonical design source

Figma file:

<https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?type=design>

The file contains:

- visual and behavioral foundations
- reusable component sets
- fifteen canonical mobile states
- five desktop reference boards
- failure, privacy, expiry, and recovery states
- motion and reduced-motion contracts
- engineering state and data contracts
- QA and release gates
- a clickable judge prototype

## Source-of-truth hierarchy

1. Domain schema defines what the model may propose.
2. Application validation determines what becomes trusted.
3. The reducer owns the workflow state.
4. Typed React components own rendering and interaction.
5. Figma defines visual, motion, responsive, accessibility, and user-control contracts.
6. Tests prove that the implementation preserves those contracts.

Generated Figma code is reference material. It must not be copied literally when it conflicts with the repository's existing stack, CSS system, semantic markup, or accessibility requirements.

## Decisions resolved during design audit

### One feature route

Use one browser-level route:

```text
/carry-forward
```

The browser route marks the feature boundary. Internal input, budget, preview, compiling, active, explaining, completion, fallback, and expired views are reducer states.

Do not require a browser route for every internal screen.

### Four-hour default expiry

The default task window is four hours.

All user-facing time copy must be derived from `expiresAt`. Static design examples may show four hours, but production must not hard-code the remaining duration.

### Fewer decisions versus optional work

The policies are distinct:

- **Fewer decisions** collapses secondary choices behind **Show all choices**.
- **Defer optional work** moves whole nonrequired activities behind **Later**.

A collapsed choice must not be described as deleted or as optional work deferred.

### Application-derived evidence offsets

GPT-5.6 proposes:

```ts
interface ProposedExtractedFact {
  value: string
  sourceId: string
  evidenceQuote: string
}
```

The application finds one exact, unique quote match and derives:

```ts
interface ExtractedFact extends ProposedExtractedFact {
  startOffset: number
  endOffset: number
}
```

Reject missing and ambiguous quotes. Do not ask the model to count offsets.

### Fixture-first runtime

Build the complete runtime against authored `ValidatedTaskPlan` fixtures before connecting the live model compiler.

The product UI, responsive behavior, focus handling, storage, expiry, failure recovery, and visual regression suite must remain testable without network access.

## Figma component map

| Figma node | Component set | Production target |
|---|---|---|
| `6:21` | Action Button | `ActionButton.tsx` |
| `7:36` | Input Field | `CarryForwardField.tsx` |
| `8:17` | Interaction Policy | `InteractionPolicyCard.tsx` |
| `8:86` | Status Banner | `StatusBanner.tsx` |
| `9:61` | Task Progress | `TaskProgress.tsx` |
| `9:98` | Task Step Shell | `TaskStepShell.tsx` |

Application-owned supporting primitives:

- `ChoiceOption`
- `EvidenceFact`
- `ActionDock`
- `RuntimeLinks`
- `CompilePhaseList`
- `InspectorSheet`
- `DeferredItem`
- `CompletionProof`

Model-addressable step kinds remain limited to:

- `ReadStep`
- `ChoiceStep`
- `ComposeStep`
- `ChecklistStep`
- `ReviewStep`

## CSS integration

Create:

```text
src/carry-forward/carry-forward.css
```

Extend the current Bad Day Receipt CSS system. Do not install Tailwind to reproduce the generated Figma reference code.

```css
.carry-forward-shell {
  --bdr-text-primary: var(--ink);
  --bdr-text-secondary: var(--muted);
  --bdr-text-inverse: var(--paper);

  --bdr-background-canvas: #d7d3ca;
  --bdr-background-surface: #e3e0d8;
  --bdr-background-panel: var(--paper);
  --bdr-background-inverse: var(--ink);

  --bdr-action-signal: var(--signal);
  --bdr-border-default: #9a968d;
  --bdr-border-strong: var(--ink);

  --cf-control-min-height: 48px;
}
```

Reuse the existing DM Mono and Instrument Serif imports and the current ink, paper, signal, and muted primitives.

Do not inherit the existing hover translation used by `.choice-chip` inside One Thing Mode. Carry Forward controls remain spatially stable.

## Semantic markup contract

Use ordinary, native interaction semantics:

- `<button>` for actions
- `<fieldset>` and `<legend>` for choice groups
- native radio and checkbox inputs
- associated labels for every field
- `<textarea>` for source and draft content
- live regions for compiling, validation, autosave, copy, and failure status
- dialog or sheet semantics for **Why This View** and **Complete Plan**

Do not use clickable `div` elements, image-based radio controls, or hover-only meaning.

## State ownership

Use one pure reducer:

```ts
type CarryForwardState =
  | InputState
  | BudgetState
  | PreviewState
  | CompilingState
  | ActiveState
  | ExplainingState
  | CompleteState
  | FallbackState
  | ExpiredState
```

The reducer contains no fetch, storage, clipboard, navigation, analytics, or timer effects.

Effects are explicit adapters:

```text
compileTask()
persistSession()
clearSession()
copyOutput()
scheduleExpiry()
```

Each adapter returns a success or failure event to the reducer.

## Trusted rendering boundary

Use a branded validated type:

```ts
declare const validatedTaskPlanBrand: unique symbol

export type ValidatedTaskPlan = TaskPlan & {
  readonly [validatedTaskPlanBrand]: true
}
```

Only the validator constructs this type.

The production runtime accepts `ValidatedTaskPlan`, never raw model output or a plain `TaskPlan`.

## Responsive ownership

Mobile is canonical.

- `320–767px`: one column, one scroll owner, bottom action dock
- `768–1099px`: centered task column, collapsible context, sticky progress
- `1100px+`: task rail plus active workspace

Use one reducer state and one component tree. CSS rearranges the same information.

Desktop may not remove:

- Show Complete Plan
- Why This View
- Adjust
- End Mode
- collapsed or deferred content
- manual recovery

## Motion contract

| Token | Purpose |
|---|---|
| `0ms` | focus restoration and immediate validation state |
| `120ms` | press, selection, local feedback |
| `180ms` | step change and sheet fade |
| `280ms` | mode entry and completion |
| `420ms` | reserved full-scene handoff |

Rules:

- Motion begins after the target state passes validation.
- Never animate toward a state that may still be rejected.
- Keep the task shell spatially stable.
- Do not use springs, pulsing wellness animation, breathing loops, confetti, animated blur, or layout thrash.
- Reduced motion removes translation while preserving every state cue.
- Loading labels may change, but control width must not shift.

The Figma prototype uses a timeout only to simulate successful compilation. Production advances after response completion, parsing, validation, evidence verification, persistence, and reducer commit.

## Prototype flows

The clickable prototype has four named starting points:

1. Carry Forward · Judge Path
2. Carry Forward · Ambiguous Task Recovery
3. Carry Forward · Compiler Failure
4. Carry Forward · Expired Session

The happy path includes a wired **Complete Plan** overlay. **Why This View** and **Complete Plan** must preserve task state and restore focus to their trigger.

## Text hierarchy

- 10px is reserved for nonessential machine metadata.
- Quiet actions use at least 11–12px visible text with a 48px target.
- Instructional body copy uses at least 13px.
- Operational controls do not rely on Instrument Serif.
- Display typography may remain editorial, but controls remain legible and predictable.

## Recommended implementation sequence

1. Domain schema and branded validated type
2. One route, reducer, effect adapters, and expiring store
3. CSS aliases and production primitives
4. Fixture-backed M01–M15 states
5. Responsive arrangements
6. Keyboard, focus, recovery, and reduced motion
7. GPT-5.6 compiler
8. Exact evidence verification and plan enrichment
9. Failure and expiry fixtures
10. Code Connect mappings
11. Visual and end-to-end release gate

## Code Connect

After component source paths stabilize, map the six canonical Figma component sets to their React implementations.

Do not map entire screens or presentation boards. Code Connect should expose the reusable interface grammar.

## Release evidence

A release is blocked if any of these disagree:

- Figma
- TypeScript contracts
- runtime state behavior
- CSS and responsive behavior
- tests
- privacy documentation
- README
- demo narration

Required proof includes:

- visual regression for canonical mobile and desktop states
- keyboard and screen-reader paths
- 200% zoom and viewport matrix
- reduced-motion behavior
- exact evidence verification
- no raw task content in analytics or logs
- four-hour expiry consistency
- direct test access to ambiguous, fallback, and expired states
- no compile transition before validation succeeds

## Related issues

- #62 Carry Forward epic
- #63 domain contracts
- #64 feature route, reducer, and storage
- #67 validation and evidence verification
- #68 deterministic runtime
- #72 accessibility and motion hardening
- #74 vertical slice and release gate
- #77 Figma production component contract
