# Receipt ending state machine

Issue: #80  
Parent: #79

This document describes the foundation introduced for Three Valid Endings. It does not claim that Keep, Let Go, or printer-continuity Carry Forward choreography is shipped yet.

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
ReceiptEndingState.documented
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

## Persistence v2

The existing storage key remains unchanged so current installations migrate in place. The envelope version is now `2`.

New validated fields:

```text
pendingReceipt
pendingRelease
privateArchive
receiptDispositions
```

Only `pendingReceipt` is operational in issue #80. The remaining fields are introduced with safe empty defaults for later issues.

### v1 migration

A v1 envelope preserves:

- draft
- selected theme
- receipt history
- sound and haptic preferences
- interrupted print recovery
- last-completed metadata

New fields default safely. Invalid new fields are repaired independently rather than deleting valid neighboring legacy data.

### Interrupted printing

`pendingCommit` retains its existing meaning. On load it restores the committed items and theme as a clean editable draft, then clears itself. This recovery remains independent from `pendingReceipt`.

### Storage failure

The completed receipt remains usable in memory when storage is unavailable or a write fails. The foundation UI does not claim local recovery unless the v2 envelope was saved successfully.

## Feature flag

The in-tree ending boundary is enabled only when:

```text
VITE_THREE_ENDINGS=true
```

With the flag disabled, the merged PR #78 Evidence Viewer and receipt-origin Carry Forward bridge remain unchanged.

The v2 persistence reader is always active, so disabling the flag after a preview does not make stored v2 data unreadable.

## Direct Carry Forward ownership

`/carry-forward` remains a separately addressable direct-entry utility and test surface. Issue #80 does not remove or redesign it.

Later integration work will stop the canonical receipt-origin path from hard-navigating to that route while preserving direct entry.

## Follow-up ownership

- #81 owns the final documented decision and equal-dignity selector.
- #82 owns Keep and private archive semantics.
- #83 owns Let Go, deletion, and Undo Release.
- #84 owns user designation and the recommended preset.
- #85 owns the physical Carry Forward ritual.
- #86 owns integration with the existing compiler and One Thing Mode runtime.
