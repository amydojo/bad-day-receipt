import { describe, expect, it } from 'vitest'
import { hasConcreteTask } from './taskAmbiguity'

describe('Carry Forward task ambiguity heuristic', () => {
  it.each([
    'Pay rent',
    'Email my landlord',
    'Reschedule my dentist appointment',
    'Update my mailing address',
    'Prepare the insurance appeal response',
    'Insurance appeal response',
    'Fix the kitchen sink',
    'Répondre à mon assureur',
  ])('accepts a concrete task without requiring a product-owned verb: %s', (task) => {
    expect(hasConcreteTask(task)).toBe(true)
  })

  it.each([
    '',
    'it',
    'Do it',
    'Do something',
    'Deal with that',
    'Handle this',
    'Sort out the thing',
    'Take care of the problem',
  ])('rejects clearly content-free task language: %s', (task) => {
    expect(hasConcreteTask(task)).toBe(false)
  })
})
