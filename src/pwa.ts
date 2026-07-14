export interface PwaRegistrationOptions {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void
  onOfflineReady?: () => void
}

export async function registerPwa({
  onUpdateAvailable,
  onOfflineReady,
}: PwaRegistrationOptions = {}): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  if (import.meta.env.DEV) return null

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

    if (registration.waiting) onUpdateAvailable?.(registration)

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdateAvailable?.(registration)
        } else if (worker.state === 'installed') {
          onOfflineReady?.()
        }
      })
    })

    return registration
  } catch {
    return null
  }
}

export function applyPwaUpdate(registration: ServiceWorkerRegistration): void {
  const waiting = registration.waiting
  if (!waiting) return

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }, { once: true })

  waiting.postMessage({ type: 'SKIP_WAITING' })
}
