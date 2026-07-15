# Sensory direction

Issue: #33

The sensory layer is progressive enhancement for the Mobile Instrument. It observes approved machine milestones and never controls `PrinterPhase`, receipt content, or visual progression.

## Architecture

```text
src/mobile-instrument/sensory/
  sensoryTypes.ts
  SensoryDirector.ts
  SoundDirector.ts
  HapticDirector.ts
```

`SensoryDirector` is the only event boundary used by the printer sequence. It coordinates preferences, once-per-transaction guards, feed-loop ownership, reset, and disposal.

`SoundDirector` renders a compact local foley palette into Web Audio buffers. It does not ship third-party audio, create an audio context while sound is disabled, or delay the transaction while audio initializes.

`HapticDirector` maps only approved punctuation events to short vibration patterns. It does not vibrate continuously during paper feed.

## Events

| Event | Sound | Haptic | Visible equivalent |
| --- | --- | --- | --- |
| `register-clack` | dry control contact | short pulse | depressed and locked commit control |
| `barcode-scan` | one concise directional chirp | tiny pulse | single scanner sweep and terminal status |
| `thermal-feed-start` | low looping roller and paper texture | none | paper movement and busy printer state |
| `thermal-feed-stop` | deterministic loop stop | none | paper stops moving |
| `verdict-impact` | restrained low stamp contact | firmer short pulse | verdict lands once |
| `cvs-printer-restart` | two-part mechanism wake | subtle double pulse | rewards status and renewed feed |
| `machine-complete` | intentional silence | none | stable Evidence Viewer |
| `machine-error` | low recoverable fault tone | short double pulse | visible recoverable error state |

## Sound grammar

- no music
- no ambient idle hum
- no sound on item selection
- exactly one barcode event per transaction
- no cartoon effects or cash-register jingles
- low master level
- deterministic thermal loop with explicit start and stop
- final completion remains silent

The buffered foley is generated locally and contains no receipt content, user data, embedded metadata, or network dependency.

## Preference contract

- Sound off prevents audio-context creation on launch and prevents playback.
- Turning sound off during feed stops all active sources immediately.
- Haptics off cancels vibration and suppresses subsequent patterns.
- Sound and haptics remain independently controlled by persisted machine preferences.
- Unsupported APIs and browser audio failures remain silent and non-fatal.

## Lifecycle

Every new transaction resets once-per-transaction event guards. Reset, theme change, interruption, and unmount stop the feed loop and clear haptics. Disposal stops active sources and closes the audio context when one exists.

## Reduced motion

Reduced motion retains the same sensory event order at lower visual movement. It does not increase sound or vibration intensity. Sound-off, haptics-off, and reduced-motion combinations remain complete because every event has a visible equivalent.

## Manual QA matrix

Review at low volume and muted hardware conditions on:

- iOS Safari
- installed iOS web app
- Android Chrome
- desktop Chrome
- desktop Safari
- Bluetooth output where available

Verify one scan chirp, clean feed-loop boundaries, immediate mute behavior, silent false completion before CVS restart, and no residual audio after reset or navigation.
