import type { FieldAccessConfig } from './fieldAccessTypes'

const canonicalMachine = {
  machineId: 'LD-001',
  machineLabel: 'LD–001',
} as const

export const fieldAccessConfigs: Record<string, FieldAccessConfig> = {
  '01': {
    edition: '01',
    objectType: 'entrance-pass',
    objectName: 'Entrance Pass',
    objectClass: 'LD–ENTRANCE',
    ...canonicalMachine,
    openingCopy: 'This object grants temporary field access.',
    accent: 'paper',
  },
  '02': {
    edition: '02',
    objectType: 'public-test',
    objectName: 'Public Test',
    objectClass: 'LD–TEST',
    ...canonicalMachine,
    openingCopy: 'This object is part of an unfinished public test.',
    accent: 'paper',
  },
  '03': {
    edition: '03',
    objectType: 'awake-machine',
    objectName: 'Awake Machine',
    objectClass: 'LD–AWAKE',
    ...canonicalMachine,
    openingCopy: 'A small machine has been waiting for this object.',
    accent: 'paper',
  },
  '04': {
    edition: '04',
    objectType: 'human-subject-pass',
    objectName: 'Human Subject',
    objectClass: 'LD–SUBJECT',
    ...canonicalMachine,
    openingCopy: 'Curiosity is the only qualification required.',
    accent: 'paper',
  },
  '05': {
    edition: '05',
    objectType: 'specimen-access',
    objectName: 'Specimen Access',
    objectClass: 'LD–SPECIMEN',
    ...canonicalMachine,
    openingCopy: 'This object grants access to a recovered specimen.',
    accent: 'peach',
  },
  '06': {
    edition: '06',
    objectType: 'field-access',
    objectName: 'Field Access',
    objectClass: 'LD–FIELD',
    ...canonicalMachine,
    openingCopy: 'This object was issued outside the laboratory.',
    accent: 'paper',
  },
  '07': {
    edition: '07',
    objectType: 'recovered-artifact',
    objectName: 'Recovered Artifact',
    objectClass: 'LD–RECOVERED',
    ...canonicalMachine,
    openingCopy: 'This object has been waiting to be returned.',
    accent: 'peach',
  },
  '08': {
    edition: '08',
    objectType: 'operating-instructions',
    objectName: 'Operating Instructions',
    objectClass: 'LD–OPERATE',
    ...canonicalMachine,
    openingCopy: 'This object contains partial operating instructions.',
    accent: 'paper',
  },
  '09': {
    edition: '09',
    objectType: 'field-note',
    objectName: 'Field Note',
    objectClass: 'LD–NOTE',
    ...canonicalMachine,
    openingCopy: 'This observation remains incomplete.',
    accent: 'paper',
  },
  '10': {
    edition: '10',
    objectType: 'specimen-room',
    objectName: 'Specimen Room',
    objectClass: 'LD–ROOM',
    ...canonicalMachine,
    openingCopy: 'This object permits temporary entry to the specimen room.',
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
