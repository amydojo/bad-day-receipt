# Bad Day Receipt accessibility audit

Target: WCAG 2.2 AA where applicable.

## Automated contracts implemented

- semantic receipt remains HTML rather than image-only output
- all selectable charge and paper controls expose pressed state
- primary controls use a 44 CSS pixel minimum target
- every receipt theme passes 4.5:1 ink-on-paper contrast in unit tests
- printer announcements are limited to transaction acceptance, printing, additional rewards, completion, and blocking errors
- reduced motion preserves blank paper, printed content, and completed artifact ordering
- sheets provide dialog names, Escape close, focus containment, and trigger focus return
- decorative slot, roller, shadow, and tear layers remain outside the accessibility tree or have no semantic role
- browser zoom remains enabled

## Manual verification required before release

These checks require actual assistive technology or hardware and must not be marked complete from emulation alone.

- VoiceOver with iOS Safari
- VoiceOver in added-to-Home-Screen mode
- VoiceOver with macOS Safari or NVDA with a supported browser
- 200 percent desktop zoom
- enlarged mobile text
- forced-colors mode
- keyboard-only standard and CVS transactions
- real-device touch-target and safe-area review

## Manual journey

1. Choose paper stock.
2. Select charges and credits.
3. Adjust quantities.
4. Commit the transaction.
5. Hear concise progress announcements.
6. Read the completed receipt in semantic order.
7. Share, save, copy, or begin again.
8. Open and close each machine drawer and verify exact focus return.

Record browser, operating system, assistive technology version, result, and any follow-up issue in the release PR.
