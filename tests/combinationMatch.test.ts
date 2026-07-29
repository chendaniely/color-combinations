import { describe, expect, it } from 'vitest'
import {
  FLOOR_LABELS, passesFloor, rankCombinations,
} from '../src/core/combinationMatch'
import { measuredPalette } from '../src/color/personalPalette'
import { labOf } from '../src/color/skinMetrics'
import { displayableCombinations } from '../src/core/dataset'
import { dataset } from '../src/data'
import type { FloorStop } from '../src/core/state'
import type { CombinationRecord, SkinReading } from '../src/core/types'

const COMBOS = displayableCombinations(dataset)

// The persona behind the counts in the spec: deep warm skin, black hair.
const SKIN = '#a1673f'
const { L, h } = labOf([161, 103, 63])
const READING: SkinReading = {
  skin: SKIN, hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: L, skinHue: h, ita: 0, contrastGap: 43.5, whiteBalanced: true,
}

function combo(id: number, colorIds: number[]): CombinationRecord {
  return { id, colorIds, size: colorIds.length, excluded: false }
}

describe('rankCombinations', () => {
  it('reports how much of each combination is the visitor\'s', () => {
    const ranked = rankCombinations([combo(1, [10, 20, 30, 40])], new Set([10, 20]))
    expect(ranked[0].yours).toBe(2)
    expect(ranked[0].total).toBe(4)
    expect(ranked[0].fraction).toBe(0.5)
  })

  it('lists the colours that are NOT the visitor\'s, for outlining on the plate', () => {
    const ranked = rankCombinations([combo(1, [10, 20, 30])], new Set([20]))
    expect(ranked[0].outsiders).toEqual([10, 30])
  })

  it('orders by fraction, strongest first', () => {
    const ranked = rankCombinations(
      [combo(1, [1, 2, 3, 4]), combo(2, [1, 2]), combo(3, [1, 9, 9, 9])],
      new Set([1, 2, 3]))
    expect(ranked.map((r) => r.combination.id)).toEqual([2, 1, 3])
  })

  it('breaks ties by combination id, so the order is stable', () => {
    const ranked = rankCombinations(
      [combo(7, [1, 2]), combo(3, [1, 2]), combo(5, [1, 2])], new Set([1, 2]))
    expect(ranked.map((r) => r.combination.id)).toEqual([3, 5, 7])
  })

  it('handles a combination with nothing in common', () => {
    const ranked = rankCombinations([combo(1, [8, 9])], new Set([1]))
    expect(ranked[0].fraction).toBe(0)
    expect(ranked[0].outsiders).toEqual([8, 9])
  })

  it('never divides by zero', () => {
    expect(rankCombinations([combo(1, [])], new Set([1]))[0].fraction).toBe(0)
  })
})

describe('passesFloor', () => {
  const half = rankCombinations([combo(1, [1, 2])], new Set([1]))[0]
  const allButOne = rankCombinations([combo(1, [1, 2, 3])], new Set([1, 2]))[0]
  const every = rankCombinations([combo(1, [1, 2])], new Set([1, 2]))[0]
  const none = rankCombinations([combo(1, [8, 9])], new Set([1]))[0]

  it('stop 0 keeps only combinations that are entirely yours', () => {
    expect(passesFloor(every, 0)).toBe(true)
    expect(passesFloor(allButOne, 0)).toBe(false)
    expect(passesFloor(half, 0)).toBe(false)
  })

  it('stop 1 allows one outsider', () => {
    expect(passesFloor(allButOne, 1)).toBe(true)
    expect(passesFloor(every, 1)).toBe(true)
  })

  it('stop 2 allows half or more', () => {
    // A 2-colour combination with one match is exactly half: in at stop 2,
    // out at stop 1 would be wrong (one outsider of two IS "all but one"),
    // so this documents the boundary deliberately.
    expect(passesFloor(half, 2)).toBe(true)
    expect(passesFloor(none, 2)).toBe(false)
  })

  it('stop 3 allows anything with at least one match', () => {
    expect(passesFloor(half, 3)).toBe(true)
    expect(passesFloor(none, 3)).toBe(false)
  })

  it('is monotonic — a looser stop never shows fewer', () => {
    const palette = new Set(measuredPalette(READING, dataset.data.colors).map((c) => c.id))
    const ranked = rankCombinations(COMBOS, palette)
    const counts = ([0, 1, 2, 3] as FloorStop[])
      .map((f) => ranked.filter((r) => passesFloor(r, f)).length)
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1])
    }
  })

  it('labels every stop', () => {
    for (const f of [0, 1, 2, 3] as FloorStop[]) {
      expect(FLOOR_LABELS[f].length).toBeGreaterThan(0)
    }
  })
})

// The real counts, from the shipped implementation against the real dataset.
//
// These are 3 colours short of the illustrative table in the spec (53 -> 50,
// and 13/118/148/239 -> 12/117/143/234). The spec's numbers came from a
// throwaway mockup script with its own hand-rolled sRGB->Lab conversion; the
// app uses culori, as the project rule requires. The colours that moved all sit
// within 0.6 of a threshold — Carmine Red at 14.81 separation, Red at 14.86,
// Artemesia Green at 14.72, against a cutoff of 15 — so the two agree except
// exactly where any two Lab implementations would.
//
// If these move again, either the scoring rules changed or the data did.
describe('the shipped counts, against the real book', () => {
  const palette = new Set(measuredPalette(READING, dataset.data.colors).map((c) => c.id))
  const ranked = rankCombinations(COMBOS, palette)

  it('has 338 displayable combinations', () => {
    expect(COMBOS).toHaveLength(338)
  })

  it('gives this persona a 50-colour palette', () => {
    expect(palette.size).toBe(50)
  })

  it('yields 12 / 117 / 143 / 234 across the four stops', () => {
    const counts = ([0, 1, 2, 3] as FloorStop[])
      .map((f) => ranked.filter((r) => passesFloor(r, f)).length)
    expect(counts).toEqual([12, 117, 143, 234])
  })

  it('still makes the case for ranking over strict filtering', () => {
    // The point the spec argues: demanding every colour be yours guts the list.
    const strict = ranked.filter((r) => passesFloor(r, 0)).length
    const half = ranked.filter((r) => passesFloor(r, 2)).length
    expect(strict).toBeLessThan(half / 5)
  })
})
