# Mobile Instrument V4 production contract

Figma source: https://www.figma.com/design/XRqYHcr5xJFGe11EYLsMz4

Primary review page: `08 · Timed Motion Test`

Approved flows:

- `01 · STANDARD RECEIPT`
- `02 · CVS PRODUCTION · FULL FLOW`

## Architecture

`PrinterPhase` remains the domain source of truth. The mobile instrument derives scene ownership from that phase and exposes a stable `data-motion-milestone` for styling, accessibility review, and bounded end-to-end assertions.

The production score is centralized in `src/printer/productionMotion.ts`. The printer sequence remains abort-safe through one `AbortController`; reset and unmount cancel waits, animation frames, and thermal feed audio.

No visual milestone controls business progression. Audio and haptic events are emitted as optional side effects and never determine timing.

## Standard score

| Beat | Duration |
| --- | ---: |
| Commit response | 100ms |
| Button depression | 80ms |
| Dock compression | 420ms |
| Chamber settle | 320ms |
| Pre-scan breath | 180ms |
| Scanner sweep | 520ms |
| Post-scan breath | 180ms |
| Printer wake | 180ms |
| Blank-paper hold | 120ms |
| Blank leader | 220ms |
| Receipt feed | 760ms |
| Verdict silence | 680ms |
| Verdict impact | 220ms |
| Evidence settlement | 360ms |

The paper feed is intentionally slower than the scanner. Blank paper appears before issued content, and the verdict cannot land before the feed and silence complete.

## CVS score

The CVS journey includes the complete standard opening, then diverges after the primary feed.

| Beat | Duration |
| --- | ---: |
| Primary receipt feed | 820ms |
| Completion settle | 220ms |
| Apparent completion | 180ms |
| False-ending silence | 1080ms |
| Additional rewards reveal | 180ms |
| Reading hold | 300ms |
| Printer restart | 220ms |
| Coupon feed | 980ms |
| True-complete hold | 520ms |
| Evidence settlement | 360ms |

Coupon content remains absent until the restart phase.

## Motion character

- Immediate input acknowledgement
- Measured chamber transformation
- One barcode event per transaction
- Visible stillness during suspense beats
- Longest physical action reserved for paper production
- No bounce, elastic spring, full-screen flash, spinner, skeleton, or generic loading indicator
- Verdict lands once and remains stable

## Reduced motion

Reduced motion keeps the causal sequence:

`accepted → scanned → blank paper → printed evidence → complete`

CVS additionally preserves:

`primary receipt → apparent completion → additional rewards → coupon reveal → true completion`

Large spatial movement and long travel are removed, but durations remain non-zero so state changes are comprehensible.

## Sensory boundary

Typed optional events:

- `register-clack`
- `barcode-scan`
- `thermal-feed-start`
- `thermal-feed-stop`
- `verdict-impact`
- `cvs-printer-restart`

Sound-off never creates or depends on an audio context. Muting or interruption stops the feed loop immediately. Visual completion never waits for audio.

## Scene and scroll ownership

- Compose: application catalog owns scroll
- Printing: no user scroll owner
- Artifact: receipt viewport owns scroll
- Sheet: accessible sheet owns scroll and locks the background

Inactive mobile scenes remain inert and removed from the accessibility tree. Desktop retains the workbench presentation.

## Tuning

Change timing only in `productionMotion.ts`. Do not insert component-local timing literals or alter domain state to tune presentation. Update tests and this table when values change.

## Validation focus

- 320×568, 390×844, and 430×932 mobile viewports
- Standard and CVS journeys
- Sound-off and reduced-motion journeys
- Blank-before-print ordering
- Stable body scroll
- Long CVS artifact readability
- Clean reset and replay
- Desktop visual regression
