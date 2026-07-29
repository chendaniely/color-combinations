// How well each of the book's combinations suits a personal palette.
//
// RANK, don't filter. Requiring every colour in a combination to be the
// visitor's yields 13 of 338 for a 53-colour palette and 1 for an 18-colour
// season list — a section that reads as broken. So combinations are ordered by
// how much of each is theirs, and a four-stop floor decides where the list
// stops. The stops are discrete because combinations hold 2-5 colours: the
// fraction only ever takes a handful of values, and a smooth slider would have
// long dead zones.
//
// "Dominant colour is yours" was proposed and withdrawn — the dataset has no
// area proportions, so it would have meant "lowest colour id".
//
// Pure set arithmetic, no colour science. Core kernel: no imports outside
// src/core.
import type { FloorStop } from './state'
import type { CombinationRecord } from './types'

export interface RankedCombination {
  combination: CombinationRecord
  yours: number
  total: number
  fraction: number
  outsiders: number[]   // colour ids NOT in the palette — the plate outlines these
}

export const FLOOR_LABELS: Record<FloorStop, string> = {
  0: 'Every colour is yours',
  1: 'All but one',
  2: 'Half or more',
  3: 'Anything with a match',
}

export function rankCombinations(
  combos: CombinationRecord[], palette: ReadonlySet<number>,
): RankedCombination[] {
  return combos
    .map((combination) => {
      const outsiders = combination.colorIds.filter((id) => !palette.has(id))
      const total = combination.colorIds.length
      const yours = total - outsiders.length
      return {
        combination,
        yours,
        total,
        fraction: total === 0 ? 0 : yours / total,
        outsiders,
      }
    })
    // Ties broken by id so the order never wobbles between renders.
    .sort((a, b) => b.fraction - a.fraction || a.combination.id - b.combination.id)
}

export function passesFloor(r: RankedCombination, floor: FloorStop): boolean {
  const outsiders = r.total - r.yours
  switch (floor) {
    case 0: return outsiders === 0
    case 1: return outsiders <= 1
    case 2: return r.fraction >= 0.5
    case 3: return r.yours >= 1
  }
}
