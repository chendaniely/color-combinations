// The twelve seasons: classification in code, membership in data.
//
// That split is deliberate. Which season a reading falls into is DERIVED from
// measurements, so it belongs in code and can be defended. Which colours belong
// to a season is CURATED — we invented it, it has no published source — so it
// lives in data/curated/seasons.json where the owner or another agent can audit
// and correct it without touching TypeScript.
//
// Pure: with the palettes as data there is no colour science left here, so this
// belongs in the kernel. Core kernel: no imports outside src/core — the JSON is
// loaded and validated by src/data.ts, the one module allowed to touch data
// files, exactly as validateDataset() is.
import type { ContrastBand, Depth, SkinReading, Undertone } from './types'

export const SEASONS_SCHEMA_VERSION = 1

export type SeasonId = string

export interface Season {
  id: SeasonId
  name: string
  undertone: Undertone
  depth: Depth
  chroma: ContrastBand
  colorIds: number[]
}

function fail(msg: string): never {
  throw new Error(`Invalid seasons.json: ${msg}`)
}

const UNDERTONES: Undertone[] = ['warm', 'neutral', 'cool']
const DEPTHS: Depth[] = ['light', 'medium', 'deep']
const CHROMAS: ContrastBand[] = ['high', 'medium', 'low']

export function validateSeasons(data: unknown, knownColorIds: Set<number>): Season[] {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) fail('not an object')
  const d = data as { schemaVersion?: number; seasons?: unknown }
  if (d.schemaVersion !== SEASONS_SCHEMA_VERSION) {
    fail(`schemaVersion ${d.schemaVersion} != expected ${SEASONS_SCHEMA_VERSION}`)
  }
  if (!Array.isArray(d.seasons) || d.seasons.length === 0) fail('seasons missing or empty')

  const seen = new Set<string>()
  for (const raw of d.seasons) {
    const s = raw as Season
    if (!s.id) fail('a season has no id')
    if (seen.has(s.id)) fail(`duplicate season id "${s.id}"`)
    seen.add(s.id)
    if (!s.name) fail(`season "${s.id}" has no name`)
    if (!UNDERTONES.includes(s.undertone)) fail(`season "${s.id}" has bad undertone "${s.undertone}"`)
    if (!DEPTHS.includes(s.depth)) fail(`season "${s.id}" has bad depth "${s.depth}"`)
    if (!CHROMAS.includes(s.chroma)) fail(`season "${s.id}" has bad chroma "${s.chroma}"`)
    if (!Array.isArray(s.colorIds) || s.colorIds.length === 0) {
      fail(`season "${s.id}" has an empty palette`)
    }
    if (new Set(s.colorIds).size !== s.colorIds.length) fail(`season "${s.id}" repeats a colour`)
    for (const id of s.colorIds) {
      if (!knownColorIds.has(id)) fail(`season "${s.id}" references missing colour ${id}`)
    }
  }
  return d.seasons as Season[]
}

export function seasonById(seasons: Season[], id: SeasonId): Season {
  const found = seasons.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown season "${id}"`)
  return found
}

// Score every season against the reading and take the best match. Scoring
// rather than a lookup table means every one of the 27 possible readings lands
// somewhere real — a gap would show the visitor an error instead of a palette.
export function classifySeason(seasons: Season[], reading: SkinReading): SeasonId {
  let best = seasons[0]
  let bestScore = -Infinity
  for (const s of seasons) {
    // Undertone is the axis people notice, so it outweighs the others.
    const score = (s.undertone === reading.undertone ? 3 : 0)
      + (s.depth === reading.depth ? 2 : 0)
      + (s.chroma === reading.contrast ? 1 : 0)
    if (score > bestScore) { bestScore = score; best = s }
  }
  return best.id
}
