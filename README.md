# Bad Day Receipt · Carry Forward

> **Document what the day cost. Carry one thing forward.**

Bad Day Receipt is an emotional documentation machine for days that required more than the visible record shows. It turns invisible effort into a physical-feeling receipt, then lets the person decide what happens next.

The OpenAI Build Week contribution is **Carry Forward** and its post-receipt **Three Valid Endings** architecture. A completed receipt is already valid. The user may keep it, let it go, or carry one remaining obligation into **One Thing Mode**, a temporary interface containing only the information, decisions, and actions required to finish that task.

The result is not a chatbot. GPT-5.6 proposes a constrained task plan. The application validates it and renders only fixed, typed React components.

<p align="center">
  <a href="https://bad-day-receipt.vercel.app"><strong>Open the live product</strong></a>
  ·
  <a href="./docs/build-week.md">Build Week evidence</a>
  ·
  <a href="./docs/three-valid-endings.md">Production contract</a>
  ·
  <a href="./docs/carry-forward.md">Carry Forward specification</a>
</p>

> **Submission status**  
> Production is proven on Vercel from `main` at `00e23fc4cdac818e3fa5e86510a677a96ebb303d`. The canonical deployment is `READY`, the live-domain smoke passed, and the public repository is MIT licensed. The primary Codex `/feedback` Session ID is `019f77c2-ce1f-7701-b96b-a81048803a36`.

---

## Build Week submission facts

| | |
|---|---|
| **Track** | Apps for Your Life |
| **Project** | Bad Day Receipt · Carry Forward |
| **Live demo** | https://bad-day-receipt.vercel.app |
| **Repository** | Public, MIT licensed |
| **Primary Codex Session ID** | `019f77c2-ce1f-7701-b96b-a81048803a36` |
| **Required model** | GPT-5.6 |
| **OpenAI API** | Responses API with Structured Outputs |
| **Build Week contribution** | Carry Forward, One Thing Mode, and Three Valid Endings |
| **Reference task** | Prepare a response to a synthetic insurance-denial email |
| **Automatic external actions** | None |
| **Emotion detection** | None |

The official Build Week rules require a working project built with Codex and GPT-5.6, a public YouTube demo under three minutes with audio explaining both tools, a repository with setup and testing guidance, and the `/feedback` Session ID from the primary build thread. The final YouTube URL belongs in the Devpost submission once uploaded; this repository does not publish a placeholder link.

---

## The product thesis

A difficult day can temporarily reduce available attention, working memory, decision-making capacity, and emotional effort.

The next interface usually does not care.

Bad Day Receipt creates recognition:

> This day required more than the record shows.

Carry Forward adds practical relief:

> The next task should not continue demanding full capacity.

The intended audience is anyone completing consequential personal administration during temporary cognitive overload, including difficult messages, insurance correspondence, medical bills, appointment decisions, appeals, and forms.

No diagnosis is required.

---

## What existed before Build Week

Bad Day Receipt already included:

* Emotional receipt composition
* Custom charges and credits
* Five receipt-paper systems
* Deterministic printer states
* Receipt totals and verdicts
* Shareable image export
* Local drafts and receipt history
* Interrupted-print recovery
* Sound and haptic preferences
* Responsive mobile instrument scenes
* Progressive web app behavior and offline support
* Reduced-motion handling
* Browser accessibility coverage
* LD-001 field-object access and operational analytics
* Dojo Archive handoff

These capabilities are the preexisting product foundation. They are not presented as the new GPT-5.6 contribution.

### Receipt papers

* **Original Thermal**
* **CVS Catastrophe**
* **Government Breakdown**
* **Luxury Emotional Invoice**
* **Victorian Pharmacy**

CVS Catastrophe is an unofficial parody. No brand has endorsed this emotional incident.

---

## What was added during Build Week

### Carry Forward

After completing a receipt, the user may choose **Carry One Thing Forward** and designate one remaining obligation.

The user can optionally paste the source material the task depends on and declare what the next interface should ask less of:

* **One step at a time**
* **Fewer decisions**
* **Protect my progress**
* **Defer optional work**

These are explicit user requests, not emotional conclusions reached by the model.

### One Thing Mode

GPT-5.6 compiles the task into a strict `TaskPlan`. The application validates that plan and renders it through a fixed component system.

The runtime supports only five model-addressable step kinds:

* `read`
* `choice`
* `compose`
* `checklist`
* `review`

The user can always inspect the complete plan, open **Why This View**, edit, go back, end the mode, copy or download the prepared work, and clear the temporary task.

### Three Valid Endings

A completed receipt is independently complete. The current production flow is:

```text
PRINT COMPLETE
  → The day is documented.
      ├── END THE DAY HERE
      │     ├── KEEP RECEIPT
      │     └── LET IT GO
      └── CARRY ONE THING FORWARD
            → designate one obligation
            → declare the Interaction Budget
            → complete the physical Carry Forward ritual
            → enter the validated compiler/runtime boundary
```

* **Keep Receipt** preserves the frozen receipt in the private local archive after a confirmed write.
* **Let It Go** removes the exact local receipt projection only after persistence confirms the release transaction and provides a bounded Undo window.
* **Carry One Thing Forward** preserves the receipt and creates a separate, temporary task context.

Changing direction is not user error. Nothing else is required after the receipt is documented.

---

## Why GPT-5.6 is necessary

The product cannot predesign a separate interface for every possible obligation.

A task may contain unstructured instructions, irrelevant details, true decision points, optional work, missing information, facts that must be preserved, and draft content requiring review.

GPT-5.6 may:

* Identify the task goal and completion condition
* Separate required steps from optional work
* Identify meaningful decisions
* Extract facts from supplied source material
* Attach exact source evidence to extracted facts
* Draft bounded content for user review
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

> **The model proposes structure. The application controls behavior.**

The deployed compiler uses the explicit `gpt-5.6` model alias through the Responses API with Structured Outputs, `reasoning.effort: "low"`, `store: false`, `tools: []`, bounded input and output limits, SDK retries disabled, and at most one independently validated repair attempt.

---

## Architecture

```text
Completed receipt
    ↓
Three Valid Endings decision
    ├── Keep → confirmed local archive write
    ├── Let It Go → confirmed local deletion + bounded Undo
    └── Carry Forward
            ↓
User-designated task
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
One Thing Mode
```

No model-generated HTML enters the DOM. No model output controls layout, routing, persistence, filenames, or application actions. The compiler receives no tools because this workflow does not need them.

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

The goal is not minimum visibility. The goal is the minimum **complete** path.

### Interaction Budget

The Interaction Budget is the engineering primitive that converts the user’s declared needs into deterministic presentation rules. The model does not infer or choose these policies.

---

## Trust boundaries

### Machine-enforced invariants

* One to five approved step types
* No more than three options in a choice step
* Concrete completion definition
* Bounded complete-sentence plan summary
* No executable markup
* No external side-effect actions
* Exact source-substring verification for extracted evidence
* Displayed fact values must be exact substrings of verified quotes
* Full plan, edit, cancel, copy, download, and exit controls remain application owned
* Stable layout during the task
* Unknown or malformed output rejected
* At most one repair attempt, revalidated from scratch
* Separate expiring task storage
* Fixed app-owned plain-text output and `carry-forward-plan.txt` filename

### Evaluated properties

Semantic quality is measured rather than falsely guaranteed:

* Is the task path complete?
* Did the model invent an obligation?
* Was a required step deferred?
* Is optional work actually optional?
* Is the completion definition useful?
* Did the plan introduce unsupported advice?

### Failure behavior

If GPT-5.6 is unavailable, refuses the request, returns incomplete output, times out, or produces a plan that fails validation, the invalid plan is never rendered. After the bounded repair path, the product opens a manual one-task workspace.

> **AI failure must not become product failure.**

---

## Declared load, not detected emotion

Bad Day Receipt takes a deliberately narrow position on adaptive software:

> **Declared load, not detected emotion.**

The product uses no camera, facial analysis, heart rate, sentiment classification, attention detection, behavior-based capacity score, or permanent psychological profile.

The person states what would help. The interface adapts to that request.

Every adaptation must be previewed, explicitly approved, stable, explainable, reversible, and temporary.

---

## Privacy and data handling

### Receipt machine

Receipt line items, drafts, history, preferences, interrupted-print state, Keep records, and bounded release recovery state are stored in browser storage.

The deployed site uses Vercel Analytics and a narrow Supabase telemetry path for the LD-001 field experiment. Those events contain operational metadata such as event type, field edition, placement, source, viewport class, and pseudonymous session or visitor identifiers.

They do not include receipt line items, custom receipt text, totals, exported images, task text, source text, drafts, extracted facts, or emotional narratives.

The accurate claim is:

> Receipt content is local-first. Limited operational interaction telemetry is collected for the field experiment.

### Carry Forward

* Task context is sent only after explicit assisted-compilation consent
* The OpenAI API key remains server side
* Raw task context is excluded from receipt history, exports, analytics, and field telemetry
* Request bodies are not logged by the application
* Source text is treated as untrusted data
* Model output is validated before rendering
* Temporary task state has a separate four-hour storage lifecycle
* Full source context is discarded after successful compilation
* The user can clear the task immediately
* No ending performs an automatic external action

The server request uses `store: false`. The interface does not describe this as a universal zero-retention guarantee.

---

## How Codex was used

**Primary Codex `/feedback` Session ID:** `019f77c2-ce1f-7701-b96b-a81048803a36`

Codex was the implementation and verification partner across the Build Week work. It accelerated:

* Mapping the existing printer, persistence, routing, and accessibility architecture before modification
* Converting the product contract into TypeScript domain types, reducer states, validation rules, and fixed renderers
* Scaffolding the Carry Forward compiler boundary and One Thing Mode runtime
* Building representative, adversarial, failure, recovery, expiry, accessibility, viewport, reduced-motion, and visual fixtures
* Tracing privacy boundaries and verifying that task content cannot enter receipt history or operational telemetry
* Diagnosing the Vercel TypeScript builder incompatibility and pinning the compatible compiler version
* Auditing the Three Valid Endings architecture against Figma, runtime behavior, persistence, sensory behavior, and accessibility
* Finding the production-only build-time flag mismatch that source-SHA checks had missed
* Building the fail-closed production guard and live-domain smoke proof
* Maintaining exact release evidence across GitHub, Vercel, tests, and documentation

### Human-led decisions

The human builder remained responsible for:

* The product thesis and emotional framing
* The decision to use declared load instead of detected emotion
* The Three Valid Endings interaction model
* The definition of a Minimum Necessary Interface
* The no-tools compiler boundary
* The prohibition on automatic submission and irreversible actions
* The distinction between hard invariants and evaluated semantic quality
* The adaptation preview, stable-layout, privacy, expiry, and recovery requirements
* Final design, product, engineering, and release judgment

Codex accelerated the work. It did not replace authorship or product responsibility.

---

## Judge path

The hosted product requires no account, private data, or local rebuild.

1. Open the live application.
2. Create a receipt or use **Skip to completed receipt**.
3. Confirm the completed state: **The day is documented.**
4. Open **End the Day Here** to see **Keep Receipt** and **Let It Go**.
5. Return and choose **Carry One Thing Forward**.
6. Designate an obligation or load the synthetic insurance-denial example.
7. Select **Fewer decisions** and **Protect my progress**.
8. Preview the adaptation.
9. Generate One Thing Mode with GPT-5.6.
10. Complete one meaningful decision and review the prepared response.
11. Open **Why This View** and **Complete Plan**.
12. Copy or download the work, or end the mode safely.

Within one minute, the judge should understand:

* What existed before Build Week
* What was added during Build Week
* Why GPT-5.6 is necessary
* How Codex accelerated the implementation
* Why the result is a typed interface rather than a chatbot
* Why receipt truth is independent of the ending selected
* Why the user declares support needs instead of being emotionally classified
* Why the experience remains useful when the model fails

---

## Production proof

The final production release record is attached to issue #90 and the merged release PR #99.

| Evidence | Result |
|---|---|
| Final production source SHA | `00e23fc4cdac818e3fa5e86510a677a96ebb303d` |
| Vercel deployment | `dpl_HGwpQHjsk15ZTn43jYnHHF6Gkz6P` |
| Deployment state | `READY` |
| Canonical domain | `https://bad-day-receipt.vercel.app` |
| Production feature guard | Passed with exact `VITE_THREE_ENDINGS=true` |
| Live-domain smoke | 1 passed, 0 skipped, 0 flaky |
| Browser console errors | 0 unexpected |
| Same-origin request failures | 0 unexpected |
| Vercel runtime error clusters | None in the release verification window |
| Production accessibility smoke | 0 serious or critical axe violations |

Exact-head release evidence recorded before production deployment:

* Production guard: 3 of 3 tests passed
* Vitest: 61 files, 311 tests passed, 2 intentionally skipped
* Cross-browser product journeys: 310 passed
* Accessibility gate: 10 passed with no serious or critical violations
* Viewport and orientation matrix: 16 of 16
* General deterministic visuals: 19 passed
* Focused Three Endings visuals: 9 of 9
* TypeScript, production build, bundle budget, compiler, validator, eval, receipt-regression, recovery, persistence, reduced-motion, and rollback gates passed

The final post-deploy smoke intentionally stops before compilation and makes no paid or uncontrolled GPT request.

---

## Run locally

### Requirements

* Node.js 24 is recommended to match the Vercel project runtime
* npm
* The exact `typescript@5.9.3` pin. Vercel’s Node function builder requires `ts.sys.readFile`; do not upgrade TypeScript independently of builder compatibility verification.

### Install and start

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite.

### Build and preview

```bash
npm run build
npm run preview
```

To reproduce the current Three Valid Endings production build locally:

```bash
VITE_THREE_ENDINGS=true npm run build
```

Production builds fail closed unless the exact flag is present:

```bash
VERCEL_ENV=production VITE_THREE_ENDINGS=true npm run build
```

### OpenAI configuration

Create an ignored `.env.local` file for the server-only compiler key:

```bash
OPENAI_API_KEY=your_project_key
```

The browser never receives this value. `api/compile-task.ts` is the only OpenAI call boundary.

The live product remains testable without compilation because the receipt machine, Three Valid Endings, built-in sample data, manual fallback, and deterministic fixtures do not require a model request.

### Validation

```bash
node -e "const ts=require('typescript'); console.log(ts.version, Boolean(ts.sys?.readFile))"
npm run typecheck
npm test
npm run test:receipt-regression
npm run test:carry-forward
npm run evals:carry-forward
npm run release:carry-forward
npm run release:three-endings
npm run mobile-quality
```

The compiler compatibility check must print `5.9.3 true`.

### Optional paid live compiler smoke

The opt-in live smoke loads the ignored `.env.local` when `OPENAI_API_KEY` is not already exported and reports only sanitized failure classifications:

```bash
RUN_OPENAI_LIVE=1 npx vitest run tests/api/compile-task.live.test.ts
```

For latency troubleshooting, the paid diagnostic ladder uses synthetic inputs and allowlisted timing, token-count, status, model, and request metadata. It never prints credentials, prompt content, source text, evidence, or output content:

```bash
RUN_OPENAI_DIAGNOSTICS=1 npm run diagnose:carry-forward
```

Neither opt-in command runs in ordinary CI or the release gates.

### Production smoke

```bash
PRODUCTION_BASE_URL=https://bad-day-receipt.vercel.app npm run test:production-smoke
```

This smoke uses a clean isolated Chromium context, blocks service workers, verifies the production decision architecture, checks the direct route, runs axe, and stops before any GPT request.

---

## Stack

React 19, TypeScript 5.9.3, Vite 8, Vitest, Playwright, axe-core, Zod, the OpenAI JavaScript SDK, GPT-5.6, Responses API, Structured Outputs, Canvas-based artifact export, a progressive web app service worker, Vercel Analytics, and Supabase edge-function telemetry for the field experiment.

---

## Scope and limitations

The Build Week submission demonstrates one complete reference path:

> **Prepare a response to a synthetic insurance-denial email for user review and manual submission.**

The project does not include connected accounts, automatic submission, browser extensions, biometrics, sentiment scoring, permanent user profiles, cross-application preference exchange, multiple agents, or model-generated HTML.

Carry Forward cannot guarantee that every generated plan is the objectively perfect minimum path. Schema enforcement can guarantee shape and prohibited operations. Semantic quality still requires representative evaluations and user review.

The user must review consequential facts, legal or insurance correctness, the final draft, the selected submission method, and every real external action. Carry Forward prepares work; it never proves that the work is correct or submitted.

Rate limiting and duplicate-request protection are instance local, model latency varies, browser storage may be unavailable, and hosted compilation requires a configured funded OpenAI API project. `store: false` is not a universal zero-retention guarantee. The project is not medical, legal, insurance, or financial advice, clinical validation, or an accessibility certification.

The contribution is the product demonstration of a **user-declared, temporary, task-specific Minimum Necessary Interface**.

---

## Documentation

* [`docs/build-week.md`](./docs/build-week.md)  
  Competition requirements, preexisting baseline, contribution boundary, Codex evidence, commit range, production proof, judge path, and final submission checklist.

* [`docs/three-valid-endings.md`](./docs/three-valid-endings.md)  
  Current post-receipt production architecture, persistence semantics, feature guard, Figma-to-code matrix, and live assertions.

* [`docs/carry-forward.md`](./docs/carry-forward.md)  
  Carry Forward product, interaction, compiler, validation, privacy, and evaluation specification.

* [`docs/privacy.md`](./docs/privacy.md) and [`docs/threat-model.md`](./docs/threat-model.md)  
  Sensitive-data lifecycle, telemetry allowlists, prompt-injection boundary, and residual limitations.

* [`docs/releases`](./docs/releases)  
  Release notes for the receipt machine and field-object system.

---

## License

MIT. See [`LICENSE`](./LICENSE).

---

<p align="center">
  <strong>Software usually asks you to continue as though nothing happened.</strong>
  <br />
  Carry Forward lets the next task respond.
</p>
