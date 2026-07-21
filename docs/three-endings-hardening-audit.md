# Three Endings hardening audit

Issues: #87, #88, #89  
Parent: #79  
Baseline: `main` at `6a465a36b71783818eccb406d03b6a58402f82df`  
Scope: gaps-only reconciliation after PRs #93–#97

## Classification rule

- **PASS** requires production evidence and executable test evidence where the issue requires a test.
- **PARTIAL** means the behavior exists but fixture, parity, resilience, or documentation is incomplete.
- **FAIL** means the requirement is absent or contradicts the contract.

This audit does not treat an issue checkbox, filename, PR description, or comment as executable evidence.

## #87 · Recovery, interruption, persistence, and failure dignity

| Requirement | Result | Production evidence | Executable evidence | Remaining gap |
| --- | --- | --- | --- | --- |
| Completed receipt remains stable truth | PASS | `receiptEndingReducer` carries one `CompletedReceiptSnapshot`; `ReceiptMachine` keeps the receipt and printer mounted | `three-endings-foundation.spec.ts`, `keep-receipt.spec.ts`, `release-receipt.spec.ts`, `carry-forward-ritual.spec.ts` assert receipt/printer identity | None |
| Refresh at documented decision | PASS | `initialReceiptEndingState` restores `pendingReceipt` directly to `documented` | `three-endings-foundation.spec.ts` refresh case | None |
| Browser back/forward during ending choice | PARTIAL | Carry runtime reflects stages through `carryForwardNavigation.ts`; receipt-ending choices are reducer-owned | No feature-enabled back/forward journey for the shared ending selector | Add deterministic history journey and ensure no receipt loss |
| Storage denied or quota exceeded | PASS | typed `persistMachineData` result; Keep and Release recoveries preserve source state | Keep and Release storage-failure browser journeys | None |
| Malformed persisted machine state | PARTIAL | v2 parser repairs fields independently in `soft-machine/persistence.ts`; Carry checkpoint parser fails closed | unit coverage exists, but no feature-enabled browser fixture proving the completed receipt survives malformed neighboring recovery data | Add deterministic browser fixture |
| Feature-flag rollback with pending receipt data | PARTIAL | v2 reader is active when Three Endings is disabled | no browser fixture toggles the feature boundary against existing v2 data | Add deterministic fixture/evidence |
| Viewport rotation or resize mid-ritual | PARTIAL | one component tree and CSS own all sizes | general viewport matrix exists; only a resize at the end of one Carry test | Add mid-ritual orientation/resize journey |
| Keep archive unavailable | PASS | `KeepReceiptRitual` enters `keep-recovery`; archive write is storage-bound | Keep storage-failure and retry journey | None |
| Keep receipt already archived / duplicate event | PASS | archive projection deduplicates by receipt number; reducer ignores impossible events | Keep idempotency browser and unit tests | None |
| Keep choreography interrupted / leave and return | PASS | transient Keep phases are not persisted; pending receipt remains source of truth | refresh during sleeve phase returns to documented receipt | None |
| Keep export dependency unavailable | PARTIAL | export failure is caught and copy remains truthful | no deterministic failure fixture | Add export-failure fixture and assertion |
| Release deletion or tombstone write fails | PASS | one atomic v2 projection and typed result gate `RELEASE_COMMITTED` | Release storage-failure journey and persistence unit tests | None |
| Undo during/after visual release | PARTIAL | Undo is available only after the deletion+tombstone transaction succeeds, preventing a false pre-commit undo | after-refresh Undo is tested; no explicit assertion that pre-commit Undo is absent and harmless | Add boundary assertion |
| Undo after refresh | PASS | `RESTORE_RELEASE` and absolute `undoUntil` restore completion | Release refresh/Undo journey | None |
| Undo expiry while backgrounded | PARTIAL | expiry uses absolute time and persistence-bound finalization | no visibility/background reconciliation test | Add visibility-change fixture and test |
| Archived/pending source disagreement | PASS | release projection validates exact origin and fails closed | `receiptEndingPersistence.release.test.ts`, release application persistence tests | None |
| Duplicate Release event | PASS | pure reducer preserves state for impossible/duplicate events | `receiptEndingReducer.test.ts` | None |
| Carry designation: no/multiple/ambiguous/Nothing After All/edit/source close | PASS | strict provenance reducer and semantic designation components | designation reducer, provenance, component, and browser suites | None |
| Carry tear below threshold | PASS | `CarryForwardStub` returns to attached safe state | early tear release browser journey | None |
| Carry intake jam | PASS | reducer recovery reason `intake-jam`; same stub retained | Carry ritual recovery journey | None |
| Carry early actuator release | PASS | `released-early` returns to zero and requires explicit reset | pointer + keyboard browser journey | None |
| Carry pointer cancellation | PASS | `MechanicalActuator.onPointerCancel` uses the same safe release handler | source contract exists; no explicit pointer-cancel browser event | Add deterministic pointer-cancel assertion |
| Carry conversion failure | PASS | development-only fault fixture enters reducer recovery and returns to actuator-ready | conversion-failure browser journey | None |
| Cancel before/after tearing | PARTIAL | Cancel exists at recovery and transfer boundaries; checkpoint clearing is typed | no explicit stable-boundary cancel action before conversion | Add receipt-preserving quiet exit at safe phases |
| Refresh at Carry stable boundaries | PARTIAL | privacy-safe session checkpoints exist for extension-ready, stub-separated, actuator-ready, transfer-issued, and recovery | checkpoint writes are tested, but refresh only restores the completed receipt and leaves the checkpoint unexplained | Add checkpoint reconciliation surface without persisting task text |
| Compiler offline/timeout/rate limit/refusal/invalid/server error | PASS | existing Carry Forward fallback mapping and trusted activation gate | Carry release, API, reducer, integration, and E2E suites | None |
| Late response after cancellation | PASS | abort controller and request identity suppress stale results | `carryForwardIntegration.test.ts` and in-tree E2E | None |
| Temporary session expiry | PASS | four-hour expiring task storage and expired-session surface | existing Carry Forward storage and browser tests | None |
| Runtime storage failure | PASS | trusted activation refuses active rendering until required persistence succeeds | integration unit tests and fallback behavior | None |
| Manual fallback | PASS | existing manual plan reducer/runtime is reused | Carry release gate | None |
| Recovery telemetry is content-free and idempotent | PARTIAL | existing telemetry allowlists exclude authored content | no shared recovery-event contract or duplicate-after-refresh test | Add bounded semantic recovery event contract and unit coverage |

## #88 · Motion, sensory, and reduced motion

| Requirement | Result | Production evidence | Executable evidence | Remaining gap |
| --- | --- | --- | --- | --- |
| Keep physical law | PASS | `keepRitualMotion.ts`, Keep CSS and reducer phases use precise/magnetic/friction/settle behavior | motion unit tests and deterministic visuals | None |
| Release physical law | PASS | `releaseRitualMotion.ts`, thermal withdrawal order, explicit corner hold | motion unit tests, browser phase order, visuals | None |
| Carry physical law | PASS | threshold reducer, DOM-local pointer progress, detent and lock phases | threshold/reducer/browser/visual tests | None |
| One source of truth for semantic motion tokens | FAIL | Keep, Release, and Carry each define local durations/easings; CSS values are not mapped from one semantic source | local unit tests only | Add shared typed token source and CSS custom properties; retain issue-owned aliases |
| Typed sensory events | PARTIAL | one `MachineSensoryEvent` union exists | sensory unit coverage exists for the legacy set | Carry reuses unrelated archive/release events instead of distinct Carry milestones; `thermal-unprint-complete` is absent |
| Sensory events bounded and non-blocking | PASS | `SensoryDirector` catches/isolates optional output and never controls reducer progression | director tests and ritual reducer independence | None |
| Preference-aware and user-gesture unlocked | PASS | director preferences and `prime()` on user printing gesture | existing sensory tests | None |
| Carry milestone deduplication | PARTIAL | phase set suppresses duplicates | first-attempt browser behavior | retry never restores actuator milestone eligibility because emitted phase keys are global for component lifetime |
| Reduced motion preserves semantic states | PASS | reduced durations keep identical reducer event sequence | Keep/Release motion tests and Carry reduced-motion browser journey | None |
| Live reduced-motion preference changes | PARTIAL | `usePrefersReducedMotion` listens to media-query changes | no feature-enabled journey changes preference mid-ritual | Add deterministic live preference test |
| Background-tab timing does not fabricate state | PARTIAL | semantic state advances by reducer events rather than CSS completion; Release expiry uses absolute deadline | no focused background reconciliation test | Add visibility/deadline tests |
| No direct ritual AudioContext/vibration calls | PASS | ritual components depend only on `MachineSensoryDirector` | static source evidence | None |
| Sound/haptic disabled states | PARTIAL | preferences are respected globally | no Three Endings focused browser evidence | Add disabled-output fixture/evidence |

## #89 · Accessibility, focus, responsive, and semantic parity

| Requirement | Result | Production evidence | Executable evidence | Remaining gap |
| --- | --- | --- | --- | --- |
| Receipt remains accessible text through transformations | PASS | one semantic `ReceiptArtifact`; decorative sleeve/unprint layers are separate and hidden | Keep/Release continuity and axe journeys | None |
| Native decisions and inputs | PASS | `ReceiptDecisionSurface`, designation fields, Apply/Adjust/Cancel/Undo use native controls | component and browser role/name assertions | None |
| Gesture tap and keyboard alternatives | PASS | Tear button, reinsertion button, actuator Enter/Space/Arrow fallback | Carry ritual browser suite | None |
| Screen-reader gesture announcements | PARTIAL | concise stub/detent/transfer live text exists | no dedicated semantic announcement sequence test; actuator also announces every named milestone in a separate live region | Consolidate to bounded semantic announcements and test no pixel chatter |
| Focus destination per semantic transition | PASS | `ReceiptEndingExperience`, Carry designation/ritual/runtime use explicit heading refs and stable-phase focus | focused journeys assert major headings | None |
| Back/cancel returns focus appropriately | PARTIAL | transitions return to stable headings | triggering-control restoration is not covered and shared Back returns to heading | Add explicit return-focus intent for shared choices and test it |
| Portaled runtime action remains logical and reachable | PASS | PR #97 viewport-owned dock and inert receded ritual layer | in-tree runtime and visual fixtures | None |
| Dialog trap and restore | PASS | existing InspectorSheet/sheet contracts reused | Carry accessibility tests | None |
| One controlled status region per domain | PARTIAL | major domains use concise live regions | overlapping machine and ritual live regions are not asserted against duplicate announcements | Add semantic/live-region inventory test |
| Zero serious/critical axe findings | PARTIAL | focused Keep, Release, Carry journeys each run axe | general accessibility workflow runs legacy/default states, not the complete feature-enabled matrix | Add feature-enabled hardening axe suite |
| Minimum 44px targets | PARTIAL | component CSS claims minimum targets | no comprehensive measured feature-enabled target inventory | Add measurement test |
| No horizontal overflow at 320px | PARTIAL | generic compose viewport matrix covers 320px | ending, recovery, Carry ritual, and runtime states are not covered at 320px | Add state-specific matrix |
| 200% zoom preserves actions/content | PARTIAL | prior component CSS and direct Carry tests cover some zoom states | no feature-enabled Three Endings zoom matrix | Add browser zoom tests for ending and runtime actions |
| Portrait/landscape operational | PARTIAL | canonical layout CSS and generic matrix exist | no full ending/ritual action reachability in landscape | Add feature-enabled landscape tests |
| Reduced motion preserves meaning/focus | PASS | semantic phases and focus remain reducer-driven | reduced-motion ritual tests | Add live-change evidence under #88 |
| Direct and receipt-origin Carry remain truthful | PASS | separate route and mounted receipt-origin host | direct-route and in-tree browser suites | None |
| Manual VoiceOver/NVDA sequence documented | FAIL | no current end-to-end expected announcement document for all three endings | none | Add manual sequence and device checklist documentation |

## Verified implementation scope

The audit constrains PR #98 to these gaps:

1. deterministic recovery/fault fixtures and Carry checkpoint reconciliation
2. safe Carry cancellation at stable physical boundaries
3. shared motion token ownership without replacing issue reducers
4. distinct typed Three Endings sensory events and retry-safe deduplication
5. live reduced-motion and background-deadline evidence
6. feature-enabled axe, semantic, keyboard, target, 320px, landscape, and 200% zoom coverage
7. focused return-focus and bounded live-region corrections
8. recovery, motion, accessibility, persistence, privacy, and manual screen-reader documentation

## Explicit non-goals

This PR will not replace reducers, persistence envelopes, compiler/runtime contracts, TaskPlan schema, direct-route architecture, or established Figma-owned product concepts. Final Build Week release evidence and submission documentation remain owned by #90.
