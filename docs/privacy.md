# Carry Forward data lifecycle

Carry Forward is local-first, not local-only. The receipt machine and the task workflow have separate storage and telemetry boundaries.

## Sensitive task data

Task text, optional source text, generated drafts, extracted facts, evidence excerpts, choices, and checklist state are sensitive. They are excluded from URLs, receipt history, receipt exports, FIELD telemetry, Vercel Analytics properties, Supabase telemetry, and application logs.

## Lifecycle

1. Task and optional source text begin in React memory.
2. Nothing is sent until the user confirms the Interaction Budget, reviews the preview, and selects **Compile task plan**.
3. The server sends one bounded initial Responses API request to GPT-5.6 with `store: false` and no tools. A repair request is attempted at most once, with a fresh bounded timeout and only safe validation codes and paths as repair instructions.
4. Candidate output is parsed and validated server-side. Evidence quotes are preserved without normalization, must match one exact source substring, and must directly contain the displayed fact value. The application derives and rechecks offsets.
5. Only a branded validated plan is returned to the fixed React runtime.
6. Raw source text is removed from application state after successful compilation.
7. A separate `bad-day-receipt:carry-forward:v1` record stores the validated plan, budget, expiry, and—only when **Protect progress** is enabled—user progress and drafts. Protected manual-fallback steps and drafts use the same isolated record, but their raw source is never included.
8. The record expires after four hours or is synchronously removed by **Clear task data** or **End One Thing Mode**.

The app does not claim Zero Data Retention. OpenAI API data controls may retain content temporarily for abuse monitoring unless the project has additional retention controls enabled.

## Operational telemetry

Carry Forward telemetry accepts only allowlisted event names, keys, and enum values: workflow state, known step kind and index, safe error code, counts, durations, repair outcome, copy/download outcome, manual-work boolean, and the four policy booleans. Step completion, plan completion, output success/failure, and user-ended sessions are recorded without user-authored or model-authored text.

Server compiler timing logs are restricted to the event name, attempt number, elapsed milliseconds, safe result code, and whether repair was used. They never include credentials, task or source text, model output, evidence, or other user-authored content.

## Credential boundary

`OPENAI_API_KEY` is read only by `api/compile-task.ts`. It is stored in ignored `.env.local` for local development and must be configured as a server-side environment variable in deployment.
