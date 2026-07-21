import type { Page } from '@playwright/test'

export const MACHINE_STORAGE_KEY = 'bad-day-receipt-machine-v1'
export const CARRY_RITUAL_CHECKPOINT_KEY = 'bad-day-receipt:carry-ritual-checkpoint:v1'

export type StorageFault = 'unavailable' | 'quota'

export async function installStorageWriteFault(
  page: Page,
  key: string,
  fault: StorageFault = 'quota',
) {
  await page.evaluate(({ storageKey, storageFault }) => {
    const browserWindow = window as Window & {
      __restoreThreeEndingsStorage?: () => void
    }
    const original = Storage.prototype.setItem
    browserWindow.__restoreThreeEndingsStorage = () => {
      Storage.prototype.setItem = original
      delete browserWindow.__restoreThreeEndingsStorage
    }
    Storage.prototype.setItem = function faultedSetItem(name: string, value: string) {
      if (name !== storageKey) return original.call(this, name, value)
      if (storageFault === 'quota') {
        throw new DOMException('Storage quota unavailable', 'QuotaExceededError')
      }
      throw new DOMException('Storage unavailable', 'SecurityError')
    }
  }, { storageKey: key, storageFault: fault })
}

export async function restoreStorageWrites(page: Page) {
  await page.evaluate(() => {
    const browserWindow = window as Window & {
      __restoreThreeEndingsStorage?: () => void
    }
    browserWindow.__restoreThreeEndingsStorage?.()
  })
}

export async function seedMalformedMachineState(page: Page, value = '{not-json') {
  await page.addInitScript(({ key, raw }) => {
    window.localStorage.setItem(key, raw)
  }, { key: MACHINE_STORAGE_KEY, raw: value })
}

export async function seedMalformedCarryCheckpoint(page: Page, value: unknown) {
  await page.addInitScript(({ key, checkpoint }) => {
    window.sessionStorage.setItem(key, JSON.stringify(checkpoint))
  }, { key: CARRY_RITUAL_CHECKPOINT_KEY, checkpoint: value })
}

export async function seedCarryCheckpoint(page: Page, checkpoint: {
  phase: 'extension-ready' | 'stub-separated' | 'actuator-ready' | 'transfer-issued' | 'recovery'
  receiptId: string
  stubId?: string
  actuatorMilestone?: 'easy' | 'medium' | 'heavy' | 'detent' | 'locked' | null
  recoveryReason?: 'tear-canceled' | 'intake-jam' | 'conversion-failed' | null
}) {
  await page.evaluate(({ key, value }) => {
    window.sessionStorage.setItem(key, JSON.stringify({
      version: 1,
      stubId: 'CFS-TEST-001',
      actuatorMilestone: null,
      recoveryReason: null,
      ...value,
    }))
  }, { key: CARRY_RITUAL_CHECKPOINT_KEY, value: checkpoint })
}

export async function setDocumentVisibility(page: Page, state: 'visible' | 'hidden') {
  await page.evaluate((visibilityState) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    })
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => visibilityState === 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

export async function dispatchPointerCancel(page: Page, selector: string) {
  await page.locator(selector).evaluate((node) => {
    node.dispatchEvent(new PointerEvent('pointercancel', {
      bubbles: true,
      pointerId: 1,
      pointerType: 'touch',
    }))
  })
}

export async function setBrowserZoom(page: Page, zoom = 2) {
  await page.evaluate((scale) => {
    document.documentElement.style.zoom = String(scale)
  }, zoom)
}

export async function clearBrowserZoom(page: Page) {
  await page.evaluate(() => {
    document.documentElement.style.removeProperty('zoom')
  })
}

export async function readStoredJson(page: Page, key: string, storage: 'local' | 'session' = 'local') {
  return page.evaluate(({ storageKey, kind }) => {
    const source = kind === 'session' ? window.sessionStorage : window.localStorage
    const raw = source.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  }, { storageKey: key, kind: storage })
}
