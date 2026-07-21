import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertProductionThreeEndings,
  PRODUCTION_THREE_ENDINGS_ERROR,
} from './assert-production-three-endings.mjs'

test('allows local and preview builds to control the feature flag intentionally', () => {
  assert.doesNotThrow(() => assertProductionThreeEndings({}))
  assert.doesNotThrow(() => assertProductionThreeEndings({ VERCEL_ENV: 'preview' }))
  assert.doesNotThrow(() => assertProductionThreeEndings({
    VERCEL_ENV: 'preview',
    VITE_THREE_ENDINGS: 'false',
  }))
})

test('allows production only with the exact enabled value', () => {
  assert.doesNotThrow(() => assertProductionThreeEndings({
    VERCEL_ENV: 'production',
    VITE_THREE_ENDINGS: 'true',
  }))
})

test('blocks missing, false, or differently cased production values', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1']) {
    assert.throws(
      () => assertProductionThreeEndings({
        VERCEL_ENV: 'production',
        ...(value === undefined ? {} : { VITE_THREE_ENDINGS: value }),
      }),
      (error) => error instanceof Error && error.message === PRODUCTION_THREE_ENDINGS_ERROR,
    )
  }
})
