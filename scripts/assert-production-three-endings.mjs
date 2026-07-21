import { pathToFileURL } from 'node:url'

export const PRODUCTION_THREE_ENDINGS_ERROR = [
  '[three-endings-release-guard] Production build blocked.',
  'VERCEL_ENV=production requires VITE_THREE_ENDINGS=true.',
  'Without that exact build-time value, Vite would ship the legacy completed-receipt Evidence Viewer instead of Three Valid Endings.',
].join(' ')

export function assertProductionThreeEndings(env = process.env) {
  if (env.VERCEL_ENV === 'production' && env.VITE_THREE_ENDINGS !== 'true') {
    throw new Error(PRODUCTION_THREE_ENDINGS_ERROR)
  }
}

const invokedPath = process.argv[1]

if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  try {
    assertProductionThreeEndings()
  } catch (error) {
    console.error(error instanceof Error ? error.message : PRODUCTION_THREE_ENDINGS_ERROR)
    process.exitCode = 1
  }
}
