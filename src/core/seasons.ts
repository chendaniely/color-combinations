// The twelve seasons: rules in data, classification in code, membership
// computed.
//
// This replaces a version where the twelve palettes were hand-listed colour
// IDs invented from Lab boxes with no source. The split now runs along a line
// that can be defended: the four PARENT seasons are a published rule from
// Korean personal-colour practice (a temperature half of the PCCS hue circle
// plus a set of PCCS tones), and the twelve SUB-SEASONS are ours, marked as
// such, because no published source defines them consistently.
//
// Which colours belong to a season is no longer stored anywhere by hand — it
// falls out of the rules. See src/color/seasonFit.ts.
//
// Pure: the rules are structure, not colour science, so this belongs in the
// kernel. Core kernel: no imports outside src/core. The JSON is loaded and
// validated by src/data.ts, the one module allowed to touch data files.
import type { ContrastBand, Depth, SkinReading, Undertone } from './types'

export const SEASON_RULES_SCHEMA_VERSION = 1

export type SeasonId = string
export type Temperature = 'warm' | 'cool'

export interface ParentSeason {
  id: string
  name: string
  temperature: Temperature
  /** PCCS tone abbreviations this season is built from. */
  tones: string[]
  sourced: true
  sources: string[]
}

export interface SubSeason {
  id: SeasonId
  name: string
  /** Id of the ParentSeason this belongs to. */
  parent: string
  /** The PCCS tone that characterises it. May repeat across parents. */
  dominantTone: string
  /** Always false. Ours, not sourced — and the site says so. */
  sourced: false
}

export interface SeasonRules {
  temperature: { warm: number[]; cool: number[]; reasons: Record<string, string> }
  parents: ParentSeason[]
  subSeasons: SubSeason[]
}

function fail(msg: string): never {
  throw new Error(`Invalid season-rules.json: ${msg}`)
}

export function validateSeasonRules(
  data: unknown,
  toneAbbrs: Set<string>,
  sourceIds: Set<string>,
): SeasonRules {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) fail('not an object')
  const d = data as Partial<SeasonRules> & {
    schemaVersion?: number
    description?: string
    sources?: string[]
  }
  if (d.schemaVersion !== SEASON_RULES_SCHEMA_VERSION) {
    fail(`schemaVersion ${d.schemaVersion} != expected ${SEASON_RULES_SCHEMA_VERSION}`)
  }
  if (typeof d.description !== 'string' || !d.description) fail('description missing')

  // Temperature: every hue of the circle assigned exactly once. A hue in
  // neither half would silently belong to no season at all.
  const t = d.temperature
  if (!t || !Array.isArray(t.warm) || !Array.isArray(t.cool)) fail('temperature missing')
  const assigned = [...t.warm, ...t.cool]
  if (assigned.length !== 24) fail(`temperature covers ${assigned.length} hues, expected 24`)
  if (new Set(assigned).size !== 24) fail('a hue is in both temperature halves')
  for (const n of assigned) {
    if (!Number.isInteger(n) || n < 1 || n > 24) fail(`temperature lists hue ${n}, outside 1-24`)
  }

  if (!Array.isArray(d.parents) || d.parents.length !== 4) fail('expected 4 parent seasons')
  const parentIds = new Set<string>()
  for (const p of d.parents) {
    if (!p.id) fail('a parent season has no id')
    if (parentIds.has(p.id)) fail(`duplicate parent season "${p.id}"`)
    parentIds.add(p.id)
    if (!p.name) fail(`parent "${p.id}" has no name`)
    if (p.temperature !== 'warm' && p.temperature !== 'cool') {
      fail(`parent "${p.id}" has bad temperature "${p.temperature}"`)
    }
    if (!Array.isArray(p.tones) || p.tones.length === 0) fail(`parent "${p.id}" has no tones`)
    for (const tone of p.tones) {
      if (!toneAbbrs.has(tone)) fail(`parent "${p.id}" references unknown tone "${tone}"`)
    }
    // The whole point of the two-level design. A parent that is not sourced,
    // or cites nothing, is indistinguishable from the invention we replaced.
    if (p.sourced !== true) fail(`parent "${p.id}" must be sourced`)
    if (!Array.isArray(p.sources) || p.sources.length === 0) fail(`parent "${p.id}" cites nothing`)
    for (const id of p.sources) {
      if (!sourceIds.has(id)) fail(`parent "${p.id}" cites unknown source "${id}"`)
    }
  }

  if (!Array.isArray(d.subSeasons) || d.subSeasons.length !== 12) fail('expected 12 sub-seasons')
  const subIds = new Set<string>()
  for (const s of d.subSeasons) {
    if (!s.id) fail('a sub-season has no id')
    if (subIds.has(s.id)) fail(`duplicate sub-season "${s.id}"`)
    subIds.add(s.id)
    if (!s.name) fail(`sub-season "${s.id}" has no name`)
    if (!parentIds.has(s.parent)) fail(`sub-season "${s.id}" has unknown parent "${s.parent}"`)
    if (!toneAbbrs.has(s.dominantTone)) {
      fail(`sub-season "${s.id}" references unknown tone "${s.dominantTone}"`)
    }
    const parent = d.parents.find((p) => p.id === s.parent)!
    if (!parent.tones.includes(s.dominantTone)) {
      fail(`sub-season "${s.id}" has tone "${s.dominantTone}", not in parent "${parent.id}"`)
    }
    // Marked as ours. If this ever flips to true without a source, the claim
    // the site makes to the visitor becomes false.
    if (s.sourced !== false) fail(`sub-season "${s.id}" must be marked sourced: false`)
  }

  return d as SeasonRules
}

export function parentOf(rules: SeasonRules, subId: SeasonId): ParentSeason {
  const sub = rules.subSeasons.find((s) => s.id === subId)
  if (!sub) throw new Error(`Unknown season "${subId}"`)
  const parent = rules.parents.find((p) => p.id === sub.parent)
  if (!parent) throw new Error(`Season "${subId}" has unknown parent "${sub.parent}"`)
  return parent
}

export function seasonById(rules: SeasonRules, id: SeasonId): SubSeason {
  const found = rules.subSeasons.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown season "${id}"`)
  return found
}

/** Whether a PCCS hue step falls in a season's temperature half. */
export function isTemperature(rules: SeasonRules, hue: number, temperature: Temperature): boolean {
  return rules.temperature[temperature].includes(hue)
}

// Depth and chroma bands a tone implies, so a reading can be scored against a
// sub-season without the caller knowing any PCCS. The thresholds mirror the
// tone rows in pccs-tones.json.
function depthOfTone(lightness: number): Depth {
  if (lightness < 4.5) return 'deep'
  if (lightness > 7.0) return 'light'
  return 'medium'
}

function chromaOfTone(saturation: number): ContrastBand {
  if (saturation >= 7) return 'high'
  if (saturation >= 4) return 'medium'
  return 'low'
}

export interface ToneBands {
  lightness: number
  saturation: number
}

/**
 * Score every sub-season against the reading and take the best. Scoring rather
 * than a lookup table means all 27 possible readings land somewhere real — a
 * gap would show the visitor an error instead of a palette.
 */
export function classifySeason(
  rules: SeasonRules,
  reading: SkinReading,
  toneBands: Map<string, ToneBands>,
): SeasonId {
  let best = rules.subSeasons[0]
  let bestScore = -Infinity
  for (const s of rules.subSeasons) {
    const parent = rules.parents.find((p) => p.id === s.parent)!
    const bands = toneBands.get(s.dominantTone)
    if (!bands) continue
    const undertone: Undertone = parent.temperature
    // Undertone is the axis people notice, so it outweighs the others.
    const score = (undertone === reading.undertone ? 3 : 0)
      + (depthOfTone(bands.lightness) === reading.depth ? 2 : 0)
      + (chromaOfTone(bands.saturation) === reading.contrast ? 1 : 0)
    // STRICTLY greater, plus an explicit tiebreak on id.
    //
    // Without the tiebreak the winner of a tie was whichever season came first
    // in season-rules.json — and that file is hand-editable by design, so
    // reordering two rows would silently change what a visitor is told. It bites
    // hardest on a NEUTRAL undertone, which no parent matches (parents are only
    // warm or cool), so every season scores 0 on the heaviest axis and ties are
    // common. `skinMetrics` really does return 'neutral', so this is a live path.
    //
    // Comparing ids makes the result a property of the rules rather than of
    // their order. tests/seasons.test.ts shuffles the array to prove it.
    if (score > bestScore || (score === bestScore && s.id < best.id)) {
      bestScore = score
      best = s
    }
  }
  return best.id
}
