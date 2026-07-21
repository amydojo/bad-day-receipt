# Three Valid Endings production contract

Issue: #90  
Parent: #79  
Canonical design: Figma page `11 · THREE VALID ENDINGS · PRINTER CONTINUITY`

This document is the current release contract for the post-receipt product architecture. Historical issues #62–#77 remain implementation history. PR #78 remains the shipped compiler and One Thing Mode runtime foundation. PR #99 shipped the Three Valid Endings completed-receipt decision and physical handoff into that trusted runtime.

## Product boundary

Receipt completion is independently complete. A successful print produces one frozen `CompletedReceiptSnapshot` before any ending is selected. The receipt does not need to be kept, released, or carried forward to become true.

The production post-receipt flow is:

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

Keep preserves the frozen receipt in the private local archive. Let It Go removes the exact local receipt projection only after persistence confirms the release transaction and exposes a bounded Undo window. Carry Forward preserves the completed receipt, asks the user to designate one remaining obligation, and creates a separate temporary task context.

Changing direction is not user error. Nothing else is required after the receipt is documented.

## Production feature guard

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

Source-tree identity alone does not prove a build-time feature flag. A deployment may contain the same source SHA while emitting a legacy feature-disabled bundle. Final release proof therefore requires a fresh production build and a clean live browser observation of the enabled interface.

That proof now exists for deployment `dpl_HGwpQHjsk15ZTn43jYnHHF6Gkz6P`, built from final production implementation SHA `00e23fc4cdac818e3fa5e86510a677a96ebb303d`.

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

The legacy Evidence Viewer may remain in the bundle only as the explicit flag-off preview or local rollback path while the rollout flag exists. It is deprecated as the production receipt-origin product surface. The former black Carry Forward bridge is not proof that Three Valid Endings is enabled.

The final live-domain smoke passed all canonical assertions and confirmed the legacy toolbar was absent.

## Direct Carry Forward ownership

`/carry-forward` remains a separately addressable direct-entry route owned by the existing Carry Forward product boundary. It starts without a receipt snapshot, receipt archive provenance, or a claim that a day was documented.

Receipt-origin Carry Forward remains mounted in the same printer and receipt tree. It does not hard-navigate to simulate continuity.

Both origins converge on the same trusted compiler boundary at `/api/compile-task`, strict `TaskPlan` validation, bounded repair, five typed runtime step kinds, manual fallback, and four-hour temporary task expiry.

## Persistence and privacy

* The completed receipt is frozen before any ending decision.
* Keep writes the exact receipt to the versioned local private archive and claims success only after a confirmed write.
* Let It Go creates a bounded local tombstone, removes the exact source projection atomically, and restores the exact origin during Undo.
* Storage unavailability or write failure never fabricates preservation, deletion, issuance, compilation, or activation.
* Carry Forward task and optional source text remain outside receipt history, receipt exports, release telemetry, and receipt analytics.
* Successful runtime persistence excludes the original source text.
* Telemetry is content free and bounded to typed operational events.
* No ending performs an automatic external action.
* Compiler or ritual failure does not invalidate the receipt.

## Figma-to-code matrix

| Figma reference | Production owner | Reducer or semantic state | Deterministic evidence | Known limitation |
|---|---|---|---|---|
| [Full handoff `136:2`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=136%3A2&locale=en&type=design) | `PrinterShell`, `ReceiptArtifact`, receipt-ending layout styles | printer `complete` plus receipt-ending state | focused visual fixtures and viewport matrix | Figma is the material and hierarchy contract, not a replacement architecture |
| [Primary path `150:1677`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1677&locale=en&type=design) | `ReceiptEndingExperience`, `ReceiptDecisionSurface` | `settling → documented → end-choice` | `three-endings-foundation.spec.ts`, production smoke | production proof requires the flag-enabled live bundle |
| [Keep `150:1847`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1847&locale=en&type=design) | `KeepReceiptRitual`, `ArchivalSleeve` | `keep-ritual`, `keep-recovery` | Keep reducer, persistence, E2E, visual fixtures | local archive availability depends on browser storage |
| [Release `150:1919`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A1919&locale=en&type=design) | `ReleaseReceiptRitual`, `ReleaseSlot` | `release-ritual`, `release-recovery` | release transaction, Undo, expiry, failure fixtures | Undo is intentionally bounded by the persisted deadline |
| [Carry `150:2050`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2050&locale=en&type=design) | `CarryForwardDesignation`, `CarryForwardRitual`, `MechanicalActuator` | `carry-selected` plus ritual state | designation, tear, intake, actuator, transfer, recovery fixtures | compiler availability is independent of receipt truth |
| [Applying `150:2204`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2204&locale=en&type=design) | `CarryForwardRuntimeHost` | applying boundary | compiler/runtime E2E and deterministic visuals | no paid live GPT request in ordinary CI |
| [Quiet One Thing Mode `150:2212`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=150%3A2212&locale=en&type=design) | validated One Thing Mode runtime | active temporary runtime | runtime, Complete Plan, Why This View, persistence fixtures | temporary state expires after four hours |
| [Reduced motion `156:2323`](https://www.figma.com/file/7qjuReLeQrMAx6MJgHUUgL?node-id=156%3A2323&locale=en&type=design) | shared motion policy and ritual components | same semantic state order with reduced interpolation | reduced-motion browser and visual suites | sensory output still follows user and device capability |

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

It uses an isolated browser context, blocks service workers, performs no paid or uncontrolled GPT request, captures the documented decision, Keep and Let Go selector, receipt-origin Carry designation, and direct-entry Carry screen, runs axe in the production decision state, and fails when the legacy toolbar is present.

## Proven production release

### Exact identity

* Previous `main`: `b64a125c289cd2066ce654e98fe9f42d7532925f`
* PR #99 head: `420bda18b260dc11d2fe9b930183538c53a25ef7`
* Final merged production implementation: `00e23fc4cdac818e3fa5e86510a677a96ebb303d`
* Production deployment source SHA: `00e23fc4cdac818e3fa5e86510a677a96ebb303d`

### Vercel

* Project: `bad-day-receipt`
* Project ID: `prj_a8QlJCtuQxOlQnd4ABpSSujIC9BZ`
* Deployment: `dpl_HGwpQHjsk15ZTn43jYnHHF6Gkz6P`
* Target: Production
* Branch: `main`
* State: `READY`
* Canonical URL: `https://bad-day-receipt.vercel.app`

The successful Production build ran the fail-closed guard and therefore established that exact `VITE_THREE_ENDINGS=true` was available while `VERCEL_ENV=production`.

### Live proof

Production smoke run `29875290767` passed against the real canonical domain:

* 1 passed
* 0 skipped
* 0 unexpected
* 0 flaky
* 0 unexpected browser console errors
* 0 unexpected same-origin request failures
* 0 serious or critical axe violations in the tested production state
* No paid or uncontrolled GPT request

The smoke proved the documented decision, Keep and Let Go, receipt-origin Carry continuity, safe **Nothing After All** return, truthful direct entry, and absence of the legacy toolbar.

Vercel reported no runtime-error clusters in the release verification window.

### Exact-head evidence

* Production guard: 3 of 3
* Vitest: 61 files and 311 tests passed, 2 intentionally skipped
* Cross-browser journeys: 310 passed
* Accessibility: 10 passed with no serious or critical violations
* Viewport and orientation matrix: 16 of 16
* General deterministic visuals: 19 passed
* Focused Three Endings visuals: 9 of 9
* TypeScript, production build, bundle budget, compiler, validator, eval, receipt regression, persistence, recovery, reduced motion, and rollback gates passed

## Release evidence rule

“PRODUCTION PROVEN” is reserved for a fresh deployment whose source SHA matches the reviewed implementation, whose Production build passed the exact feature guard, and whose clean live browser passed `test:production-smoke` on the real production domain.

That standard is satisfied by the release recorded above. Future changes must establish new evidence rather than inheriting this claim automatically.
