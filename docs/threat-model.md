# Carry Forward threat model

## Authority boundary

Source text and task text are untrusted data. They cannot choose the model, add tools, modify the system instruction, define components, render markup, navigate, write storage directly, or trigger side effects.

The model may propose only a strict `TaskPlan` containing `read`, `choice`, `compose`, `checklist`, and `review` steps. The application owns workflow state, layout, navigation, persistence, focus, copy, download, expiry, and telemetry.

## Primary threats and controls

| Threat | Control |
|---|---|
| Prompt injection asks to ignore instructions or reveal prompts | Source is placed in a structured user-data payload beneath a fixed developer instruction. |
| Source requests browsing, account access, or automatic submission | The Responses request has `tools: []`; the domain has no external-action type. |
| Model emits HTML, URLs, tool syntax, or unknown fields | Strict schemas reject unknown keys and prohibited text before rendering. React renders accepted strings as inert text. |
| Model invents or alters evidence | Every quote must match exactly once without trimming or normalization; the displayed value must be contained in that quote; offsets and the final source slice check are application-derived. |
| Model chooses a side effect or filename | The schema exposes only `plain_text`; copy, download, and fixed filenames are owned by explicit application controls. |
| Model output is visibly truncated | The summary has a 320-character hard maximum and a separate complete-sentence invariant; clear truncation is repairable once and otherwise fails closed. |
| Invalid output reaches the DOM | The endpoint returns only a branded validated plan. The client validates the response envelope again and otherwise enters manual fallback. |
| Sensitive text leaks through analytics or errors | Telemetry uses a property allowlist; server/client errors contain stable codes only; request and response bodies are not logged. |
| Temporary context becomes permanent profiling | Separate storage, four-hour expiry, immediate clear, no mood or diagnosis fields, and no cross-task profile. |
| Repeated requests cause cost or race problems | One compiling reducer state, disabled/removed submit control, per-attempt cancellation, an in-flight request-ID guard, output limits, and bounded per-address rate limiting. |

## Adversarial source examples

Tests and review should include synthetic text requesting system-prompt disclosure, automatic sending, account access, invented deadlines, tool use, and script rendering. None of those strings grants authority because no corresponding executable surface exists.

## Residual limitations

- Serverless in-memory rate limiting and in-flight request deduplication are instance-local, not a global abuse-prevention system. A durable edge limiter is still required for adversarial multi-instance traffic.
- Product validation cannot prove that a plan is semantically optimal or legally correct.
- `store: false` is not a universal zero-retention guarantee.
- Browser storage depends on the device and may be cleared or unavailable.
- Model latency varies; the 25-second attempt budget is a bounded product choice, not a latency guarantee.
- Hosted assisted compilation requires a configured funded OpenAI API project.
- Live latency observations are limited samples, not a performance distribution.
