# Bad Day Receipt · Carry Forward

> **Document what the day cost. Carry one thing forward.**

Bad Day Receipt is an emotional documentation machine for days that required more than the visible record shows.

The shipped receipt machine turns invisible effort into a physical-feeling artifact. **Carry Forward**, the OpenAI Build Week extension implemented on this branch, gives that artifact a practical consequence: the user chooses one remaining obligation and opens **One Thing Mode**, a temporary interface containing only the steps and decisions required to finish it.

Software usually asks people to continue as though nothing happened.

Carry Forward lets the next task respond.

<p align="center">
  <a href="https://bad-day-receipt.vercel.app"><strong>Open the live receipt machine</strong></a>
  ·
  <a href="./docs/carry-forward.md">Carry Forward specification</a>
  ·
  <a href="./docs/build-week.md">Build Week record</a>
</p>

> **Project status**  
> The receipt machine is live. The Carry Forward vertical slice is implemented and testable on this branch with Codex and GPT-5.6. Hosted availability still depends on deploying the branch with a funded OpenAI project key.

---

## At a glance

| | |
|---|---|
| **Track** | Apps for Your Life |
| **Existing product** | Local-first emotional receipt and artifact machine |
| **Build Week contribution** | Carry Forward and the Minimum Necessary Interface runtime |
| **Required model** | GPT-5.6 through the OpenAI Responses API |
| **Model responsibility** | Compile an unstructured obligation into a constrained task plan |
| **User experience** | One Thing Mode |
| **Engineering primitive** | Interaction Budget |
| **Reference task** | Prepare a response to a difficult insurance email |
| **Automatic external actions** | None |
| **Emotion detection** | None |

---

## The problem

A difficult day can temporarily reduce how much attention, working memory, decision making, and emotional effort a person has available.

The next interface usually does not care.

Bad Day Receipt already creates recognition:

> This day required more than the record shows.

Carry Forward adds practical relief:

> The next task should not continue demanding full capacity.

The intended audience is anyone completing consequential personal administration during temporary cognitive overload, including difficult messages, insurance correspondence, medical bills, appointment decisions, appeals, and forms.

No diagnosis is required.

---

## What exists today

The live receipt machine can:

* Build a receipt from common forms of modern psychic damage
* Credit tiny acts of care and survival
* Add custom charges and wins
* Calculate a completely legitimate 8.5% emotional tax
* Generate a verdict from the final total
* Render five distinct receipt-paper systems
* Export completed receipts as shareable image artifacts
* Preserve drafts, preferences, interrupted prints, and receipt history locally
* Recover safely after refreshes or interrupted printing
* Run as an installable progressive web app with offline support
* Respect reduced motion and support keyboard and screen reader flows
* Hand completed receipts to the Dojo Archive as summarized artifacts
* Support the LD-001 field-object experiment and its operational analytics

### Receipt papers

* **Original Thermal**
* **CVS Catastrophe**
* **Government Breakdown**
* **Luxury Emotional Invoice**
* **Victorian Pharmacy**

CVS Catastrophe is an unofficial parody. No brand has endorsed this emotional incident.

---

## What Build Week adds

After printing a receipt, the user can select:

> **CARRY ONE THING FORWARD**

They name one remaining obligation, optionally paste the source material it depends on, and declare what the next interface should ask less of.

### Interaction Budget

The user may request:

* **One step at a time**
* **Fewer decisions**
* **Protect my progress**
* **Defer optional work**

These are explicit user requests, not emotional conclusions reached by the model.

### One Thing Mode

GPT-5.6 compiles the task into a strict `TaskPlan`.

The application validates the plan and renders it through a fixed React component system as One Thing Mode.

The result is not a chatbot.

It is a temporary, task-specific interface.

---

## Product loop

```text
DOCUMENT
What did today require?
        ↓
PRINT
Create the receipt.
        ↓
CARRY FORWARD
Choose one remaining obligation.
        ↓
DECLARE
What should this task ask less of?
        ↓
COMPILE
GPT-5.6 creates a typed task plan.
        ↓
VALIDATE
Hard application rules fail closed.
        ↓
RENDER
One Thing Mode presents a stable interface.
        ↓
COMPLETE
Review, copy, or download the work.
        ↓
EXPIRE
Delete the temporary task context.
```

**Recognition → Agency → Relief → Closure**

---

## Why GPT-5.6 is necessary

The product cannot predesign a separate interface for every possible obligation.

A task may contain unstructured instructions, irrelevant details, actual decision points, optional work, missing information, facts that must be preserved, and draft content requiring review.

GPT-5.6 may:

* Identify the goal and completion condition
* Separate essential steps from optional work
* Identify meaningful decisions
* Extract facts from supplied source material
* Attach exact source evidence to extracted facts
* Draft bounded content
* Produce a plan using approved step types

GPT-5.6 may not:

* Diagnose the user
* Estimate emotional severity
* Choose the Interaction Budget
* Render executable markup
* Browse or access accounts
* Send, submit, purchase, or delete
* Introduce unsupported deadlines
* Perform irreversible actions

**The model proposes structure. The application controls behavior.**

---

## Architecture

```text
User task
    +
Optional source context
    +
User-declared Interaction Budget
    ↓
GPT-5.6 task compiler
    ↓
Strict TaskPlan JSON
    ↓
Application validator
    ↓
Typed React components
    ↓
Stable One Thing Mode
```

No model-generated HTML enters the DOM.

No model output controls layout, routing, persistence, or application actions.

The compiler receives no tools because it does not need tools.

### Minimum Necessary Interface

A **Minimum Necessary Interface** contains the smallest complete set of information, decisions, and actions required to finish one user-selected task.

It is:

1. Task scoped
2. User authorized
3. Temporary
4. Predictable
5. Reversible
6. Progress preserving
7. Rendered from constrained components
8. Free from covert emotional inference

The goal is not minimum visibility.

The goal is the minimum **complete** path.

---

## Hard rules and evaluations

Structured model output constrains the shape of a proposed plan. The application still applies product-specific validation after parsing.

### Machine-enforced invariants

* One to five approved step types
* No more than three options in a choice step
* Concrete completion definition
* No executable markup
* No external side-effect actions
* Exact source substring verification for extracted evidence
* Full plan, edit, cancel, and exit controls outside model control
* Stable layout during the task
* Unknown or malformed output rejected
* Separate expiring task storage

### Evaluation questions

Semantic quality is measured rather than falsely guaranteed:

* Is the task path complete?
* Did the model invent an obligation?
* Was a required step deferred?
* Is optional work actually optional?
* Is the completion definition useful?
* Did the plan introduce unsupported advice?

See the full [Carry Forward specification](./docs/carry-forward.md).

---

## Declared load, not detected emotion

Bad Day Receipt takes a deliberately narrow position on adaptive software:

> **Declared load, not detected emotion.**

The product uses no camera, facial analysis, heart rate, sentiment classification, attention detection, behavior-based capacity score, or permanent psychological profile.

The person states what would help.

The interface adapts to that request.

---

## User control and failure behavior

Every adaptation must be previewed, explicitly approved, stable, explainable, reversible, and temporary.

The user always retains access to:

* Show complete plan
* Show all choices
* Edit
* Go back
* End One Thing Mode
* Clear task data

Nothing is sent automatically.

If GPT-5.6 is unavailable, refuses the request, returns incomplete output, or produces a plan that fails validation, the invalid plan is never rendered. After at most one validation retry, the product opens a manual one-task workspace.

AI failure must not become product failure.

---

## Build Week status

### Existing foundation

* [x] Deterministic printer state machine
* [x] Committed receipt snapshots
* [x] Local draft and history persistence
* [x] Interrupted-print recovery
* [x] Responsive mobile instrument shell
* [x] Reduced-motion behavior
* [x] Image artifact export
* [x] Progressive web app and offline support
* [x] Unit, browser, accessibility, viewport, and visual test scripts

### Carry Forward

* [x] Carry Forward entry points
* [x] Task and source-context input
* [x] Four user-declared policies
* [x] Adaptation preview
* [x] GPT-5.6 Responses API compiler
* [x] Strict `TaskPlan` schema
* [x] Application validator
* [x] Typed task-step renderer
* [x] One Thing Mode runtime
* [x] Complete Plan & Why inspector
* [x] Separate expiring task storage
* [x] Refresh recovery
* [x] Manual fallback
* [x] Insurance-denial fixture
* [x] Complete reference-task browser test

Competition claims should match the checked state at submission time.

---

## Judge path

The final contribution is designed to be understood in under one minute:

1. Print a Bad Day Receipt.
2. Select **Carry One Thing Forward**.
3. Load the insurance-email fixture.
4. Select **Fewer decisions** and **Protect my progress**.
5. Preview the adaptation.
6. Generate One Thing Mode.
7. Complete one meaningful decision.
8. Review the prepared response.
9. Open **Why This View**.
10. Copy the finished response.

The demo must make four things visible immediately:

* What existed before Build Week
* What was added during Build Week
* Why GPT-5.6 is necessary
* Why the result is not a chatbot

---

## Privacy

### Current receipt machine

Receipt line items, drafts, history, preferences, and interrupted-print state are stored in the browser’s local storage.

The deployed site also uses Vercel Analytics and a narrow Supabase telemetry path for the LD-001 field experiment. Those events contain operational metadata such as event type, field edition, placement, source, viewport class, and pseudonymous session or visitor identifiers.

They do not include receipt line items, custom receipt text, totals, exported images, or emotional narratives.

The accurate claim is:

> Receipt content is local-first. Limited operational interaction telemetry is collected for the field experiment.

### Carry Forward privacy contract

* Task context is sent only after explicit assisted-compilation consent
* The OpenAI API key remains server side
* Raw task context is excluded from receipt history, exports, analytics, and FIELD telemetry
* Request bodies are not logged by the application
* Source text is treated as untrusted data
* Model output is validated before rendering
* Temporary task state has a separate storage lifecycle
* Full source context is discarded after successful compilation
* The user can clear the task immediately

The server request uses `store: false`. The interface does not describe this as a universal zero-retention guarantee.

---

## How Codex is being used

Codex is being used to:

* Map the existing architecture before modification
* Identify clean route and persistence boundaries
* Scaffold Carry Forward modules
* Translate the product contract into TypeScript and schema definitions
* Build validation and failure-path tests
* Generate adversarial fixtures
* Trace recovery and expiry edge cases
* Audit keyboard, reduced-motion, and screen-reader behavior
* Review request handling and privacy boundaries
* Maintain the Build Week implementation record

The human builder remains responsible for:

* The product thesis and interaction model
* Declared load instead of detected emotion
* The no-tools compiler boundary
* The prohibition on automatic submission
* The typed-plan architecture
* The distinction between hard invariants and semantic evaluations
* The adaptation preview and stable-layout requirements
* The task-data lifecycle
* Final product and engineering judgment

Before submission, this section and [`docs/build-week.md`](./docs/build-week.md) will include the primary Codex `/feedback` Session ID and the Build Week commit range.

---

## OpenAI implementation contract

Carry Forward is designed around current OpenAI guidance:

* GPT-5.6 through the Responses API
* Structured Outputs for the typed plan
* Application-level validation after parsing
* No model tools for this workflow
* Input and output limits
* Refusal and incomplete-output handling
* Human review for consequential content
* Prompt-injection fixtures and representative evals
* Server-side credentials
* Accurate data-handling disclosures

Official references:

* [Models and GPT-5.6](https://developers.openai.com/api/docs/models)
* [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
* [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
* [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
* [Data controls](https://developers.openai.com/api/docs/guides/your-data)
* [Evals](https://developers.openai.com/api/docs/guides/evals)

---

## Run locally

### Requirements

* Node.js compatible with Vite 8
* npm

### Install and start

```bash
npm install
npm run dev
```

### Build and preview

```bash
npm run build
npm run preview
```

### Validation

```bash
npm run typecheck
npm test
npm run test:e2e
npm run test:accessibility
npm run test:viewports
npm run test:visual
npm run analyze
npm run release:carry-forward
```

Create an ignored `.env.local` file for the server-only compiler key:

```bash
OPENAI_API_KEY=your_project_key
```

The browser never receives this value. `api/compile-task.ts` is the only OpenAI call boundary.

---

## Stack

### Current application

React 19, TypeScript, Vite 8, Vitest, Playwright, axe-core, Canvas-based artifact export, progressive web app service worker, Vercel Analytics, and Supabase edge-function telemetry for the field experiment.

### Carry Forward additions

OpenAI JavaScript SDK, GPT-5.6, Responses API, Structured Outputs, runtime schema validation, typed task-step rendering, and a product evaluation harness.

---

## Scope and limitations

The Build Week submission implements one complete vertical slice:

> **Prepare and submit an insurance denial appeal.**

It will not include connected accounts, automatic submission, browser extensions, biometrics, sentiment scoring, permanent user profiles, cross-application preference exchange, multiple agents, or model-generated HTML.

Carry Forward cannot guarantee that every generated plan represents the objectively perfect minimum path. Schema enforcement can guarantee shape and prohibited operations. Semantic quality still requires representative evaluations and user review.

The project does not provide medical, legal, insurance, or financial advice. It is not clinically validated or an accessibility certification. It does not claim to have invented simplified or adaptive interfaces.

The contribution is the product demonstration of a **user-declared, temporary, task-specific Minimum Necessary Interface**.

---

## Documentation

* [`docs/carry-forward.md`](./docs/carry-forward.md)  
  Product, interaction, architecture, privacy, and evaluation specification.

* [`docs/build-week.md`](./docs/build-week.md)  
  Preexisting baseline, competition delta, Codex evidence, judge path, and final checklist.

* [`docs/releases`](./docs/releases)  
  Existing release notes for the receipt machine and field-object system.

---

## License

MIT. See [`LICENSE`](./LICENSE).

---

<p align="center">
  <strong>Software usually asks you to continue as though nothing happened.</strong>
  <br />
  Carry Forward lets the next task respond.
</p>
