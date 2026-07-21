# Receipt ending state machine

Issues: #80, #81, #82, #83  
Parent: #79

This document describes the completed-receipt foundation, the shared Three Valid Endings decision, the implemented Keep Receipt ritual, and the implemented Let It Go ritual. Carry Forward remains at a truthful handoff boundary.

## Domain boundary

The printer reducer remains authoritative only for printing:

```text
idle → arming → scanning → calculating → feeding → stamping → complete
```

Receipt disposition begins after a successful print:

```text
PrinterPhase.complete
        ↓
CompletedReceiptSnapshot
        ↓
ReceiptEndingState
```

Keep and Release phases are not `PrinterPhase` values. The receipt already exists before either ritual begins.

## Completed receipt ownership

`CompletedReceiptSnapshot` is runtime validated, deeply frozen, and keyed by `receiptNumber`. It contains the exact data required to rerender the receipt and excludes Carry Forward task text, source context, compiler output, generated drafts, evidence quotes, and animation progress.

## Shared transition graph

```text
new successful print → settling --700ms--> documented
restored pending receipt → documented
restored unexpired Release tombstone → release-ritual/complete

documented --End the Day Here--> end-choice
documented --Carry One Thing Forward--> carry-selected

end-choice --Keep Receipt--> keep-ritual/cut
end-choice --Let It Go--> release-ritual/cut
end-choice --Back--> documented

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

The actual receipt and printer remain mounted. Archive persistence clears `pendingReceipt` only after the exact v2 write returns `saved`. The private archive is newest-first, deduplicated by receipt number, and capped at five entries.

## Let It Go graph

```text
release-ritual/cut
  → unprint-total
  → unprint-lines
  → unprint-receipt-number
  → unprint-acknowledgment
  → soften
  → slot-opening
  → receiving
  → corner-hold
  → slot-closing
  → committing
      ├── saved → complete + Undo
      └── unavailable|failed → release-recovery/release

complete --Undo Release--> undoing
  ├── saved/pending-origin → documented
  ├── saved/archive-origin → private archive
  └── unavailable|failed → release-recovery/undo

complete --undo deadline expires--> ending domain cleared
```

The reducer contains no timers, React, DOM access, CSS callbacks, storage, navigation, analytics, audio, haptics, export logic, or network calls. Duplicate and impossible events preserve state deterministically.

## Release timing ownership

`releaseRitualMotion.ts` owns the canonical timing contract:

```text
cut                      180ms
unprint total            220ms
unprint lines            520ms
unprint receipt number   180ms
unprint acknowledgment   260ms
paper soften             260ms
slot opening             180ms
slot receiving           420ms
final corner hold        100ms
slot closing             180ms
```

One abortable effect schedules the semantic event for the current phase. CSS completion events never determine reducer truth. The final corner hold is an explicit reducer phase.

`VITE_RELEASE_RITUAL_TEST_HOLD_MS` is an opt-in test-only phase hold for deterministic visual capture. It is unset in production.

## Material continuity

The immediate ending path keeps one semantic receipt root mounted:

```text
[data-receipt-artifact]
[data-receipt-number]
```

Stable regions include:

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

Release adds deterministic visual targets without replacing semantic content:

```text
data-release-region="total"
data-release-region="record"
data-release-region="receipt-number"
data-release-region="acknowledgment"
data-release-rank
```

The same printer remains mounted:

```text
[data-printer-shell]
[data-printer-mode]
[data-release-state]
[data-printer-region="release-slot"]
```

The release slot is inside `PrinterShell`. There is no second appliance, blank-paper replica, screenshot, canvas replacement, portal copy, or phase-dependent receipt key.

## Thermal withdrawal order

The visual release order is fixed:

1. grand total
2. line items in reverse order and the remaining record surface
3. receipt number
4. acknowledgment and `DAY DOCUMENTED` last

The effect uses clipped paper-colored withdrawal masks and a quiet thermal edge. It does not rely on a whole-line opacity fade or per-character animation. Semantic receipt text remains available during visual unprinting and leaves the reading order only after the release transaction succeeds.

## Paper and release slot

After the receipt is visually blank, its lower edge softens through restrained radius, shadow, and sub-pixel rotation changes. It is not burned, shredded, torn, crumpled, or particle-dissolved.

The same blank receipt travels toward one narrow in-chassis slot. The final visible corner pauses for 100ms, then printer geometry occludes the receipt and the slot closes flush. Opacity does not fake insertion.

## Release tombstone

The persistence-v2 envelope remains on its existing key and version.

```ts
interface PendingRelease {
  receipt: CompletedReceiptSnapshot
  undoUntil: string
  origin:
    | { kind: 'pending' }
    | { kind: 'archive'; archivedAt: string }
  previousDisposition: ReceiptDisposition | null
}
```

Legacy tombstones without `origin` remain readable as pending-receipt releases. Archive origin is required to restore the exact original `archivedAt` after Undo. `previousDisposition` restores the disposition that existed before release.

Default Undo duration:

```text
8,000ms
```

`undoUntil` is an absolute ISO timestamp and is the source of truth across refresh.

## Atomic Release transaction

At `slot-closing`:

1. The source is validated against `pendingReceipt` or the exact archived entry.
2. A tombstone containing the frozen receipt, absolute Undo deadline, origin, and previous disposition is created.
3. The source projection is removed.
4. One `released` disposition is projected.
5. One complete v2 payload is written.
6. Only a confirmed `saved` response updates React state and dispatches `RELEASE_COMMITTED`.

Successful state:

```text
pendingRelease       contains the frozen receipt and Undo deadline
pendingReceipt       null for pending-origin release
privateArchive       excludes the exact archive-origin receipt
receiptDispositions  contains one released disposition
```

A failed write does not update React state, clear the pending receipt, remove an archive entry, or claim release.

## Exact Undo transaction

Undo performs one complete write:

- pending-origin restores the exact frozen snapshot to `pendingReceipt`
- archive-origin restores the snapshot with its original `archivedAt`
- previous disposition is restored or the temporary released disposition is removed
- `pendingRelease` is cleared
- React state updates only after `saved`

The Undo effect caches one promise per receipt and deadline so React Strict Mode setups observe one exact transaction.

A failed initial Release and a failed Undo have separate recovery ownership. Initial Release recovery may return to the unchanged source. Failed Undo recovery may retry Undo or return to the still-valid released completion; it never claims the source was already restored.

## Expiry and refresh

Refresh during an active Undo window restores the released completion and keyboard-reachable Undo action. On or after `undoUntil`, the tombstone is finalized through a v2 write. The source was already removed by the successful release transaction; expiry does not perform a second deletion.

Refresh before successful Release persistence restores the unchanged pending receipt or archive source. #83 does not persist transient animation phases; exact mid-ritual restoration remains owned by #87.

## Failure copy

Initial Release failure:

```text
RECEIPT STILL VALID

The receipt is still here.
The release could not be confirmed on this device.
Nothing has been removed.
```

Failed Undo:

```text
RECEIPT STILL VALID

The receipt is ready to return.
The undo could not be confirmed on this device.
```

Both paths preserve the frozen receipt, provide a retry, and allow local export through the existing export implementation. No destructive warning, blame, or technical storage jargon is used.

## Completion

Completion exists only after the Release write returns `saved`:

```text
RECORD CLOSED
NOTHING ELSE REQUIRED

The day can end here.
Nothing has been added to tomorrow.

UNDO RELEASE
```

No Share, Export, New Receipt, Carry Forward, achievement, or continuation action appears on the immediate completion surface.

## Archived receipt release

Archived receipt detail exposes `LET IT GO` as a secondary local-record action. The ritual runs in the same main receipt and printer tree. Successful release removes only the exact matching archive entry. Undo restores the same snapshot and original `archivedAt`, then returns to the private archive index.

## Sensory ownership

Release milestones are typed and deduplicated by `receiptNumber + event`:

```text
receipt-cut
thermal-unprint-start
paper-tension-release
release-corner
release-close
```

They respect the existing sound and haptic preferences. There is no ambient loop, reward melody, success chime, or sensory output during render.

## Reduced motion

Reduced motion preserves every semantic phase, the explicit corner hold, the persistence boundary, completion, and Undo. Large receipt travel is replaced with short fades, small corrections, and restrained occlusion changes. It never skips from Let It Go directly to completion.

## Focus and accessibility

- choosing Let It Go is the final required interaction before automatic choreography
- no confirmation dialog, Back, or Continue appears during the ritual
- one concise “Releasing the receipt” announcement occurs at start
- microphases are not announced
- semantic receipt text remains available during visual unprinting
- completion heading receives focus after persistence succeeds
- recovery heading receives focus after failure
- Undo is a native, keyboard-reachable button
- all actions meet the existing minimum target contract
- no color-only meaning is introduced
- refresh during the Undo window restores the accessible completion surface

## Release privacy and telemetry

Release persistence contains only receipt-domain data already present in the local machine envelope. It never contains Carry Forward task text or source context.

Any future release telemetry may record only bounded semantic events such as started, completed, undone, expired, or failed. It must never contain receipt text, labels, line items, total, receipt number, archive identifiers, task text, or source context. Product copy does not claim deletion of anonymous operational telemetry already emitted.

## Feature flag

The in-tree experience is enabled only when:

```text
VITE_THREE_ENDINGS=true
```

Production remains disabled by default. Persistence-v2 archive and tombstone data remain readable when the feature flag is disabled.

## Direct Carry Forward ownership

`/carry-forward` remains separately addressable. #83 does not alter its compiler, validation, fallback, temporary storage, or One Thing Mode runtime.

## Deferred scope

- #84: user-designated remaining obligation and humane default preset
- #85: Carry Forward stub, reinsertion, actuator, and Field Transfer
- #86: in-tree compiler and One Thing Mode integration
- #87: interruption and exact mid-ritual recovery
- #88: shared affective motion and sensory refinement
- #89: final accessibility and responsive ownership
- #90: production visual parity and release gate

## Validation status

Reducer, motion, persistence, component, privacy, browser, and deterministic visual fixtures are committed. GitHub-hosted workflows remain unavailable while the monthly Actions allowance is exhausted. Vercel may reject branch deployments when its build-rate limit is active; that is reported separately from compilation failure. Browser certification is claimed only for browsers that execute assertions.
