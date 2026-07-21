export type RecoveryCopyId =
  | 'carry-extension'
  | 'carry-separated'
  | 'carry-actuator'
  | 'carry-issued'
  | 'carry-intake'
  | 'carry-conversion'
  | 'keep-storage'
  | 'release-storage'
  | 'release-undo'
  | 'release-expiry'

export interface RecoveryCopy {
  eyebrow: string
  title: string
  body: string
}

export const RECOVERY_COPY: Readonly<Record<RecoveryCopyId, RecoveryCopy>> = {
  'carry-extension': {
    eyebrow: 'SAFE RECOVERY',
    title: 'The receipt is still complete.',
    body: 'The optional extension stopped before separation. You can begin Carry Forward again without changing the completed receipt.',
  },
  'carry-separated': {
    eyebrow: 'SAFE RECOVERY',
    title: 'The receipt is still complete.',
    body: 'The separated stub is not reconstructed after refresh. Its private task text was not stored. You can begin a new adjustment from the completed receipt.',
  },
  'carry-actuator': {
    eyebrow: 'SAFE RECOVERY',
    title: 'The receipt is still complete.',
    body: 'The actuator returned to its safe start boundary. The adjustment was not issued.',
  },
  'carry-issued': {
    eyebrow: 'SAFE RECOVERY',
    title: 'The receipt is still complete.',
    body: 'A Field Transfer was issued, but no matching temporary task session remains. You can begin again without changing the receipt.',
  },
  'carry-intake': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The stub did not enter the printer.',
    body: 'The intake did not capture the stub. The same separated stub is still available.',
  },
  'carry-conversion': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The adjustment was not issued.',
    body: 'Conversion did not register. The same stub can return to the actuator-ready boundary.',
  },
  'keep-storage': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The receipt is still here.',
    body: 'The private archive could not be confirmed on this device. Nothing has been lost.',
  },
  'release-storage': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The receipt is still here.',
    body: 'The release could not be confirmed on this device. Nothing has been removed.',
  },
  'release-undo': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The receipt is ready to return.',
    body: 'The undo could not be confirmed on this device. The released record remains available during its undo window.',
  },
  'release-expiry': {
    eyebrow: 'RECEIPT STILL VALID',
    title: 'The release is still closed.',
    body: 'The Undo window ended, but local finalization could not be confirmed on this device.',
  },
}

export const FORBIDDEN_RECOVERY_LANGUAGE = [
  'oops',
  'you failed',
  'try harder',
  'invalid feelings',
  'something went wrong with you',
] as const

export function getRecoveryCopy(id: RecoveryCopyId): RecoveryCopy {
  return RECOVERY_COPY[id]
}

export function recoveryCopyIsDignified(copy: RecoveryCopy): boolean {
  const normalized = `${copy.eyebrow} ${copy.title} ${copy.body}`.toLowerCase()
  return FORBIDDEN_RECOVERY_LANGUAGE.every((phrase) => !normalized.includes(phrase))
}
