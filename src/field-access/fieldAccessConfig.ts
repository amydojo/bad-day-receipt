import type { FieldAccessConfig } from './fieldAccessTypes'

const fieldAccessConfigs: Record<string, FieldAccessConfig> = {
  '07': {
    edition: '07',
    objectType: 'recovered-artifact',
    objectName: 'Recovered Artifact',
    objectClass: 'LD–RECOVERED',
    machineId: 'bad-day-receipt',
    machineLabel: 'SM–001',
    openingCopy: 'This object has been waiting to be returned.',
    accent: 'peach',
  },
}

export function getFieldAccessConfig(edition: string): FieldAccessConfig | null {
  return fieldAccessConfigs[edition] ?? null
}

export function isKnownFieldEdition(edition: string): boolean {
  return edition in fieldAccessConfigs
}

export const publicArchiveUrl = 'https://www.instagram.com/labdojo/'
