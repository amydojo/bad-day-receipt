# Three Endings hardening contracts

Scope: issues #87, #88, and #89 only. Final release evidence and Build Week submission instructions remain owned by #90.

## Stable truth

The completed receipt is authoritative before any ending begins.

```text
ritual failure ≠ receipt failure
compiler failure ≠ product failure
changing your mind ≠ user error
```

Keep, Let Go, and Carry Forward operate on or after the completed record. A failed optional operation cannot make that record incomplete.

## Persistence and refresh boundaries

| Domain | Stable boundary persisted | Transient state after refresh | Private-content rule |
| --- | --- | --- | --- |
| Shared receipt | documented pending receipt | ending selector returns to documented | receipt storage contains no Carry obligation, source, plan, or evidence |
| Keep | successful archive projection | cut, alignment, sleeve, label, and drawer choreography return to documented or Keep retry | archive write must succeed before complete is shown |
| Release | atomic deletion + tombstone with absolute Undo deadline | pre-commit ritual returns to documented; complete release restores during Undo window | released state is never shown before the atomic projection succeeds |
| Carry designation | bounded in-memory designation | private designation is not reconstructed from a mechanical checkpoint | source text is not written into receipt persistence |
| Carry ritual | session-scoped mechanical boundary: extension-ready, stub-separated, actuator-ready, transfer-issued, or recovery | fractional tear, intake, or actuator progress is discarded; a factual recovery surface explains the nearest safe boundary | checkpoint stores phase, receipt ID, stub ID, semantic milestone, and recovery reason only |
| Applying/runtime | existing temporary Carry Forward store | validated active runtime restores only for its matching receipt | successful progress storage excludes source text; four-hour expiry remains authoritative |

Malformed or foreign Carry checkpoints are cleared. They never create receipt, stub, archive, or task provenance.

A separated stub is not visually reconstructed after refresh. The recovery surface preserves the completed receipt and states that private task text was not restored.

## Recovery actions

Recovery surfaces expose only actions that are legal from the current boundary.

- **Start Carry Forward again** clears the mechanical checkpoint and returns to designation.
- **Return to completed receipt** clears the mechanical checkpoint and leaves the receipt unchanged.
- A live separated stub may retry intake.
- A conversion failure may return the same stub to actuator-ready.
- Keep and Release retries remain persistence-gated.
- Compiler fallback and manual planning continue through the existing trusted runtime boundary.

Recovery telemetry contains only:

- semantic domain
- semantic boundary
- outcome

It never contains receipt text, number, total, obligation, source, draft, plan, or evidence. A session-scoped key prevents duplicate recovery telemetry after refresh.

## Recovery language

Central recovery copy is factual, bounded, and non-shaming.

Allowed examples:

- The receipt is still complete.
- The stub did not enter the printer.
- The adjustment was not issued.
- You can return to the completed receipt.

Forbidden language includes “Oops,” “You failed,” “Try harder,” “Invalid feelings,” and claims that something is wrong with the user.

## Motion source of truth

Semantic durations and easings live in:

- `src/motion/receiptEndingMotion.ts`
- `src/motion/receipt-ending-motion.css`

Issue-owned motion modules retain their existing phase names and exact choreography values through aliases to that shared source.

### Physical laws

**Keep**

- precise and magnetic
- controlled sleeve friction
- no bounce or reward flourish
- archive completion remains persistence-gated

**Let Go**

- decreasing tension and visual weight
- acknowledgment disappears last
- explicit final-corner hold
- no destructive metaphor

**Carry Forward**

- progressive resistance
- deterministic detent and lock
- relief only after commitment
- the same stub remains identifiable through transformation

Semantic state is reducer-owned. CSS completion never creates archived, released, issued, or active state.

## Sensory contract

All ritual output flows through the typed `MachineSensoryDirector`. Ritual components do not call audio or vibration APIs directly.

### Carry Forward semantic events

```text
carry-stub-tear
carry-intake-start
carry-intake-stop
actuator-medium
actuator-heavy
actuator-detent
actuator-lock
transfer-register
transfer-issued
```

Feed start/stop remains shared printer behavior. Release includes a distinct `thermal-unprint-complete` event.

Sensory output is:

- optional
- preference-aware
- user-gesture unlocked
- bounded
- non-blocking
- silent when unsupported
- free of reward, casino, notification, or startling patterns

Carry actuator events emit at most once per attempt. Returning from an early release or conversion recovery to the safe actuator-ready boundary restores eligibility only for actuator milestones; tear and intake events do not replay.

Recovery itself has no generic failure flourish.

## Reduced-motion contract

Reduced motion preserves the complete semantic order. It replaces large translation, deformation, compression, and parallax with stable geometry, short opacity changes, explicit status changes, and focus movement.

It does not:

- skip a decision
- bypass persistence
- collapse a ritual into success
- remove Undo or exits
- remove actuator milestones
- reconstruct an object

The media-query hook responds to live preference changes. A transition already in progress continues through the same reducer graph with reduced durations from the next scheduled phase.

Release expiry uses an absolute deadline and reconciles on `visibilitychange` and `pageshow`, so a backgrounded tab cannot preserve an expired Undo action or fabricate successful finalization.

## Focus and semantic ownership

| Transition | Focus destination |
| --- | --- |
| print completes | “The day is documented.” heading |
| End Here chosen | “How should the receipt leave your hands?” heading |
| browser Back from ending choice | documented heading |
| browser Forward | corresponding ending heading |
| Carry designation begins | designation heading |
| Carry returns with Nothing After All | documented heading |
| stub separates | “Reinsert the same stub.” heading |
| actuator becomes available | actuator-ready heading/control |
| mechanical checkpoint restores | “The receipt is still complete.” recovery heading |
| Applying begins | Applying heading/status surface |
| One Thing Mode activates | current typed step heading/control |
| Complete Plan or Why This View opens | dialog heading; focus trapped inside |
| dialog closes | triggering control |
| completion or End Mode | completed receipt context |

The receded Carry ritual is inert and hidden from the accessibility tree while the in-tree runtime is active. The portaled action dock remains keyboard reachable and visually persistent.

Decorative paper layers, slots, shadows, registration marks, and motion masks are hidden from accessibility APIs. The semantic receipt remains text.

## Responsive ownership

Feature-enabled tests directly verify:

- no serious or critical axe violations in hardened states
- no horizontal page overflow at 320px
- required controls remain reachable at 200% zoom
- minimum 44px decision targets
- portrait and landscape operation
- direct `/carry-forward` without receipt provenance
- receipt-origin Carry Forward without hard navigation

Required exits may scroll into view but may not disappear, become clipped behind the printer, or require two-dimensional page scrolling.

## Manual screen-reader sequences

These sequences are the expected manual QA order. Automated role, name, focus, live-region, and axe tests support them but do not replace device testing.

### VoiceOver · iOS Safari

1. Complete a receipt.
2. Hear the documented heading once, followed by two equal choices.
3. Choose End Here; focus moves to the two-ending heading.
4. Use Back; focus returns to documented without a new page load.
5. Choose Carry Forward; designation fields and Nothing After All are discoverable in DOM order.
6. Use the Tear and Reinsert buttons rather than the drag gestures.
7. Advance the actuator with the semantic button. Announcements mention detent/lock, never pixel progress.
8. After refresh at a separated boundary, hear that the receipt is still complete and encounter restart/return actions.
9. Apply a valid transfer. The primary action, Complete Plan, Why This View, and End remain reachable.

### NVDA · Windows Chrome

1. Navigate the completed receipt and confirm receipt text remains readable.
2. Tab through each decision once; no decorative paper nodes enter the tab order.
3. Open Complete Plan and Why This View; focus remains trapped until close and returns to the trigger.
4. Trigger a Keep or Release persistence failure fixture; hear one factual recovery heading and one bounded status update.
5. Navigate the Carry actuator using Enter, Space, and Arrow Down.
6. Cancel or return at every stable boundary; focus returns to the completed receipt context.
7. At 200% zoom and 320 CSS pixels, verify actions remain reachable without horizontal page scrolling.

Known platform limitation: browser vibration is unavailable on iOS Safari. Meaning and progress never depend on haptics.

## Figma-to-code traceability for PR #98-touched states

| Figma node | Reducer or boundary | Production component | Persistence rule | Sensory | Accessibility | Automated evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `136:2` recovery/accessibility handoff | documented + safe recovery boundary | `ReceiptEndingRecovery` | completed receipt retained; checkpoint is content-free | recovery is silent | focused recovery heading and native restart/return buttons | `three-endings-hardening.spec.ts`, recovery unit tests, recovery visuals |
| `144:442` Keep motion | Keep phase graph | `KeepReceiptRitual` | complete only after archive write | cut, align, sleeve, label, close | receipt semantics remain available; automatic phases are not focus stops | Keep unit/browser/visual suites |
| `145:813` Release motion | Release phase graph + absolute Undo deadline | `ReleaseReceiptRitual` | atomic deletion/tombstone; persisted Undo window | unprint start/complete, tension, corner, close | stable release announcement and accessible Undo/recovery | Release unit/browser/visual suites |
| `146:1749` Carry motion | Carry ritual reducer + semantic thresholds | `CarryForwardRitual` | stable session checkpoint only | typed Carry milestones with retry reset | drag has tap/keyboard equivalents; bounded announcements | Carry reducer, sensory, browser, and visual suites |
| `150:2204` Applying | trusted activation gate | `CarryForwardRuntimeHost` | active runtime waits for required persistence | no success flourish | quiet status surface; cancellation remains available | in-tree integration suite |
| `150:2212` One Thing Mode | existing typed runtime | `CarryForwardRuntimeHost` and existing step shells | matching temporary session only | existing preference-aware output | viewport-owned action dock, dialogs, persistent End | in-tree browser, axe, zoom, and visual suites |
| `156:2323` reduced-motion path | same reducer states | all three rituals | unchanged persistence gates | optional events remain preference-aware | stable geometry, explicit focus/status, required exits | motion units and live reduced-motion browser journey |

## Genuine limitations

- No server-side or cross-device recovery is provided.
- Fractional pointer progress is intentionally not restored.
- Sound and haptics are progressive enhancement; unsupported platforms remain silent.
- Manual VoiceOver and NVDA checks remain release-candidate tasks to execute and record under #90; this document defines the expected sequence without claiming a human device run occurred.
