# Evidence Viewer

Issue: #34

The Evidence Viewer is the completed mobile state of Soft Machine 001. It does not return the user to document flow. The Mobile Instrument remains viewport-owned while the receipt becomes the only scrolling surface.

## Scene contract

```text
Print Chamber
→ evidence settlement
→ pinned machine head
→ internal receipt reader
→ evidence action dock
```

`PrinterPhase === 'complete'` remains the source of truth. The viewer does not introduce a second transaction state.

## Scroll ownership

- document body: locked
- Mobile Instrument shell: fixed
- machine scene: non-scrolling
- `.evidence-viewer__scroll`: sole receipt scroll owner
- More sheet: temporary sheet scroll owner through the existing lock stack

The receipt viewport uses `overscroll-behavior: contain`, prevents horizontal panning, and resets to the top whenever a new receipt number mounts.

## Pinned machine head

The top row contains:

- one focusable artifact heading
- paper identity and recorded status
- the existing printer shell, slot, roller, and status light

The printer remains visually attached to the receipt. Temporary scanner and print-pressure layers are absent in the complete phase.

## Long receipt progress

`calculateReceiptProgress` derives a percentage from the internal viewport only:

```text
scrollTop / (scrollHeight - clientHeight)
```

The aid remains hidden when overflow is less than 48 CSS pixels. It is decorative and not required for screen-reader comprehension.

## Action hierarchy

The fixed mobile dock is:

```text
SHARE · SAVE · MORE · NEW
```

Share and Save reuse the typed artifact pipeline. More opens the existing accessible `MachineBottomSheet` pattern and exposes:

- copy text
- reprint
- full receipt export
- 4:5 share card
- 9:16 story strip
- local receipt details

New resets the printer, preserves valid history, returns to Compose, and restores focus through the existing application reset contract.

## Accessibility

- completion moves focus once to `Receipt complete`
- focus remains stable while the user reads
- the receipt remains semantic DOM
- the internal reader is keyboard-focusable and labelled
- the More sheet traps focus and restores it on close
- action status is announced politely
- no artifact content depends on progress, sound, or haptics

## Persistence

The existing receipt-number guard records each completion once. The viewer does not write a second history record. Malformed persisted history continues through the existing validation layer.

## Validation

Automated coverage includes:

- progress visibility and clamping
- dedicated Evidence Viewer mounting
- focus on completion
- pinned action hierarchy
- body scroll stability
- accessible More sheet
- copy fallback
- long CVS internal scrolling

Manual review remains useful for 200% zoom, enlarged mobile text, iOS safe areas, and long CVS reading comfort.
