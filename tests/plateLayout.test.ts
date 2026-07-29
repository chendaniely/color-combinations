import { describe, expect, it } from 'vitest'
import { TAPER, barWeights } from '../src/plateLayout'

// This module exists to stop two renderers drifting apart: PlateCard lays the
// plate out with flex-grow, exportPng draws the same plate onto a canvas. Both
// used to hard-code the taper, so a change to one silently produced a
// downloaded PNG that did not match the plate on screen.
describe('plate bar weights', () => {
  it('always sums to 1, so any render height works', () => {
    for (let n = 1; n <= TAPER.length; n++) {
      const sum = barWeights(n).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 10)
    }
  })

  it('tapers: every bar is shorter than the one above it', () => {
    const w = barWeights(5)
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1])
  })

  it('gives a single colour the whole plate', () => {
    expect(barWeights(1)).toEqual([1])
  })

  it('covers the largest combination in the book (5 colours)', () => {
    expect(TAPER).toHaveLength(5)
    expect(barWeights(5)).toHaveLength(5)
  })
})
