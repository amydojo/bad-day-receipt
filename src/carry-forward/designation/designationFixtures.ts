import type { ExplicitObligationInputs } from './carryDesignationTypes'

export type CarryDesignationFixture = 'single' | 'multiple'

export function getDevelopmentDesignationInputs(): ExplicitObligationInputs | undefined {
  if (!import.meta.env.DEV || typeof window === 'undefined') return undefined

  const fixture = new URLSearchParams(window.location.search)
    .get('carry-designation-fixture') as CarryDesignationFixture | null

  if (fixture === 'single') {
    return {
      authoredDemoFixtures: ['Reply to the insurance denial'],
    }
  }

  if (fixture === 'multiple') {
    return {
      authoredDemoFixtures: [
        'Reply to the insurance denial',
        'Prepare questions for the clinic',
      ],
    }
  }

  return undefined
}
