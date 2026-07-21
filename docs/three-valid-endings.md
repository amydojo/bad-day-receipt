# Three Valid Endings production contract

Issue: #90  
Parent: #79  
Canonical design: Figma page `11 · THREE VALID ENDINGS · PRINTER CONTINUITY`

This document is the current release contract for the post-receipt product architecture. Historical issues #62–#77 remain implementation history. PR #78 remains the shipped compiler and One Thing Mode runtime foundation; Three Valid Endings changes the completed-receipt decision and the physical handoff into that existing trusted runtime.

## Product boundary

Receipt completion is independently complete. A successful print produces one frozen `CompletedReceiptSnapshot` before any ending is selected. The receipt does not need to be kept, released, or carried forward to become true.

The current post-receipt flow is:

```text
PRINT COMPLETE
  → The day is documented.
      ├── END THE DAY HERE
      │     ├── KEEP RECEIPT
      │     └── LET IT GO
      └── CARRY ONE THING FORWARD
            → user-designated obligation
            → interaction budget
            → physical Carry Forward ritual
            → existing validated compiler/runtime boundary
```

Keep preserves the frozen receipt in the private local archive. Let It Go removes the exact local receipt projection only after persistence confirms the release transaction and exposes a bounded Undo window. Carry Forward preserves the completed receipt, asks the user to designate one remaining obligation, and creates a separate temporary task context. Changing direction is not user error.

## Production feature flag

The in-tree Three Valid Endings interface is a Vite build-time feature and requires the exact value:

```text
VITE_THREE_ENDINGS=true
```

A production Vercel build is not allowed to continue unless both conditions are true:

```text
VERCEL_ENV=production
VITE_THREE_ENDINGS=true
```

`scripts/assert-production-three-endings.mjs`, invoked through `prebuild`, fails closed when a production build is missing that exact flag. Preview and local development retain intentional flag control.

Source-tree identity does not prove a build-time feature flag. A deployment may contain the same source SHA while emitting a legacy feature-disabled bundle. Final release proof therefore requires a fresh production build after the Production environment variable is present and a clean live browser observation of the enabled interface.

## Canonical live assertions

A new receipt on `https://bad-day-receipt.vercel.app` must visibly expose:

```text
The day is documented.
END THE DAY HERE
CARRY ONE THING FORWARD
```

Selecting End the Day Here must expose both:

```text
KEEP RECEIPT
LET IT GO
```

The legacy Evidence Viewer actions must not be the canonical completed-receipt interface:

```text
SHARE
SAVE
ADD TO DOJO ARCHIVE
MORE
NEW
```

The legacy Evidence Viewer may remain in the bundle only as the explicit flag-off rollback path while the rollout flag exists. It is deprecated as the production receipt-origin product surface. The former black Carry Forward bridge is not proof that Three Valid Endings is enabled.

## Direct Carry Forward ownership

`/carry-forward` remains a separately addressable direct-entry route owned by the existing Carry Forward product boundary. It starts without a receipt snapshot, receipt archive provenance, or a claim that a day was documented. Receipt-origin Carry Forward remains mounted in the same printer and receipt tree; it does not hard-navigate to simulate continuity.

Both origins converge on the same trusted compiler boundary at `/api/compile-task`, strict `TaskPlan` validation, bounded repair, five typed runtime step kinds, manual fallback, and four-hour temporary task expiry.

## Persistence and privacy

- The completed receipt is frozen before any ending decision.
- Keep writes the exact receipt to the versioned local private archive and claims success only after a confirmed write.
- Let It Go creates a bounded local tombstone, removes the exact source projection atomically, and restores the exact origin during Undo.
- Storage unavailability or write failure never fabricates preservation, deletion, issuance, compilation, or activation.
- Carry Forward task and optional source text remain outside receipt history, receipt exports, release telemetry, and receipt analytics.
- Successful runtime persistence excludes the original source text.
- Telemetry is content-free and bounded to typed operational events.
- No ending performs an automatic external action.
- Compiler or ritual failure does not invalidate the receipt.

## Figma-to-code matrix

| Figma reference | Production owner | Reducer or semantic state | Deterministic evidence | Known limitation |
|---|---|---|---|---|
| [Full handoff `136:2`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=136%3A2&locale=en&type=design) | `PrinterShell`, `ReceiptArtifact`, receipt-ending layout styles | printer `complete` plus receipt-ending state | focused visual fixtures and viewport matrix | Figma is the material and hierarchy contract, not a replacement architecture |
| [Primary path `150:1677`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1677&locale=en&type=design) | `ReceiptEndingExperience`, `ReceiptDecisionSurface` | `settling → documented → end-choice | `three-endings-foundation.spec.ts`, production smoke | production proof requires the flag-enabled live bundle |
| [Keep `150:1847`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1847&locale=en&type=design) | `KeepReceiptRitual`, `ArchivalSleeve` | `keep-ritual`, `keep-recovery` | Keep reducer, persistence, E2E, visual fixtures | local archive availability depends on browser storage |
| [Release `150:1919`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1919&locale=en&type=design) | `ReleaseReceiptRitual`, `ReleaseSlot` | `release-ritual`, `release-recovery` | release transaction, Undo, expiry, failure fixtures | Undo is intentionally bounded by the persisted deadline |
| [Carry `150:2050`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2050&locale=en&type=design) | `CarryForwardDesignation`, `CarryForwardRitual`, `MechanicalActuator` | `carry-selected` plus ritual state | designation, tear, intake, actuator, transfer, recovery fixtures | compiler availability is independent of receipt truth |
| [Applying `150:2204`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2204&locale=en&type=design) | `CarryForwardRuntimeHost` | applying boundary | compiler/runtime E2E and deterministic visuals | no paid live GPT request in ordinary CI |
| [Quiet One Thing Mode `150:2212`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2212&locale=en&type=design) | validated One Thing Mode runtime | active temporary runtime | runtime, Complete Plan, Why This View, persistence fixtures | temporary state expires after four hours |
| [Reduced motion `156:2323`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=156%3A2323&locale=en&type=design) | shared motion policy and ritual components | same semantic state order with reduced interpolation | reduced-motion browser and visual suites | sensory output still follows user/device capability |

## Executable release gate

The exact local and CI gate is:

```bash
npm ci
npm run typecheck
npm test
npm run test:receipt-regression
npm run test:carry-forward
npm run release:carry-forward
npm run release:three-endings
npm run mobile-quality
VERCEL_ENV=production VITE_THREE_ENDINGS=true npm run build
```

The fail-closed proof is:

```bash
VERCEL_ENV=production VITE_THREE_ENDINGS=false npm run build
```

That command must fail with the Three Endings production release-guard message.

The deterministic live-domain proof is:

```bash
PRODUCTION_BASE_URL=https://bad-day-receipt.vercel.app npm run test:production-smoke
```

It uses an isolated browser context, blocks service workers, performs no paid or uncontrolled GPT request, captures the documented decision, Keep/Let Go selector, receipt-origin Carry designation, and direct-entry Carry screen, runs axe in the production decision state, and fails when the legacy toolbar is present.

## Release evidence rule

The deployment previously associated with pre-rollout technical evidence is not final production proof merely because it shares a source tree with tested code. “PRODUCTION PROVEN” is reserved for a fresh deployment whose source SHA matches final `main`, whose Production build received `VITE_THREE_ENDINGS=true`, and whose clean live browser passes `test:production-smoke` on the real production domain.

Do not record a future deployment ID, asset fingerprint, timestamp, screenshot, or test result in this document before it exists. Exact release evidence belongs in the closing PR, issue #90, and epic #79 after the live production assertions pass.
