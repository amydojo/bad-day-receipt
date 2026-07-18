# Bad Day Receipt · Carry Forward

> **Document what the day cost. Carry one thing forward.**

Bad Day Receipt is an emotional documentation machine for days that required more than the visible record shows.

The shipped receipt machine turns invisible effort into a physical-feeling artifact. **Carry Forward**, the OpenAI Build Week extension now in development, gives that artifact a practical consequence: the user chooses one remaining obligation and opens **One Thing Mode**, a temporary interface containing only the steps and decisions required to finish it.

Software usually asks people to continue as though nothing happened.

Carry Forward lets the next task respond.

<p align="center">
  <a href="https://bad-day-receipt.vercel.app"><strong>Open the live receipt machine</strong></a>
  ·
  <a href="./docs/carry-forward.md">Read the Carry Forward specification</a>
  ·
  <a href="./docs/build-week.md">Build Week evidence and checklist</a>
</p>

> **Current status**  
> The receipt machine is live. Carry Forward is the Build Week extension being implemented with Codex and GPT-5.6. This README deliberately separates shipped behavior from planned behavior so judges can verify the actual project state.

---

## At a glance

| | |
|---|---|
| **Track** | Apps for Your Life |
| **Existing product** | Emotional receipt generator and local-first artifact machine |
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

An email composer, form, portal, or task manager continues presenting every option and every possible next action as though the preceding day had no effect.

Bad Day Receipt already creates recognition:

> This day required more than the record shows.

Carry Forward adds practical relief:

> The next task should not continue demanding full capacity.

The intended audience is anyone completing consequential personal administration during temporary cognitive overload, including difficult messages, insurance correspondence, medical bills, appointment decisions, appeals, and forms.

No diagnosis is required.

---

## What is already shipped

The current live product is a complete receipt-making experience.

It can:

* Build a receipt from common forms of modern psychic damage
* Credit tiny acts of care and survival
* Add custom charges and wins
* Calculate a completely legitimate 8.5% emotional tax
* Generate a verdict from the final total
* Render five distinct paper systems with different typography, language, and export treatment
* Save completed receipts as shareable image artifacts
* Preserve drafts, preferences, interrupted prints, and receipt history locally
* Recover safely from refreshes and interrupted printing
* Run as an installable progressive web app with offline support
* Respect reduced motion and support keyboard and screen reader flows
* Hand completed receipts to the Dojo Archive as summarized artifacts
* Support the LD-001 field-object distribution experiment and its operational analytics

### Receipt papers

* **Original Thermal**  
  The emotionally accurate classic.

* **CVS Catastrophe**  
  A pharmacy-length parody receipt with absurd coupons and ExtraCare for the soul.

* **Government Breakdown**  
  Form BD-17 from the Department of Internal Weather.

* **Luxury Emotional Invoice**  
  Bespoke suffering, privately invoiced.

* **Victorian Pharmacy**  
  Prescribed silence, broth, and freedom from obligations.

CVS Catastrophe is an unofficial parody. No brand has endorsed this emotional incident.

---

## The Build Week extension

### Carry Forward

After printing a receipt, the user may choose one remaining obligation and select:

**Carry One Thing Forward**

The user names the task, optionally pastes the source material it depends on, and declares what the next interface should ask less of.

### Interaction Budget

The user may request:

* **One step at a time**  
  Show only the active step and its next clear action.

* **Fewer decisions**  
  Limit active choices and defer nonessential selections.

* **Protect my progress**  
  Preserve the validated plan, selections, and draft.

* **Defer optional work**  
  Move anything not required for completion behind **Later**.

These settings are explicit user requests. They are not emotional conclusions reached by the model.

### One Thing Mode

GPT-5.6 compiles the selected task into a strict `TaskPlan`.

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
Create an emotionally accurate receipt.
        ↓
CARRY FORWARD
Choose one remaining obligation.
        ↓
DECLARE
What should this interface ask less of?
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

A task may include:

* Unstructured instructions
* A pasted email or notice
* Relevant and irrelevant details
* Actual decision points
* Optional work
* Missing information
* Facts that must be preserved exactly
* Draft content requiring user review

GPT-5.6 performs that interpretation.

It may:

* Identify the goal and completion condition
* Separate essential steps from optional work
* Identify meaningful user decisions
* Extract facts from supplied source material
* Attach exact source evidence to extracted facts
* Draft bounded content when the task requires it
* Produce a plan using approved step types

It may not:

* Diagnose the user
* Estimate emotional severity
* Decide whether support is deserved
* Choose the Interaction Budget
* Render executable markup
* Browse the web
* Access an account
* Send a message
* Submit a form
* Make a purchase
* Delete external data
* Introduce an unsupported deadline
* Perform any irreversible action

**The model proposes structure. The application controls behavior.**

---

## Why this is not a chatbot

A chatbot returns conversational output and asks the user to manage the conversation.

Carry Forward produces a typed intermediate representation that the application turns into a stable task interface.

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

No model output directly controls layout, routing, persistence, or application actions.

The compiler receives no tools because it does not need tools.

---

## Minimum Necessary Interface

A **Minimum Necessary Interface** is a temporary interface containing the smallest complete set of information, decisions, and actions required to finish one user-selected task.

It is:

1. Task scoped
2. User authorized
3. Temporary
4. Predictable
5. Reversible
6. Progress preserving
7. Rendered from constrained components
8. Free from covert emotional inference

The user-facing name is **One Thing Mode**.

The engineering primitive beneath it is an **Interaction Budget**.

The goal is not to show as little as possible.

The goal is to preserve the smallest **complete** path.

---

## Declared load, not detected emotion

Bad Day Receipt takes a deliberately narrow position on adaptive software:

> **Declared load, not detected emotion.**

The product uses:

* No camera
* No facial analysis
* No heart rate
* No sentiment classification
* No attention detection
* No behavior-based capacity score
* No permanent psychological profile

The person states what would help.

The interface adapts to that request.

---

## Validation boundary

Structured model output constrains the shape of the proposed plan.

The application must still apply its own product-specific validation after parsing.

### Hard runtime invariants

These properties are machine-checkable and fail closed:

| Invariant | Enforcement |
|---|---|
| Valid output shape | Strict schema parsing |
| Approved component types | Discriminated step union |
| Step count | One to five steps |
| Choice count | Maximum three options per choice step |
| Completion definition | Required nonempty field |
| External side effects | No tools and no executable action types |
| Model-generated markup | Rejected by schema and renderer |
| Evidence provenance | Exact source substring verification |
| Full-plan access | Rendered outside model control |
| Edit, cancel, and exit | Rendered outside model control |
| Stable layout | No regeneration during the active task |
| Expiry | Separate task storage with automatic deletion |
| Unknown or malformed output | Rejected |

### Evaluation assertions

Some qualities are semantic and cannot honestly be guaranteed by JSON validation alone.

They must be measured across authored fixtures:

* Was the task path complete?
* Did the model invent an obligation?
* Was a required step incorrectly deferred?
* Was optional work classified correctly?
* Was the completion definition useful?
* Did the plan preserve the user’s stated goal?
* Did the plan introduce unsupported advice?

This distinction prevents probabilistic judgments from being presented as deterministic safety guarantees.

---

## User control

Every adaptation must be:

1. Previewed before it is applied
2. Applied only after explicit approval
3. Stable during the task
4. Explainable through **Why This View**
5. Reversible
6. Temporary

The user must always retain access to:

* Show complete plan
* Show all choices
* Edit
* Go back
* End One Thing Mode
* Clear task data

The final product action is limited to copying or downloading prepared work.

Nothing is sent automatically.

---

## Failure behavior

AI failure must not become product failure.

If GPT-5.6 is unavailable, refuses the task, produces incomplete output, or returns a plan that fails validation:

1. The invalid plan is never rendered.
2. The validator may return machine-readable errors for one retry.
3. A second failure opens the manual one-task workspace.
4. The original task remains available.
5. The receipt remains unchanged.

The product fails into a simpler usable state rather than leaving the user stranded.

---

## Build Week status

### Existing foundation

* [x] Deterministic receipt printer state machine
* [x] Committed receipt snapshots
* [x] Local draft and history persistence
* [x] Interrupted-print recovery
* [x] Responsive mobile instrument shell
* [x] Reduced-motion behavior
* [x] PNG artifact export
* [x] Progressive web app and offline support
* [x] Unit, browser, accessibility, viewport, and visual test scripts

### Carry Forward

* [ ] Carry Forward entry on the completed receipt
* [ ] Direct Carry Forward entry from the machine
* [ ] Task and optional source-context input
* [ ] Four user-declared interaction policies
* [ ] Adaptation preview
* [ ] GPT-5.6 Responses API compiler
* [ ] Strict `TaskPlan` schema
* [ ] Application-level validator
* [ ] Typed task-step components
* [ ] One Thing Mode runtime
* [ ] Why This View inspector
* [ ] Separate expiring task storage
* [ ] Refresh recovery
* [ ] Manual fallback
* [ ] Evaluation fixtures
* [ ] Complete reference-task browser test

The checklist will be updated as implementation lands. Competition claims should match the checked state at submission time.

---

## Judge path

The target demonstration is designed to be understood in under one minute:

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

The demo must make four things immediately visible:

* What existed before Build Week
* What was added during Build Week
* Why GPT-5.6 is necessary
* Why the result is not a chatbot

---

## Privacy

### Current receipt machine

Receipt line items, drafts, history, preferences, and interrupted-print state are stored in the browser’s local storage.

The deployed site also uses Vercel Analytics and a narrow Supabase telemetry path for the LD-001 field-object experiment. Those events contain operational metadata such as field edition, event type, placement, source, viewport class, and pseudonymous session or visitor identifiers.

They do **not** include receipt line items, custom receipt text, totals, exported images, or emotional narratives.

Calling the entire application “local only” would therefore be inaccurate. The more precise claim is:

> Receipt content is local-first. Limited operational interaction telemetry is collected for the field experiment.

### Carry Forward privacy contract

The Build Week extension is designed so that:

* Task context is sent only after explicit assisted-compilation consent
* The OpenAI API key remains server side
* Raw task context is never added to receipt history or exported receipts
* Request bodies are not logged by the application
* Source text is treated as untrusted data
* Model output is never rendered before validation
* Temporary task state uses a separate storage lifecycle
* Full source context is discarded after successful compilation
* Only minimum verified evidence excerpts may remain until expiry
* The user can clear the task immediately

The planned OpenAI request uses `store: false`. The interface will not claim that this means zero retention under every OpenAI data-control configuration.

---

## OpenAI implementation contract

Carry Forward is being designed around current OpenAI guidance:

* Use the Responses API for the model request
* Use GPT-5.6 as the required model
* Use Structured Outputs for the typed `TaskPlan`
* Keep the model tool-free for this workflow
* Constrain input and output length
* Handle refusals and incomplete output
* Apply application-level validation after parsing
* Keep a human in the loop for consequential content
* Red-team prompt injection and malformed source material
* Build representative evaluations before optimizing prompts
* Keep credentials server side
* Describe data handling accurately

Official references:

* [GPT-5.6 and current models](https://developers.openai.com/api/docs/models)
* [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
* [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
* [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
* [Data controls](https://developers.openai.com/api/docs/guides/your-data)
* [Evals](https://developers.openai.com/api/docs/guides/evals)

---

## How Codex is being used

OpenAI Build Week requires the README to show where Codex accelerated the work and where the builder made the key decisions.

Codex is being used to:

* Map the existing receipt-machine architecture before modifying it
* Identify a clean route and persistence boundary
* Scaffold Carry Forward modules
* Translate the product contract into TypeScript and schema definitions
* Build validation and failure-path tests
* Generate adversarial and malformed-output fixtures
* Trace refresh recovery and expiry edge cases
* Audit keyboard, reduced-motion, and screen-reader behavior
* Refactor duplicated task-step logic
* Review request handling and privacy boundaries
* Maintain the Build Week implementation record

The human builder remains responsible for:

* The product thesis
* The emotional and interaction model
* Declared load instead of detected emotion
* The no-tools compiler boundary
* The prohibition on automatic submission
* The typed-plan architecture
* The distinction between hard invariants and semantic evaluations
* The adaptation preview and stable layout requirements
* The separate task-data lifecycle
* Final code review and product judgment

Before submission, this section will include:

* The primary Codex `/feedback` Session ID
* The Build Week commit range
* Links to the most representative implementation commits

See [`docs/build-week.md`](./docs/build-week.md).

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

Open the local URL printed by Vite.

### Production build

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
```

The current repository does not yet include the OpenAI SDK or a required `OPENAI_API_KEY`. Environment setup will be documented when the Carry Forward API route lands.

---

## Stack

### Current application

* React 19
* TypeScript
* Vite 8
* Vitest
* Playwright
* axe-core for browser accessibility checks
* Canvas-based artifact export
* Progressive web app service worker
* Vercel Analytics
* Supabase edge-function telemetry for the field experiment

### Carry Forward target additions

* OpenAI JavaScript SDK
* GPT-5.6
* Responses API
* Structured Outputs
* Runtime schema validation
* Typed task-step renderer
* Product evaluation harness

---

## Repository map

```text
src/
├── analytics/             Field-event analytics and Supabase telemetry
├── components/            Receipt composition and printer components
├── export/                Image artifact rendering and export
├── field-access/          LD-001 field-object access experience
├── mobile-instrument/     Responsive instrument scenes and artifact viewer
├── soft-machine/          Persistence, shell, actions, sheets, and recovery
├── App.tsx                Main receipt-machine orchestration
└── main.tsx               Application entry, access gate, analytics, and errors

tests/
├── e2e/                   Browser, accessibility, and viewport coverage
└── visual/                Release-oriented visual regression coverage

docs/
├── carry-forward.md       Build Week product and engineering specification
├── build-week.md          Competition delta, evidence, and submission checklist
└── releases/              Existing release notes
```

The Carry Forward implementation will live behind a separate route and use a separate storage key rather than expanding the existing printer state machine.

---

## Scope

The Build Week submission will prove one complete vertical slice:

> **Prepare a response to a difficult insurance email.**

It intentionally will not include:

* Gmail integration
* Slack integration
* Calendar integration
* Browser extensions
* Account access
* Automatic submission
* Biometrics
* Attention detection
* Sentiment scoring
* Permanent user profiles
* Cross-application preference exchange
* Multiple autonomous agents
* Model-generated HTML

The constraint is deliberate.

The goal is to prove the interaction model, not pretend an interoperability ecosystem already exists.

---

## Limitations

Carry Forward will not be able to guarantee that every generated plan represents the objectively perfect minimum path.

Schema enforcement can guarantee shape and prohibited operations. Application validation can enforce hard product rules. Semantic quality still requires representative evaluations and user review.

The project:

* Does not provide medical, legal, insurance, or financial advice
* Requires the user to verify consequential facts and language
* Is not clinically validated
* Is not an accessibility certification
* Does not claim to have invented simplified or adaptive interfaces
* Currently supports no OpenAI-assisted task compilation on the live site

The contribution is the product demonstration of a **user-declared, temporary, task-specific Minimum Necessary Interface**.

---

## Product principles

### Declared load, not detected emotion

The person states what would help.

### Task-scoped adaptation, not permanent profiling

The interface changes for one obligation and then expires.

### Minimum necessary, not minimum visible

The task must remain complete, not merely sparse.

### Defer, do not erase

Optional information remains recoverable.

### Compile, validate, render

The model proposes structure. The application controls behavior.

### Assistance without authority

The system may prepare work. It may not take consequential action.

---

## Documentation

* [`docs/carry-forward.md`](./docs/carry-forward.md)  
  Hardened product, interaction, architecture, privacy, and evaluation specification.

* [`docs/build-week.md`](./docs/build-week.md)  
  Preexisting baseline, Build Week delta, Codex evidence, judge testing path, and final submission checklist.

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
