# OpenAI Build Week record

This document separates the preexisting Bad Day Receipt product from the work being added during the OpenAI Build Week submission period.

It is also the final evidence checklist for the repository, demo video, and Devpost submission.

## Competition facts

* Track: **Apps for Your Life**
* Submission deadline: **July 21, 2026 at 5:00 PM Pacific Time**
* Required tools: **Codex and GPT-5.6**
* Required repository evidence: clear distinction between prior work and new work
* Required Codex evidence: primary `/feedback` Session ID
* Required demo: public YouTube video under three minutes with audio explaining the product, GPT-5.6, and Codex use
* Private repository access: share with `testing@devpost.com` and `build-week-event@openai.com`

The official rules remain the source of truth:

* [OpenAI Build Week rules](https://openai.devpost.com/rules)
* [OpenAI Build Week FAQ](https://openai.devpost.com/details/faqs)

---

## Preexisting product baseline

Bad Day Receipt existed before the Build Week extension.

The baseline product includes:

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
* LD-001 field-object access
* Operational field analytics
* Dojo Archive handoff

These capabilities should not be presented as the new GPT-5.6 contribution.

---

## Build Week contribution

The competition extension is **Carry Forward**.

Carry Forward connects the completed emotional artifact to one practical next action:

1. The user chooses one remaining obligation.
2. The user declares what the interface should ask less of.
3. GPT-5.6 compiles the task into a typed plan.
4. The application validates the plan.
5. A fixed component runtime renders One Thing Mode.
6. The user reviews and copies or downloads the result.
7. The temporary task context expires.

### Minimum Necessary Interface

The core contribution is a temporary, user-authorized interface containing the smallest complete set of information, decisions, and actions required to finish one task.

The user-facing name is **One Thing Mode**.

The engineering primitive is an **Interaction Budget**.

---

## Implementation checklist

Update this list only when the corresponding behavior is working and testable.

### Product flow

* [x] Carry Forward action on the finished receipt
* [x] Direct entry from the main machine
* [x] One-task input
* [x] Source-context input
* [x] Four user-declared interaction policies
* [x] Adaptation preview
* [x] One Thing Mode completion state
* [ ] Receipt annotation after completion

### OpenAI integration

* [x] Server-side OpenAI API route
* [x] GPT-5.6 model call
* [x] Responses API
* [x] Structured `TaskPlan` output
* [x] Refusal handling
* [x] Incomplete-output handling
* [x] Request timeout
* [x] Input and output limits
* [x] `store: false`
* [x] No model tools
* [x] Generic client-facing server errors

### Runtime and validation

* [x] Strict task-plan schema
* [x] One to five allowed steps
* [x] Five typed step components
* [x] Maximum three choices per choice step
* [x] No executable markup
* [x] No side-effect action types
* [x] Exact evidence substring verification
* [x] Full-plan access outside model control
* [x] Stable layout during the task
* [x] One validation retry at most
* [x] Manual fallback after failure

### Persistence and privacy

* [x] Separate Carry Forward storage key
* [x] Four-hour default expiry
* [x] Immediate clear action
* [x] Refresh recovery
* [x] Raw source excluded from receipt history
* [x] Raw source excluded from analytics and telemetry
* [x] Raw request bodies excluded from logs
* [x] Full source discarded after successful compilation
* [x] Minimum evidence excerpts retained only until expiry

### Testing and evaluation

* [x] Unit tests for the Interaction Budget
* [x] Unit tests for task-plan validation
* [x] Unit tests for expiring storage
* [x] End-to-end reference task
* [x] Manual fallback browser test
* [ ] Keyboard completion test
* [ ] Screen-reader status announcements
* [ ] Reduced-motion coverage
* [ ] Refresh recovery test
* [ ] Expiry deletion test
* [ ] Prompt-injection fixture
* [ ] Unsupported-fact fixture
* [ ] Invented-deadline fixture
* [ ] Required-step deferral fixture

---

## Required evidence before submission

### Codex

* [ ] Run `/feedback` in the primary Codex build thread
* [ ] Add the Session ID to the Devpost form
* [ ] Add the Session ID to this document
* [ ] Describe where Codex accelerated implementation
* [ ] Describe which product and engineering decisions remained human-led

**Primary Codex Session ID:** `TBD`

### Commit history

* [ ] Identify the last preextension baseline commit
* [ ] Identify the first Carry Forward implementation commit
* [ ] Identify the final submission commit
* [ ] Add a comparison link

**Baseline commit:** `TBD`  
**First Carry Forward commit:** `TBD`  
**Submission commit:** `TBD`  
**Comparison:** `TBD`

### Repository access

* [ ] Decide whether the repository will be public or private for judging
* [ ] If public, confirm the MIT license is present
* [ ] If private, share access with both required judging addresses
* [ ] Confirm the live demo requires no login
* [x] Confirm sample data is built into the demo

### Demo video

* [ ] Public YouTube link
* [ ] Under three minutes
* [ ] Audio narration
* [ ] Shows the working product rather than slides alone
* [ ] Explains what existed before Build Week
* [ ] Explains what was added during Build Week
* [ ] Shows GPT-5.6 producing a typed plan
* [ ] Shows the validator and typed renderer
* [ ] Shows Why This View and user control
* [ ] Shows one failure or rejection path
* [ ] Explains how Codex was used
* [ ] Uses no unlicensed music or third-party copyrighted media

**Demo video:** `TBD`

---

## Judge testing path

The final hosted demo should require no account and no private data.

Recommended sequence:

1. Open the live application.
2. Select **Skip to completed receipt**, or create a receipt manually.
3. Select **Carry One Thing Forward**.
4. Select **Load insurance denial demo**.
5. Enable **Fewer decisions** and **Protect my progress**.
6. Preview the adaptation.
7. Begin One Thing Mode.
8. Complete the decision and draft-review flow.
9. Open **Why This View**.
10. Copy the prepared response.
11. Refresh before completion to verify recovery.
12. Load the adversarial fixture to verify rejection and fallback.

### Expected judge takeaway

Within one minute, the judge should understand:

* The receipt machine existed before Build Week
* Carry Forward is the new extension
* GPT-5.6 performs contextual task compilation
* The output is a typed plan rather than arbitrary HTML
* The application retains authority over layout and actions
* The user declares support needs rather than being emotionally classified
* The experience remains useful when the model fails

---

## Demo narrative

### Opening

> Bad Day Receipt documents what a difficult day cost. Recognition matters, but it does not make the next obligation easier.

### Transition

> Carry Forward turns one remaining obligation into a temporary interface containing only what is necessary to finish it.

### Technical reveal

> GPT-5.6 interprets the task and returns a strict plan. The application verifies source evidence, rejects prohibited behavior, and renders only approved React components.

### Principle

> Declared load, not detected emotion. Task-scoped adaptation, not permanent profiling.

### Closing

> Software usually asks you to continue as though nothing happened. Carry Forward lets the next task respond.

---

## Submission integrity rules

Before submission:

* Remove every `TBD` that is required for judging
* Do not check unfinished features
* Do not invent human-study results
* Do not call schema compliance semantic correctness
* Do not claim OpenAI retains nothing
* Do not describe the whole application as local only
* Do not claim the project invented simplified interfaces
* Do not call product testing clinical validation
* Do not include dead links or placeholder screenshots
* Do not rely on judges rebuilding the application

The strongest submission is not the one with the most claims.

It is the one whose claims survive contact with the running product.
