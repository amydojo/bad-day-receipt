# Carry Forward

## Hardened product and engineering specification

> **Document what the day cost. Carry one thing forward.**

**Status:** Implemented Build Week vertical slice. Unchecked submission and research work remains future work; the production contract below is enforced by the current branch.

---

## 1. Product thesis

Bad Day Receipt currently creates recognition:

> This day required more than the record shows.

Carry Forward creates practical relief:

> The next task should not continue demanding full capacity as though nothing happened.

After producing a receipt, the user may take one remaining obligation and convert it into **One Thing Mode**, a temporary interface containing only the information, decisions, and actions necessary to complete that task.

The receipt does not prove that the person deserves support.

It provides continuity between what happened and what still needs doing.

---

## 2. Executive decisions

| Earlier direction | Decision |
|---|---|
| Emotional receipt | Keep as the emotional and visual core |
| Traceable Intake | Remove as the flagship; retain only as a possible later intake pattern |
| Redeem Receipt | Rename to Carry Forward |
| Capacity Pass | Remove from the primary user experience |
| Cross-application adaptation | Retain as future platform direction, not current utility |
| Generic gentle mode | Replace with task-specific One Thing Mode |
| AI interpreting capacity | Reject |
| User declaring interaction needs | Keep |
| AI generating receipt language | De-emphasize |
| AI compiling a task-specific interface | Make the primary GPT-5.6 contribution |

### Flagship contribution

A **Minimum Necessary Interface** is a temporary interface containing the smallest complete set of information, decisions, and actions required to finish one user-selected task.

It is:

1. Task scoped
2. User authorized
3. Temporary
4. Predictable
5. Reversible
6. Progress preserving
7. Generated from constrained components
8. Free from covert emotional inference

The user-facing name is **One Thing Mode**.

The engineering primitive beneath it is an **Interaction Budget**.

---

## 3. Product position

### Bad Day Receipt

An emotional documentation machine for days that cost more than they appear to.

### Carry Forward

A postreceipt action that turns one remaining obligation into One Thing Mode.

### One Thing Mode

A temporary Minimum Necessary Interface for completing one task.

### Interaction Budget

A private, user-declared set of constraints governing how One Thing Mode may behave.

### Affective Interface Engineering contribution

> **Declared load, not detected emotion.**

> **Task-scoped adaptation, not permanent profiling.**

---

## 4. Complete product loop

```text
DOCUMENT
What did today require?
        ↓
PRINT
Create an emotionally accurate receipt.
        ↓
CARRY FORWARD
What is one thing that still needs doing?
        ↓
DECLARE
What should this interface ask less of?
        ↓
COMPILE
GPT-5.6 creates a constrained task plan.
        ↓
VALIDATE
The application applies hard runtime rules.
        ↓
RENDER
Typed components create One Thing Mode.
        ↓
COMPLETE
Copy, export, or finish the prepared task.
        ↓
EXPIRE
Delete the temporary interaction budget and task context.
```

The intended emotional arc is:

### Recognition

What happened counted.

### Agency

The person decides what support would help.

### Relief

The next interaction demands less.

### Closure

One remaining obligation becomes finishable.

---

## 5. User experience

### Entry points

The completed receipt receives one new primary action:

> **CARRY ONE THING FORWARD**

Carry Forward must also be available directly from the main machine.

The receipt is an emotional bridge, not an accessibility gate.

### Step 1: Name the remaining obligation

```text
WHAT STILL NEEDS DOING?
One thing is enough.
```

Example task:

> Reply to the insurance denial email.

The user may optionally paste context:

> Paste the email or instructions the task depends on.

The product supports one task at a time.

### Step 2: Declare the Interaction Budget

The interface asks:

```text
WHAT SHOULD THIS TASK ASK LESS OF?
```

Four plain controls:

#### One step at a time

Show only the current step and the next clear action.

#### Fewer decisions

Limit active choices and defer nonessential selections.

#### Protect my progress

Save the validated plan, selections, and draft locally.

#### Defer optional work

Move anything not required for completion behind **Later**.

These are user requests, not inferred conditions.

The user may select all four, some, or none.

One Thing Mode always produces a task-scoped plan. The selected policies modify how the plan is presented and preserved.

### Step 3: Preview the adaptation

Before anything changes:

```text
ONE THING MODE WILL:
• show one active step at a time
• preserve your draft
• defer three optional decisions
• require your approval before the final action

Nothing will be sent automatically.
```

Actions:

* **Begin One Thing Mode**
* **Adjust**
* **Cancel**

The preview is required for predictability and informed authorization.

### Step 4: Compile the interface

GPT-5.6 receives:

1. The user-selected task
2. Optional source context
3. The selected interaction policies
4. A strict component schema
5. Scope and safety constraints

It produces a task plan, not arbitrary HTML.

Loading state:

```text
PREPARING THE MINIMUM NECESSARY INTERFACE…
```

Fallback state:

```text
ASSISTED PLANNING IS UNAVAILABLE
Continue with the manual one-task workspace.
```

The product must remain usable when the API is unavailable.

### Step 5: One Thing Mode

The task is rendered using a fixed component system.

Example:

```text
REPLY TO INSURANCE
STEP 1 OF 4

What outcome do you need?

○ Ask for the denial to be reconsidered
○ Ask what documentation is missing
○ Ask for a written explanation

[ CONTINUE ]

SHOW COMPLETE PLAN
WHY THIS VIEW
END ONE THING MODE
```

A later step may surface extracted facts:

```text
STEP 2 OF 4
Review the essential facts.

Policy number: …
Denial date: …
Requested outcome: reconsideration

[ EDIT FACTS ]
[ CONTINUE ]
```

Then a bounded draft:

```text
STEP 3 OF 4
Review the draft.

[ editable draft ]

SAVED ON THIS DEVICE

[ CONTINUE ]
```

Final review:

```text
STEP 4 OF 4
Nothing will be sent automatically.

[ COPY RESPONSE ]
[ DOWNLOAD CHECKLIST ]
```

There is no automatic sending, account access, or external side effect.

### Step 6: Completion

```text
ONE THING CLOSED

Your response was copied.
Your temporary task context will expire in four hours.

[ RETURN TO RECEIPT ]
[ CLEAR NOW ]
```

The receipt may receive a small annotation:

```text
CARRIED FORWARD
ONE OBLIGATION PREPARED
```

This closes the loop without adding a new dashboard.

---

## 6. GPT-5.6 responsibility

GPT-5.6 must not:

1. Diagnose the person
2. Estimate emotional severity
3. Decide whether support is deserved
4. Select the Interaction Budget
5. Hide interface content directly
6. Render executable HTML
7. Send messages
8. Submit forms
9. Create unsupported deadlines
10. Add new obligations
11. Access external accounts
12. Execute tools

GPT-5.6 may:

1. Identify the minimum complete path through a task
2. Separate essential and optional steps
3. Identify actual decision points
4. Draft bounded content when requested
5. Extract facts from supplied source material
6. Attach source evidence to extracted facts
7. Produce a strict typed plan

The model compiles an interaction plan.

The application decides how that plan is validated, displayed, and enforced.

---

## 7. Data contracts

### Interaction Budget

```ts
export interface InteractionBudget {
  version: '0.1'
  id: string
  createdAt: string
  expiresAt: string
  taskId: string
  policies: {
    oneStepAtATime: boolean
    maxVisibleChoices: 1 | 2 | 3
    preserveProgress: boolean
    deferOptional: boolean
  }
  invariants: {
    noAutomaticSubmission: true
    showFullPlanAvailable: true
    reversible: true
    stableLayout: true
  }
  provenance: {
    declaredBy: 'user'
    receiptId?: string
  }
}
```

The budget contains no:

* Diagnosis
* Mood
* Emotional score
* Medical classification
* Personal narrative
* Inferred psychological state

### Task Plan

```ts
export interface TaskPlan {
  version: '0.1'
  id: string
  title: string
  goal: string
  completionDefinition: string
  steps: TaskStep[]
  deferred: DeferredItem[]
  extractedFacts: ExtractedFact[]
}

export type TaskStep =
  | ReadStep
  | ChoiceStep
  | ComposeStep
  | ChecklistStep
  | ReviewStep
```

### Step types

```ts
export interface BaseStep {
  id: string
  title: string
  essential: boolean
}

export interface ReadStep extends BaseStep {
  kind: 'read'
  body: string
}

export interface ChoiceStep extends BaseStep {
  kind: 'choice'
  prompt: string
  options: Array<{
    id: string
    label: string
  }>
}

export interface ComposeStep extends BaseStep {
  kind: 'compose'
  prompt: string
  starterText?: string
}

export interface ChecklistStep extends BaseStep {
  kind: 'checklist'
  items: string[]
}

export interface ReviewStep extends BaseStep {
  kind: 'review'
  summary: string
}
```

The model contract declares only `plain_text` output. Copy, download, and the fixed download filename are application-owned controls and never model-authored fields.

### Deferred work

```ts
export interface DeferredItem {
  label: string
  reason: 'optional' | 'not-needed-for-current-goal'
}
```

### Extracted facts and evidence

```ts
export interface ProposedExtractedFact {
  id: string
  label: string
  value: string
  sourceId: string
  evidenceQuote: string
}

export interface ExtractedFact extends ProposedExtractedFact {
  startOffset: number
  endOffset: number
}
```

The server verifies:

```ts
evidenceQuote.includes(value)
source.slice(startOffset, endOffset) === evidenceQuote
```

The evidence quote is not trimmed or normalized. CRLF, LF, Unicode, punctuation, and whitespace are verified against the exact submitted representation.

No model-generated markup enters the DOM.

Every accepted result is rendered through typed React components.

---

## 8. Validation model

Structured output guarantees shape only when the model successfully returns schema-compatible output.

The application validator must separately enforce product rules.

### Hard runtime invariants

A plan is rejected unless all of the following are true:

| Rule | Requirement |
|---|---|
| Step count | Between one and five |
| Choice count | No more than three options per choice step |
| Completion | A concrete nonempty completion definition exists |
| Side effects | No automatic send, submit, purchase, delete, or account action |
| Evidence | Every extracted source fact has an exact source match |
| Rendering | Every step uses an allowed component type |
| Markup | No executable markup or arbitrary UI description |
| Text length | Titles and prompts remain within interface limits |
| User control | Full plan, edit, cancel, and exit remain available outside model control |
| Runtime stability | The interface does not regenerate while the task is active |
| Safety | Unknown or malformed output fails closed |

The validator may retry once with machine-readable errors.

After one failed retry, the system opens the manual fallback.

### Evaluation assertions

The following are semantic quality questions, not deterministic guarantees:

* Is the path complete?
* Did the model add an obligation?
* Is deferred work truly optional?
* Did the model hide a required step?
* Is the completion definition sufficient?
* Is the draft useful and faithful to the requested goal?

These properties must be measured through representative fixtures and human review.

---

## 9. Minimum Necessary Interface runtime

The runtime accepts:

```text
InteractionBudget + Validated TaskPlan
```

It returns:

```text
Stable One Thing Mode
```

### Focus

Render the active step and one clear next action.

### Choice control

Limit active choices according to `maxVisibleChoices`.

Additional choices remain available through **Show all choices**.

### Progress protection

Persist the validated plan, current step, user selections, and user-created draft.

### Deferral

Place optional work in **Later**. Never silently delete it.

### Recovery

Restore the task after refresh and retain an undo path for local destructive actions.

### Explanation

Expose **Why This View**:

```text
ONE STEP IS VISIBLE
Requested policy: one step at a time

TWO OPTIONAL DECISIONS ARE DEFERRED
Requested policy: fewer decisions

YOUR DRAFT IS SAVED LOCALLY
Requested policy: protect my progress
```

### Expiry

Default expiry: **four hours**

Maximum expiry: **twenty-four hours**

The user may clear everything immediately.

---

## 10. Repository integration

Carry Forward should not become another branch inside the existing printer state machine.

### Route

```text
/carry-forward
```

The receipt remains intact and independently usable.

### Seed

```ts
export interface CarryForwardSeed {
  receiptId?: string
  createdAt: string
}
```

The seed must not contain raw emotional narrative or task context.

### Storage

Recommended key:

```text
bad-day-receipt:carry-forward:v1
```

The separate store contains only:

1. Expiring Interaction Budget
2. Validated Task Plan
3. User selections
4. User-created draft
5. Current step
6. Expiry time

Raw source context must not be placed inside the existing `PersistedMachineData`.

Full source context should be discarded after successful compilation.

The validated plan may retain only the minimum excerpts required to substantiate extracted facts until the task expires.

### Target file structure

```text
api/
└── compile-task.ts

src/
└── carry-forward/
    ├── carryForwardTypes.ts
    ├── interactionBudget.ts
    ├── taskPlanSchema.ts
    ├── validateTaskPlan.ts
    ├── carryForwardStorage.ts
    ├── carryForwardFallback.ts
    ├── CarryForwardEntry.tsx
    ├── InteractionBudgetEditor.tsx
    ├── PlanPreview.tsx
    ├── OneThingMode.tsx
    ├── WhyThisView.tsx
    ├── TaskStepRenderer.tsx
    └── steps/
        ├── ReadStep.tsx
        ├── ChoiceStep.tsx
        ├── ComposeStep.tsx
        ├── ChecklistStep.tsx
        └── ReviewStep.tsx

tests/
├── carry-forward/
└── e2e/

evals/
└── carry-forward/
```

---

## 11. Privacy and security

### Consent boundary

The application must not send task context until the user explicitly selects assisted compilation.

Raw task context must not be placed in:

* Receipt history
* FIELD telemetry
* Supabase event metadata
* Vercel Analytics
* Exported receipts
* Query parameters
* Client logs
* Error messages

### OpenAI request

The intended request uses the Responses API with:

```ts
store: false
```

This must not be described as a universal zero-retention guarantee.

Accurate user-facing disclosure:

```text
Assisted planning sends this task to OpenAI.
Bad Day Receipt does not add it to your receipt history,
FIELD records, or analytics.
OpenAI API data controls may retain content temporarily
for abuse monitoring unless additional retention controls are enabled.
```

### Server controls

1. Keep the API key server side
2. Never log raw request bodies
3. Limit input length
4. Apply bounded, instance-local rate limits and in-flight request-ID deduplication
5. Apply a fresh cancellation timeout to each of at most two model attempts
6. Use `store: false`
7. Do not enable background mode for this short interaction
8. Return generic server errors
9. Do not expose model output before validation
10. Treat pasted instructions as untrusted source data

### Prompt-injection boundary

The task compiler receives no tools.

It cannot:

* Browse
* Send
* Delete
* Purchase
* Access accounts
* Execute code
* Render arbitrary markup

Prompt injection can affect only a proposed typed plan, which must still pass schema and application validation.

---

## 12. Product evaluation harness

Create at least twenty authored fixtures before submission if time permits. A smaller high-quality set is preferable to a large ceremonial set.

### Task categories

| Category | Example |
|---|---|
| Difficult message | Reply to an insurance denial |
| Administrative request | Ask a clinic for a corrected bill |
| Small decision | Choose between two appointment times |
| Form preparation | Collect information required for an appeal |
| Shutdown | Preserve work and identify tomorrow’s first step |
| Ambiguous task | Deal with that email |
| Impossible task | Make them approve my claim |
| High-stakes request | Medical or legal correspondence |
| Sensitive information | Account numbers and health details |
| Prompt injection | Source email instructs the model to ignore rules |

### Automated checks

1. Schema validity
2. Step-count compliance
3. Choice-count compliance
4. Evidence-range validity
5. Unsupported-fact rate
6. Invented-deadline rate
7. Added-obligation rate
8. Required-step deferral
9. Prohibited side effects
10. Raw-context leakage
11. Runtime-policy compliance
12. Manual-fallback success
13. Keyboard completion
14. Screen-reader status announcements
15. Reduced-motion behavior
16. Refresh recovery
17. Expiry deletion
18. Idempotent completion

This is a product evaluation harness.

It is not clinical validation.

---

## 13. Human evaluation

A small comparative usability test may compare:

1. A standard compose interface
2. One Thing Mode

Each person completes the same difficult-message task in both conditions.

### Measures

| Measure | Question |
|---|---|
| Completion | Did the person produce a usable output? |
| Time to first action | How long before meaningful progress began? |
| Backtracking | How often did the person reverse or restart? |
| Perceived effort | How demanding did the interface feel? |
| Agency | Did the person feel in control? |
| Predictability | Did anything change unexpectedly? |
| Information safety | Was anything essential hidden? |
| Reuse intent | Would they use this after a draining day? |

Primary failure question:

> Did the focused interface remove or defer anything you actually needed?

Publish real results and limitations only.

Do not overgeneralize from a small study.

---

## 14. Build Week scope

### Build

1. Carry Forward action on the finished receipt
2. Direct Carry Forward entry from the machine
3. One-task input
4. Optional source-context input
5. Four user-declared interaction policies
6. Adaptation preview
7. GPT-5.6 task-plan compiler
8. Strict structured output
9. Application validator
10. Five typed step components
11. One Thing Mode runtime
12. Why This View inspector
13. Progress recovery
14. Expiry and immediate deletion
15. Manual fallback
16. Evaluation fixtures
17. One complete browser test

### Do not build

1. Browser extension
2. Gmail integration
3. Slack integration
4. Calendar integration
5. Cross-origin authentication
6. Public token exchange
7. Biometrics
8. Attention detection
9. Sentiment scoring
10. Persistent user profile
11. Generic SDK package
12. Multiple AI agents
13. Automatic submission
14. New receipt themes
15. Additional FIELD infrastructure

### Reference task

> **Prepare and submit an insurance denial appeal.**

The task is concrete, consequential, relatable, and demonstrates reading, deciding, composing, preserving progress, reviewing, and copying.

---

## 15. Judge path

The complete contribution should be understandable in under one minute:

1. Print a Bad Day Receipt.
2. Select **Carry One Thing Forward**.
3. Load the insurance-email fixture.
4. Select **Fewer decisions** and **Protect my progress**.
5. Preview the adaptation.
6. Generate One Thing Mode.
7. Complete one decision.
8. Review the generated draft.
9. Open **Why This View**.
10. Copy the finished response.

The judge should immediately understand:

1. What existed before Build Week
2. What was added during Build Week
3. Why GPT-5.6 is necessary
4. Why the output is not a chatbot
5. Why the interface remains user controlled
6. How this differs from generic adaptive UI

One visible rejection path should demonstrate that the validator is real.

Example:

```text
PLAN COULD NOT BE VERIFIED

An extracted fact did not match the supplied source.

Continue with the manual one-task workspace.
```

---

## 16. Positioning

### Human-facing

> **Document what the day cost. Carry one thing forward.**

### Product

Bad Day Receipt records invisible expenditure, then turns one remaining obligation into One Thing Mode: a temporary interface containing only the steps and decisions required to finish it.

### Technical

Carry Forward combines a user-declared Interaction Budget, a GPT-5.6 task-interface compiler, Structured Outputs, application-level validation, and a Minimum Necessary Interface runtime.

### Principle

> **Declared load, not detected emotion.**

> **Task-scoped adaptation, not permanent profiling.**

### Closing line

> Software usually asks you to continue as though nothing happened. Carry Forward lets the next task respond.

---

## 17. Claim discipline

This project should not claim to be:

* Guaranteed unprecedented
* Patentable by default
* Clinically validated
* A diagnostic product
* A universal accessibility solution
* The invention of simplified interfaces
* The invention of task-specific filtering
* A deterministic judge of semantic completeness

A defensible final claim is:

> Bad Day Receipt demonstrates a user-declared, temporary, task-specific Minimum Necessary Interface built from constrained model output.

That claim is ambitious enough.

It is also capable of surviving technical scrutiny.
