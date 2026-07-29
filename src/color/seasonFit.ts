// Which of Wada's colours belong to a season, and how well they actually fit.
//
// Membership is a rule, not a curation: a colour belongs to a season when its
// hue falls in that season's temperature half of the PCCS circle AND its PCCS
// tone is one the season is built from. Nothing is hand-picked.
//
// Fit is the part that matters. Nearest-neighbour always returns SOMETHING, so
// a season the book cannot serve would otherwise come back looking as
// confident as one it serves well. Measured against the book on 2026-07-29:
// median chroma C* 52.7, with 83 of 157 colours above C* 50, and only 13 below
// C* 20 — two of which are pure white and black. Eleven usable muted colours,
// shared between the four seasons that are DEFINED by mutedness. Reporting the
// distance is what turns that from a silent lie into the interesting part.
//
// Lives in src/color/ because it leans on the culori-backed distance seam.
import type { PccsCell } from '../core/pccs'
import type { ColorRecord } from '../core/types'
import { isTemperature, type SeasonRules, type SubSeason } from '../core/seasons'
import { colorDistance, fitBand, type FitBand } from './colorDistance'
import { labToPccs, toneOf } from './pccsMap'
import type { PccsTone } from '../core/pccs'

export interface SeasonMember {
  colorId: number
  /** Distance to the nearest PCCS cell of this season, in the seam's units. */
  distance: number
  band: FitBand
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/**
 * The cells of the rendered PCCS grid that belong to a season: its parent's
 * tones, in its parent's temperature half. These are the "ideal" colours the
 * book gets compared against.
 */
export function seasonCells(rules: SeasonRules, sub: SubSeason, grid: PccsCell[]): PccsCell[] {
  const parent = rules.parents.find((p) => p.id === sub.parent)
  if (!parent) throw new Error(`Season "${sub.id}" has unknown parent "${sub.parent}"`)
  const tones = new Set(parent.tones)
  return grid.filter(
    (c) => tones.has(c.tone) && isTemperature(rules, c.hue, parent.temperature),
  )
}

/** The single cell that best represents a sub-season: its dominant tone. */
export function idealCells(rules: SeasonRules, sub: SubSeason, grid: PccsCell[]): PccsCell[] {
  return seasonCells(rules, sub, grid).filter((c) => c.tone === sub.dominantTone)
}

export interface IdealPair {
  /** The season's ideal colour, from the rendered PCCS grid. */
  idealHex: string
  /** Which step of the PCCS hue circle this ideal sits on. */
  hue: number
  hueAbbr: string
  /** The nearest colour Wada's book actually has. */
  colorId: number
  distance: number
  band: FitBand
}

/**
 * Pairs each of a season's ideal colours with the nearest one the book
 * actually contains. This is the display that makes the gap visible instead of
 * implied.
 *
 * ONE ROW PER IDEAL, and deliberately NOT deduplicated by book colour.
 *
 * The first version deduped, keeping the best pairing per colour, on the
 * reasoning that repeating a colour would "disguise crowding as abundance".
 * That was backwards, and a screenshot caught it: for Clear Spring it reported
 * "7 of 7 are a good match" while the palette above it showed 14 of 44 as not
 * close. Dropping a duplicate always drops the WORSE pairing, so every
 * poorly-served ideal vanished and the panel that exists to show the gap
 * reported none.
 *
 * Repetition is the honest signal. If four ideals all resolve to Sulphine
 * Yellow, the book has one colour for that whole region, and four rows saying
 * so is the fact.
 */
export function idealPairs(
  rules: SeasonRules,
  sub: SubSeason,
  grid: PccsCell[],
  colors: ColorRecord[],
): IdealPair[] {
  const pairs: IdealPair[] = []
  for (const cell of idealCells(rules, sub, grid)) {
    const target = hexToRgb(cell.hex)
    let best: { id: number; d: number } | null = null
    for (const color of colors) {
      const d = colorDistance(target, hexToRgb(color.hex))
      if (!best || d < best.d) best = { id: color.id, d }
    }
    if (!best) continue
    pairs.push({
      idealHex: cell.hex,
      hue: cell.hue,
      hueAbbr: cell.hueAbbr,
      colorId: best.id,
      distance: best.d,
      band: fitBand(best.d),
    })
  }
  // Around the hue circle, not by quality: this is a survey of the season's
  // whole range, and sorting by fit would cluster the failures at the bottom
  // where they read as an afterthought.
  return pairs.sort((a, b) => a.hue - b.hue)
}

/**
 * Every colour of the book that belongs to this season, with how well it fits,
 * best first. Membership is the rule; the distance is the honesty.
 */
export function seasonMembers(
  rules: SeasonRules,
  sub: SubSeason,
  grid: PccsCell[],
  tones: PccsTone[],
  colors: ColorRecord[],
): SeasonMember[] {
  const parent = rules.parents.find((p) => p.id === sub.parent)!
  const parentTones = new Set(parent.tones)
  // MEMBERSHIP comes from the parent — that is the sourced rule, and it is
  // why three sub-seasons of one parent draw on the same colours.
  // FIT is measured against the SUB-season's own dominant tone, which is what
  // makes Deep Autumn and Soft Autumn rank that shared pool differently.
  // Measuring both against the parent made all three siblings identical.
  const cells = idealCells(rules, sub, grid)
  if (cells.length === 0) return []

  const members: SeasonMember[] = []
  for (const color of colors) {
    const tone = toneOf(tones, color.hex)
    if (tone === null || !parentTones.has(tone)) continue
    if (!isTemperature(rules, labToPccs(color.hex).hue, parent.temperature)) continue

    const rgb = hexToRgb(color.hex)
    let nearest = Infinity
    for (const cell of cells) {
      const d = colorDistance(rgb, hexToRgb(cell.hex))
      if (d < nearest) nearest = d
    }
    members.push({ colorId: color.id, distance: nearest, band: fitBand(nearest) })
  }
  // Best fit first, so a caller taking the top N gets the most defensible ones
  // and a caller showing all of them shows the good news before the bad.
  members.sort((a, b) => a.distance - b.distance || a.colorId - b.colorId)
  return members
}
