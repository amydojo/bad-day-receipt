# OpenAI Build Week submission record

This document separates the preexisting Bad Day Receipt product from the work completed during the OpenAI Build Week submission period and records the evidence a judge needs to verify the final project.

## Submission status

**Repository and production implementation: ready.**

The remaining external submission action is to upload the final narrated demo to public YouTube and place that URL in Devpost before the deadline. The repository intentionally does not publish a fake or placeholder video URL.

### Copy-ready submission facts

| Field | Value |
|---|---|
| Project | Bad Day Receipt · Carry Forward |
| Track | Apps for Your Life |
| Live project | https://bad-day-receipt.vercel.app |
| Code repository | https://github.com/amydojo/bad-day-receipt |
| Repository access | Public |
| License | MIT |
| Primary `/feedback` Codex Session ID | `019f77c2-ce1f-7701-b96b-a81048803a36` |
| Required model | GPT-5.6 |
| Final production implementation SHA | `00e23fc4cdac818e3fa5e86510a677a96ebb303d` |
| Final production deployment | `dpl_HGwpQHjsk15ZTn43jYnHHF6Gkz6P` |
| Production state | `READY` |

---

## Official requirements

The official rules and FAQ are the source of truth:

* [OpenAI Build Week rules](https://openai.devpost.com/rules)
* [OpenAI Build Week FAQ](https://openai.devpost.com/details/faqs)

The submission period closes **July 21, 2026 at 5:00 PM Pacific Time**.

Required submission elements:

* A working project built with Codex and GPT-5.6
* One selected category
* A text description explaining the product and functionality
* A public YouTube demonstration video under three minutes
* Audio in the video explaining what was built and how Codex and GPT-5.6 were used
* A repository URL for judging and testing
* Relevant licensing for a public repository
* README setup instructions, sample-data guidance, and a clear explanation of Codex and GPT-5.6 use
* The `/feedback` Session ID from the primary Codex thread where most core functionality was built
* Clear documentation distinguishing preexisting work from Build Week work when extending an existing project
* Free, unrestricted judge access through the end of judging

The demo may not use unlicensed copyrighted music, footage, or third-party trademarks beyond authorized use.

---

## Preexisting product baseline

Bad Day Receipt existed before the Build Week extension.

The preexisting baseline is the `main` commit used as the base of PR #78:

```text
43e836214fc122557132db82a7a48e6228f9673f
```

The baseline product included:

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

These capabilities are not presented as the new GPT-5.6 contribution.

---

## Build Week contribution

The competition extension is **Carry Forward**, including the **One Thing Mode** runtime and the production **Three Valid Endings** post-receipt architecture.

### Carry Forward

1. The user chooses one remaining obligation.
2. The user optionally supplies source context.
3. The user declares what the interface should ask less of.
4. GPT-5.6 compiles the task into a typed plan.
5. The application validates the plan and exact source evidence.
6. Fixed React components render One Thing Mode.
7. The user reviews, edits, copies, or downloads the prepared work.
8. The separate temporary task context expires after four hours or is cleared immediately.

### Three Valid Endings

A completed receipt is independently complete. The user may:

* **Keep Receipt** through a confirmed local archive write
* **Let It Go** through a confirmed local deletion with bounded Undo
* **Carry One Thing Forward** into a separate temporary task context

Changing direction is not an error, and no ending is required to make the receipt valid.

### Minimum Necessary Interface

The central product contribution is a temporary, user-authorized interface containing the smallest complete set of information, decisions, and actions required to finish one selected task.

The user-facing name is **One Thing Mode**. The engineering primitive is the **Interaction Budget**.

---

## GPT-5.6 implementation

The production compiler uses:

* Explicit `gpt-5.6` model alias
* OpenAI Responses API
* Structured Outputs through a strict Zod schema
* `reasoning.effort: "low"`
* `store: false`
* `tools: []`
* Bounded request and output limits
* SDK retries disabled
* Independent attempt timeouts within one server deadline
* At most one repair attempt
* Full application validation after parsing and again after repair

GPT-5.6 may identify goals, required steps, decisions, optional work, source-backed facts, and bounded draft content. It cannot browse accounts, call tools, submit anything, perform external actions, control layout, choose the Interaction Budget, diagnose the user, or introduce unsupported deadlines.

No model-generated HTML enters the DOM. Only validated plans reach typed renderers.

---

## Codex collaboration evidence

**Primary Codex `/feedback` Session ID:**

```text
019f77c2-ce1f-7701-b96b-a81048803a36
```

This is the primary project thread where the majority of core functionality was built and verified.

Codex accelerated:

* Architecture mapping before modification
* TypeScript domain contracts and reducer design
* Compiler, validator, evidence, and failure boundaries
* Fixed One Thing Mode renderer implementation
* Unit, browser, accessibility, viewport, zoom, reduced-motion, visual, recovery, and expiry fixtures
* Prompt-injection and unsupported-fact evaluation fixtures
* Privacy and telemetry boundary review
* Diagnosis of the Vercel TypeScript builder incompatibility
* Three Valid Endings implementation and hardening
* Detection of a production-only build-time feature-flag mismatch that source-SHA checks had missed
* Creation of the fail-closed production guard and isolated live-domain smoke test
* Final GitHub, Vercel, runtime, accessibility, and documentation audit

Human-led decisions included:

* Product thesis and emotional framing
* Declared load instead of detected emotion
* The Minimum Necessary Interface concept
* Three Valid Endings semantics
* No-tools and no-automatic-submission boundaries
* Interaction Budget policies
* Stable layout, recovery, privacy, and expiry requirements
* Distinction between machine guarantees and evaluated semantic quality
* Final design, product, engineering, and release judgment

---

## Commit history

| Milestone | Commit |
|---|---|
| Last preextension baseline | `43e836214fc122557132db82a7a48e6228f9673f` |
| First complete Carry Forward implementation commit | `b5dd3dbd7fc069be89aae56aed1cc05329956723` |
| Carry Forward foundation merged in PR #78 | `2e47c873d29f5302a0bd45b3bdb2e16c69684152` |
| Final production implementation merged in PR #99 | `00e23fc4cdac818e3fa5e86510a677a96ebb303d` |

Comparison:

https://github.com/amydojo/bad-day-receipt/compare/43e836214fc122557132db82a7a48e6228f9673f...00e23fc4cdac818e3fa5e86510a677a96ebb303d

The final documentation cleanup is intentionally separate from the production implementation SHA so release evidence remains stable and auditable.

---

## Production evidence

### Vercel

* Project: `bad-day-receipt`
* Project ID: `prj_a8QlJCtuQxOlQnd4ABpSSujIC9BZ`
* Deployment: `dpl_HGwpQHjsk15ZTn43jYnHHF6Gkz6P`
* Target: Production
* Branch: `main`
* State: `READY`
* Source SHA: `00e23fc4cdac818e3fa5e86510a677a96ebb303d`
* Canonical URL: https://bad-day-receipt.vercel.app

The deployment ran the production build guard through `prebuild`. Because `VERCEL_ENV=production`, a successful build proves that exact `VITE_THREE_ENDINGS=true` was present; otherwise the build fails closed.

Vercel reported no runtime-error clusters in the post-release verification window.

### Live-domain smoke

GitHub Actions production smoke run `29875290767` passed against the canonical domain in a clean isolated Chromium context.

The live browser displayed:

* `The day is documented.`
* `END THE DAY HERE`
* `CARRY ONE THING FORWARD`
* `KEEP RECEIPT`
* `LET IT GO`

It did not display the deprecated legacy completed-receipt toolbar.

The smoke also proved:

* `/` and `/carry-forward` returned successfully
* Receipt-origin Carry Forward remained inside the mounted receipt tree
* **Nothing After All** returned safely to the documented receipt
* Direct `/carry-forward` remained truthful and operational
* Zero serious or critical axe violations in the tested production state
* Zero unexpected browser console errors
* Zero unexpected same-origin request failures
* No paid or uncontrolled GPT request occurred

Result: **1 passed, 0 skipped, 0 unexpected, 0 flaky**.

### Exact-head release gates

* Production guard: 3 of 3 passed
* Vitest: 61 files, 311 tests passed, 2 intentionally skipped
* Cross-browser product journeys: 310 passed
* Accessibility: 10 passed with no serious or critical violations
* Viewport and orientation matrix: 16 of 16
* General deterministic visuals: 19 passed
* Focused Three Endings visuals: 9 of 9
* TypeScript and production build: passed
* Compiler, validator, evidence, eval, receipt regression, persistence, recovery, reduced motion, rollback, and bundle-budget gates: passed

---

## Repository and judge access

* [x] Repository is public
* [x] MIT license is present
* [x] Live demo requires no login
* [x] Live demo is free to access
* [x] Sample data is built into the product
* [x] Direct `/carry-forward` testing route is available
* [x] README contains setup and test instructions
* [x] README distinguishes preexisting and Build Week work
* [x] README explains Codex collaboration and human-led decisions
* [x] README explains meaningful GPT-5.6 use
* [x] Primary Session ID is recorded in the README and this document

The judging emails are unnecessary because the repository is public.

---

## Implementation checklist

### Product flow

* [x] Completed receipt becomes stable truth before any ending
* [x] Keep Receipt
* [x] Let It Go with bounded Undo
* [x] Carry One Thing Forward
* [x] User-designated obligation
* [x] Optional source context
* [x] Four user-declared interaction policies
* [x] Adaptation preview
* [x] Physical Carry Forward handoff
* [x] GPT-5.6 compiler
* [x] One Thing Mode runtime
* [x] Complete Plan and Why This View
* [x] Copy and download
* [x] Manual fallback
* [x] Refresh recovery and expiry

### OpenAI integration

* [x] Server-side OpenAI route
* [x] GPT-5.6
* [x] Responses API
* [x] Structured output
* [x] Refusal and incomplete-output handling
* [x] Timeout and request limits
* [x] `store: false`
* [x] No model tools
* [x] Sanitized client errors and operational logs
* [x] One bounded repair at most

### Validation, privacy, and accessibility

* [x] Strict task-plan schema
* [x] Fixed typed renderers
* [x] Exact evidence verification
* [x] No executable markup or side-effect action types
* [x] Separate task storage and four-hour expiry
* [x] Raw source excluded from receipt history and telemetry
* [x] Full source discarded after successful compilation
* [x] Keyboard completion coverage
* [x] Screen-reader status coverage
* [x] Reduced-motion coverage
* [x] 200% zoom and viewport coverage
* [x] Failure, recovery, malformed-storage, rollback, and expiry fixtures
* [x] Production accessibility smoke

Receipt annotation after completion was not required for the submitted vertical slice and is not claimed as shipped functionality.

---

## Demo video gate

The final video must satisfy every item below before Devpost submission:

* [ ] Uploaded to YouTube and publicly visible
* [ ] Under three minutes
* [ ] Includes clear audio narration
* [ ] Shows the working product rather than slides alone
* [ ] Explains what existed before Build Week
* [ ] Explains Carry Forward and Three Valid Endings as the new work
* [ ] Shows meaningful GPT-5.6 use
* [ ] Explains how Codex accelerated the build
* [ ] Shows that the output is a validated typed interface, not generated HTML
* [ ] Shows Why This View or Complete Plan
* [ ] Shows user control, safe exit, recovery, or fallback
* [ ] Contains no unlicensed copyrighted music or media
* [ ] Final public YouTube URL pasted into Devpost

The video URL is an external submission asset. Its absence from this file is explicit, not stale documentation.

---

## Recommended judge path

1. Open the live application.
2. Create a receipt or use **Skip to completed receipt**.
3. Confirm **The day is documented.**
4. Open **End the Day Here** and view Keep Receipt and Let It Go.
5. Return and select **Carry One Thing Forward**.
6. Designate a task or load the synthetic insurance-denial example.
7. Enable **Fewer decisions** and **Protect my progress**.
8. Preview the adaptation.
9. Generate One Thing Mode.
10. Complete one decision and review the prepared response.
11. Open **Why This View** and **Complete Plan**.
12. Copy or download the prepared work.
13. End the mode or clear the task safely.

Expected takeaway:

* The receipt machine existed before Build Week
* Carry Forward and Three Valid Endings are the new extension
* GPT-5.6 performs contextual task compilation
* The application retains authority over rendering and actions
* The user declares support needs instead of being emotionally classified
* The receipt remains true even if compilation fails

---

## Submission integrity rules

* Do not claim unfinished features
* Do not invent user-study or clinical results
* Do not call schema compliance semantic correctness
* Do not claim OpenAI retains nothing
* Do not describe the whole application as local only
* Do not imply automatic submission or external action
* Do not claim the project invented simplified or adaptive interfaces
* Do not call product testing clinical validation or accessibility certification
* Do not include dead links or placeholder screenshots
* Do not rely on judges rebuilding the application
* Do not replace the production-proven SHA with an unverified documentation commit

The strongest submission is not the one with the most claims. It is the one whose claims survive contact with the running product.
