# Mobile Instrument release quality gate

Issue: #35

This document is the release record for Mobile Instrument Mode v2. Automated checks prove repeatable product contracts. Real-device checks prove browser chrome, safe areas, audio unlock, haptics, native sharing, and installation behavior that emulation cannot establish.

## Automated release commands

```bash
npm test
npm run build
node scripts/analyze-build.mjs
npm run test:e2e
npm run test:accessibility
npm run test:viewports
npm run test:visual -- --project=chromium-mobile --project=chromium-desktop
```

The `mobile-quality` GitHub Actions workflow runs these gates for every pull request targeting `main` and can also be started manually.

## Product contracts under test

| Scene | Required scroll owner | Body behavior |
| --- | --- | --- |
| Compose | catalog | fixed and stationary |
| Printing | none | fixed and stationary |
| Artifact | receipt | fixed and stationary |
| Recovery | recovery | fixed and stationary |
| Sheet open | sheet | underlying scene inert |

The release suite records the motion milestone trace and proves legal ordering for the standard and CVS paths. It also checks rapid commit protection, one scan milestone, the CVS false ending, coupon restart, Evidence Viewer scrolling, reset focus, malformed persistence recovery, hidden-scene inertness, and horizontal overflow.

## Browser and viewport automation

Baseline browser projects:

- Chromium desktop at 1440×900
- WebKit desktop at 1440×900
- Chromium mobile emulation
- WebKit mobile emulation

Intentional viewport matrix:

- 320×568
- 375×667
- 390×844
- 393×852
- 430×932
- 667×375 mobile landscape
- 768×1024 tablet boundary
- 1440×900 desktop workbench

Emulation is evidence for layout, state, scroll ownership, keyboard behavior, and deterministic platform adapters. It is not evidence for physical-device browser chrome or hardware APIs.

## Accessibility gate

Automated axe checks run against:

- Compose
- active Printing scene
- completed Evidence Viewer
- More evidence sheet

Blocking findings are critical or serious WCAG A and AA violations. The suite also verifies hidden scenes are inert and absent from the rendered tab path, the completed receipt remains semantic, focus moves once on completion, and reset returns focus to Compose.

Manual accessibility review remains required for:

- complete keyboard journey
- VoiceOver on iOS Safari
- VoiceOver on macOS Safari or NVDA in a supported browser
- 200% desktop zoom
- enlarged mobile text
- reduced motion
- sound off
- combined sound-off and reduced-motion journey

## Deterministic visual evidence

The visual workflow captures:

- Compose ready
- selected ledger
- settings sheet
- chamber entry
- scanning
- printer wake
- standard feed
- verdict
- standard Evidence Viewer
- CVS apparent completion
- CVS coupon feed
- CVS Evidence Viewer at top, middle, and bottom
- More sheet
- desktop workbench
- desktop completed artifact

The development-only `qualityPhaseHold=1` query freezes legal printer phases long enough for deterministic capture. It does not change production timing.

## Manual real-device matrix

Record the exact device, operating-system version, browser version, display mode, date, and reviewer. Do not mark a row complete from responsive desktop preview.

| Target | Browser mode | Required checks | Status | Evidence |
| --- | --- | --- | --- | --- |
| Real iPhone | Safari browser | safe areas, browser chrome, motion rhythm, native share, sound unlock | Pending | |
| Real iPhone | Added to Home Screen | standalone sizing, launch, safe areas, update behavior | Pending | |
| Real Android phone | Chrome | viewport ownership, back behavior, sound, vibration support, share | Pending | |
| macOS | Safari | desktop workbench, keyboard, VoiceOver, export | Pending | |
| Desktop | Chrome | desktop regression, zoom, export, PWA update | Pending | |

The project owner previously completed a real-device review of the approved V4 visual choreography. Before closing #35, add the exact device and browser details here and complete the broader release matrix above.

## Manual journey checklist

### Standard

- [ ] Compose opens as the instrument control surface.
- [ ] Catalog scroll does not move the page.
- [ ] Rapid Ring It Up taps start one transaction.
- [ ] Chamber entry causes no viewport jump.
- [ ] Scan occurs once.
- [ ] Blank paper precedes printed evidence.
- [ ] Feed and verdict preserve the approved V4 rhythm.
- [ ] Evidence Viewer owns receipt scrolling.
- [ ] Share and save recover from cancellation or failure.
- [ ] New returns to Compose with useful focus.

### CVS

- [ ] Primary receipt reaches an apparent completion.
- [ ] False-ending silence feels intentional rather than frozen.
- [ ] Additional rewards and printer restart occur once.
- [ ] Coupon content appears only during the second feed.
- [ ] The entire coupon tail is readable without body scroll.
- [ ] True completion settles into the Evidence Viewer.

### Reliability

- [ ] Reload during Compose is deterministic.
- [ ] Reload during Printing follows the documented recovery policy.
- [ ] Malformed storage does not crash the instrument.
- [ ] Missing share, clipboard, vibration, or audio support is non-fatal.
- [ ] Muting during feed stops active sound immediately.
- [ ] Orientation change at a non-destructive point preserves the draft.
- [ ] No body lock, timer, animation, listener, audio source, or object URL remains after reset.

## Closure rule

Issue #35 closes only when:

1. GitHub unit, build, bundle, browser, accessibility, viewport, and visual gates pass.
2. Visual evidence is reviewed rather than blindly updated.
3. The real-device matrix contains concrete evidence.
4. Known browser limitations are documented.
5. The final release candidate preserves the approved #29 rhythm and object physics.
