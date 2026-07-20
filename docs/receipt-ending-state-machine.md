# Receipt ending state machine

Issues: #80, #81  
Parent: #79

This document describes the completed-receipt foundation and the shared Three Valid Endings decision. It does not claim that preservation, release, or printer-continuity Carry Forward choreography is shipped.

## Domain boundary

The printer reducer remains authoritative only for physical printing:

```text
idle → arming → scanning → calculating → feeding → stamping → complete
```

Receipt disposition begins only after a successful `complete` state:

```text
PrinterPhase.complete
        ↓
CompletedReceiptSnapshot
        ↓
ReceiptEndingState
```

Keep, Release, and Carry Forward do not belong in `PrinterPhase`. They operate on a receipt that already exists.

## Completed receipt ownership

`CompletedReceiptSnapshot` is created once from the exact committed print inputs. It contains:

- receipt number and completion time
- theme identity
- detached receipt items
- total, item count, and status
- optional anomaly
- share copy

It excludes:

- Carry Forward task text
- source context
- compiler output
- generated drafts
- evidence quotes
- animation or gesture progress

The snapshot is runtime validated and deeply frozen. Its stable identity is `receiptNumber`.

## Shared transition graph

A newly printed receipt and a restored pending receipt intentionally enter different states:

```text
new successful print → settling --700ms--> documented
restored pending receipt → documented
```

The 700ms pause belongs to an abortable React effect. The pure reducer contains no timer, DOM, storage, analytics, sound, haptics, or navigation behavior.

The shared decision graph is:

```text
documented --End the Day Here--> end-choice
documented --Carry One Thing Forward--> carry-selected

end-choice --Keep Receipt--> keep-selected
end-choice --Let It Go--> release-selected
end-choice --Back--> documented

keep-selected --Back--> end-choice
release-selected --Back--> end-choice
carry-selected --Back--> documented

any active state --failure--> recovery --recover--> documented
```

Back never returns to `settling`. The completion pause is not replayed after refresh or local navigation.

## Material continuity

The feature-enabled path keeps one semantic receipt root mounted:

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

The current visible closing is essential receipt content:

```text
THIS DAY REQUIRED MORE
THAN THE RECORD SHOWS.

DAY DOCUMENTED
```

Future ritual regions remain mounted, visually inactive, and absent from the accessibility tree. Issues #82, #83, and #85 will animate these same regions rather than replacing the receipt with a second object.

## Completion pause and focus

During `settling`:

- the completed printer and receipt remain visible
- no decision surface is rendered
- no ending action exists in the accessibility tree
- no Carry Forward copy is announced
- utility actions remain absent

After `PRINT_COMPLETION_SETTLED`, focus moves to the documented heading and one concise polite message is available:

> The day is documented. Choose whether to end here or carry one thing forward.

Every later semantic transition focuses its new heading. The receipt remains independently reachable and readable.

## Equal-dignity decision contract

The documented surface presents:

```text
END THE DAY HERE
Nothing else will be asked of you.

CARRY ONE THING FORWARD
Choose one remaining obligation and make it smaller.
```

The end disposition surface presents:

```text
KEEP RECEIPT
Preserve it privately.

LET IT GO
Release it after it has been acknowledged.
```

Each pair uses the same native button component, dimensions, border, typography, interaction feedback, and DOM structure. No branch receives brighter color, larger scale, privileged motion, or reward language.

## Temporary downstream handoff states

Issue #81 stops at truthful handoff boundaries:

- `keep-selected`: ready for preservation; not archived
- `release-selected`: ready for release; nothing deleted
- `carry-selected`: continuation selected; no obligation designated

These states expose stable `data-next-ritual-slot` regions and a Back action. They do not persist a disposition, erase content, create a task seed, hard-navigate, or call the compiler.

Ownership remains:

- #82: preservation ritual and private archive
- #83: release ritual, deletion, and Undo Release
- #84: user-designated remaining obligation and humane default preset
- #85: physical stub, reprocessing, actuator, and Field Transfer
- #86: existing compiler and One Thing Mode integration

## Utility ownership

The feature-enabled shared decision does not expose Share, Export, Archive, Reprint, New Receipt, or a competing Carry Forward banner.

The existing `EvidenceViewer` and its utilities remain unchanged when `VITE_THREE_ENDINGS` is disabled. Later Keep completion work will provide a truthful post-preservation utility context without pretending archival persistence has already occurred.

## Persistence v2

The existing storage key remains unchanged so current installations migrate in place. The envelope version is `2`.

Validated fields:

```text
pendingReceipt
pendingRelease
privateArchive
receiptDispositions
```

`pendingReceipt` is operational. The remaining fields retain safe empty defaults until their owning issues are implemented.

### v1 migration

A v1 envelope preserves:

- draft
- selected theme
- receipt history
- sound and haptic preferences
- interrupted print recovery
- last-completed metadata

Invalid new fields are repaired independently rather than deleting valid neighboring legacy data.

### Interrupted printing

`pendingCommit` restores committed items and theme as a clean editable draft, then clears itself. This recovery remains independent from `pendingReceipt`.

### Storage failure

The completed receipt remains usable in memory when storage is unavailable or a write fails. The decision surface states that durable local recovery is unconfirmed rather than making a false persistence claim.

## Feature flag

The in-tree ending experience is enabled only when:

```text
VITE_THREE_ENDINGS=true
```

With the flag disabled, the merged PR #78 Evidence Viewer and receipt-origin Carry Forward bridge remain unchanged.

The v2 persistence reader is active in both configurations, so disabling the flag after a preview does not make stored v2 data unreadable.

## Direct Carry Forward ownership

`/carry-forward` remains a separately addressable direct-entry utility and test surface. Selecting Carry Forward from the shared receipt decision does not navigate there in issue #81.

## Accessibility contract

- native buttons with minimum 44×44 targets
- action descriptions connected through `aria-describedby`
- one focused heading per semantic transition
- no decision announcement during settling
- no color-only distinction between endings
- stable logical DOM order
- future ritual layers use `aria-hidden="true"`
- reduced motion removes press translation without changing state order

Manual keyboard sequence:

```text
print → documented heading
Tab through two top-level choices
End Here → Keep / Let Go / Back
Back → Carry Forward → Back
```

## Responsive contract

One component tree and one reducer support:

```text
320×568
375×667
390×844
393×852
430×932
667×375
768×1024
1440×900
200% zoom
```

Small and landscape viewports may scroll intentionally. Touch targets and essential receipt text are not reduced to force the complete experience above the fold.

## Validation status

Automated unit and browser coverage is committed for the reducer, initialization semantics, equal-dignity surfaces, settling pause, refresh recovery, DOM continuity, privacy boundary, and direct Carry Forward entry.

GitHub-hosted workflows may fail before checkout while the repository's monthly Actions allowance is exhausted. Such runs are infrastructure deferrals, not application test results, and must not be represented as passing or failing product validation.
