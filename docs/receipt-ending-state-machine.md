# Receipt ending state machine

Issues: #80, #81, #82  
Parent: #79

This document describes the completed-receipt foundation, the shared Three Valid Endings decision, and the implemented Keep Receipt archival ritual. Release and Carry Forward remain at truthful handoff boundaries.

## Domain boundary

The printer reducer remains authoritative only for physical printing:

```text
idle → arming → scanning → calculating → feeding → stamping → complete
```

Receipt disposition begins only after a successful print:

```text
PrinterPhase.complete
        ↓
CompletedReceiptSnapshot
        ↓
ReceiptEndingState
```

Keep phases are not `PrinterPhase` values. The receipt already exists before preservation begins.

## Completed receipt ownership

`CompletedReceiptSnapshot` is created once from the committed print inputs and is runtime validated and deeply frozen. Its stable identity is `receiptNumber`.

It contains the exact data needed to rerender the receipt:

- receipt number and original completion time
- theme identity and name
- detached receipt items
- total, item count, and status
- optional anomaly
- share copy

It excludes Carry Forward task text, source context, compiler output, generated drafts, evidence quotes, and animation progress.

## Shared transition graph

```text
new successful print → settling --700ms--> documented
restored pending receipt → documented

documented --End the Day Here--> end-choice
documented --Carry One Thing Forward--> carry-selected

end-choice --Keep Receipt--> keep-ritual/cut
end-choice --Let It Go--> release-selected
end-choice --Back--> documented

release-selected --Back--> end-choice
carry-selected --Back--> documented
```

Back never returns to `settling`. The completion pause does not replay after refresh or local navigation.

## Keep Receipt graph

```text
keep-ritual/cut
  → align
  → sleeve-rising
  → sleeve-receiving
  → label-registering
  → archive-opening
  → archiving
  → archive-closing
  → exact v2 archive write
      ├── saved → complete
      └── unavailable|failed → keep-recovery

keep-recovery --retry--> archive-closing + new exact write attempt
keep-recovery --return--> documented
complete --close--> ending domain cleared
```

Explicit reducer events own every transition:

```text
KEEP_CUT_COMPLETED
KEEP_ALIGNMENT_COMPLETED
KEEP_SLEEVE_RAISED
KEEP_RECEIPT_SLEEVED
KEEP_LABEL_REGISTERED
KEEP_ARCHIVE_OPENED
KEEP_RECEIPT_INSERTED
KEEP_ARCHIVE_CLOSED
KEEP_ARCHIVE_COMMITTED | KEEP_ARCHIVE_FAILED
```

The reducer contains no timers, DOM access, React hooks, CSS callbacks, storage, navigation, analytics, sound, haptics, or export logic. Duplicate and impossible events preserve state deterministically.

## Timing ownership

`keepRitualMotion.ts` owns the canonical timing contract:

```text
cut                 180ms
align               120ms
sleeve rising       360ms
sleeve receiving    420ms
label registration  420ms
archive opening     240ms
archiving           520ms
archive closing     220ms
completion stillness 320ms
```

One abortable effect schedules the event for the current phase. The timeout is cleaned up on phase change, receipt change, recovery, completion, and unmount. CSS completion events never determine reducer truth.

`VITE_KEEP_RITUAL_TEST_HOLD_MS` is an opt-in test-only phase hold for deterministic visual capture. It has no effect when unset and is not configured in production.

## Material continuity

The immediate ending path keeps one semantic receipt root mounted:

```text
[data-receipt-artifact]
[data-receipt-number]
```

Stable regions:

```text
paper
header
line-items
total
acknowledgment
closing-mark
perforation
carry-stub
transfer-layer
archive-label
```

The same receipt node survives the shared decision and every Keep phase. No image, canvas, clone, portal copy, or replacement receipt is used during the ritual.

The same printer root also remains mounted:

```text
[data-printer-shell]
[data-printer-mode]
[data-archive-state]
[data-printer-region="archive-bay"]
```

The archive bay is structurally inside `PrinterShell`. It is not a second appliance.

## Receipt closing

The canonical closing remains essential receipt content:

```text
THIS DAY REQUIRED MORE
THAN THE RECORD SHOWS.

DAY DOCUMENTED
```

The clean cut occurs after this closing. Keep does not append Carry Forward language.

## Keep material choreography

### K01 · Cut

The actual receipt advances 6px and becomes mechanically independent. Printer status changes to `RECORD CLOSED`. Sensory milestone: `receipt-cut`.

### K02 · Align

The material stack corrects by 1px with a precise non-elastic easing. Sensory milestone: `archive-align`.

### K03 · Sleeve

A separate `aria-hidden` archival sleeve rises behind the actual receipt. It uses a restrained border, low-opacity material fill, faint edge highlight, and quiet friction shadow. It uses no backdrop blur, glow, or glass-card treatment. Receipt text remains semantic and readable.

Sensory milestone: `sleeve-receive`.

### K04 · Label

The existing archive-label region registers left to right:

```text
BAD DAY RECEIPT · {receiptNumber}
PRIVATE ARCHIVE
```

Sensory milestone: `archive-label`.

### K05 · Archive

The sleeve, receipt, and label move as one material stack into the archive bay in the same printer. Final occlusion is produced by printer geometry rather than opacity disappearance. The drawer closes with a restrained stop.

Sensory milestone: `archive-close`.

### K06 · Completion

Completion exists only after the exact archive write returns `saved`:

```text
Receipt kept with care.

This happened. It was worth recording.
Receipt {receiptNumber} is stored privately.
```

The surface contains only a quiet Close action. Share, export, reprint, Carry Forward, New Receipt, achievement, and continuation prompts are absent.

## Sensory ownership

`keepRitualSensory.ts` maps semantic phases to typed sensory events. Milestones are deduplicated by `receiptNumber + event` and respect the existing sound and haptic preferences.

The generated cues are restrained mechanical textures:

- dry cut tick
- tiny alignment click
- low paper/polymer friction
- short label registration rasp
- muted archive closure

There is no ambient loop, reward melody, success chime, or sensory output during render.

## Truthful persistence transaction

Persistence envelope v2 remains on the existing key and version. #82 does not introduce a migration or storage-version bump.

At the archive-closing boundary:

1. `createKeepArchiveProjection` validates that the active pending receipt matches the ritual receipt.
2. The full next v2 payload is built with a deduplicated archive entry and one `kept` disposition.
3. `persistMachineData(nextPayload)` performs the exact write.
4. Only after `saved` does React update `privateArchive`, update `receiptDispositions`, clear `pendingReceipt`, and dispatch `KEEP_ARCHIVE_COMMITTED`.
5. `unavailable` or `failed` leaves all three React collections unchanged and dispatches `KEEP_ARCHIVE_FAILED`.

Successful state:

```text
privateArchive       contains exact frozen snapshot
receiptDispositions  contains one kept disposition
pendingReceipt       null
```

The original `completedAt` is preserved. `archivedAt` is created for the archive operation. Entries are newest first, deduplicated by receipt number, and capped at `MAX_PRIVATE_ARCHIVE = 5`.

The commit effect caches the promise for one receipt/attempt/timestamp. React Strict Mode setups observe the same transaction rather than issuing or losing duplicate writes.

## Interruption and recovery

Before successful persistence, `pendingReceipt` remains intact. Refresh during the choreography restores the completed receipt directly to `documented`; #82 does not claim exact mid-ritual resume. That belongs to #87.

On storage failure:

```text
The receipt is still here.
The private archive could not be confirmed on this device.
Nothing has been lost.
```

Available actions:

- retry the exact local archive transaction
- export a local copy using the existing export implementation
- return to the documented receipt

Recovery never claims “stored privately.” Retry starts from the archive-closing persistence boundary rather than replaying the entire physical ritual.

## Private archive ownership

The existing History drawer is now the Local Records sheet. It contains:

- a local-only private archive index
- newest-five archive policy
- recent transaction history

Opening an archive entry replaces the current sheet content instead of creating a nested overlay.

Archived detail rerenders the exact stored snapshot with its original receipt number, items, theme, completion timestamp, total, anomaly, acknowledgment, and closing mark. A new DOM instance is allowed in this later historical view; the no-remount invariant applies to the immediate ritual.

## Utility ownership

No utility appears during the Keep ritual or immediate completion.

Archived receipt detail reuses existing implementations for:

- copy text
- full receipt export
- Dojo archive handoff
- reprint

Exports derive from the selected archived snapshot through `createExportForCompletedReceipt`, never from the current live draft.

Reprint loads the archived snapshot’s exact items and theme into the existing printer reducer, creates a new physical receipt number, and leaves the archived entry unchanged.

The feature-disabled `EvidenceViewer` and its current utility behavior remain intact.

## Reduced motion

Reduced motion preserves every semantic phase and the exact persistence transaction. Large travel, friction simulation, and long transitions are replaced with short fades, small corrections, and restrained occlusion changes. It does not jump directly from Keep selection to completion.

## Focus and accessibility

- choosing Keep is the final required interaction before automatic choreography
- no Back or Continue control exists during the ritual
- the ritual container is `aria-busy`
- one concise “Preserving the receipt” announcement occurs at the start
- microphases are not announced
- decorative sleeve and machine parts are `aria-hidden`
- completion heading receives focus once after persistence succeeds
- recovery heading receives focus once after failure
- archive entries and utilities use native buttons with minimum 44×44 targets
- archived receipt text remains semantic and selectable
- focus returns through the existing single-sheet focus contract

## Feature flag

The in-tree experience is enabled only when:

```text
VITE_THREE_ENDINGS=true
```

Production remains disabled by default. The v2 reader and archive data remain readable when the flag is later disabled.

## Direct Carry Forward ownership

`/carry-forward` remains a separately addressable direct-entry utility and test surface. #82 does not alter its compiler, validation, fallback, temporary storage, or One Thing Mode runtime.

## Deferred scope

- #83: release ritual, local deletion, persisted Undo Release
- #84: user-designated remaining obligation and humane default preset
- #85: Carry Forward stub, reinsertion, actuator, and Field Transfer
- #87: interruption and exact mid-ritual recovery
- #88: shared affective motion and sensory refinement
- #89: final accessibility and responsive ownership
- #90: production visual parity and release gate

## Validation status

The complete Vitest suite executed on the exact branch through a temporary preview-only build gate:

```text
Test Files  46 passed | 1 skipped
Tests       238 passed | 2 skipped
```

The exact branch also passed TypeScript and the production Vite build. The temporary test build override was removed afterward.

Feature-enabled Chromium/WebKit journeys and visual captures are committed. GitHub-hosted workflows remain unavailable while the monthly Actions allowance is exhausted, and the standard Vercel build image previously lacked Playwright native browser libraries. Browser certification is reported only when browser assertions actually execute.
