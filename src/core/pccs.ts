// PCCS — the Practical Color Co-ordinate System, published by the Japan Color
// Research Institute in 1964. Types and validation only.
//
// Why this system and not Munsell or a Western swatch book: the Japan Color
// Research Institute was founded by Sanzo Wada in 1927 (as the Japan Standard
// Color Association), six years before he published the colour combinations
// this site is built on. Korean personal-colour analysis is built on PCCS.
// The ruleset and the corpus share an ancestor.
//
// Core kernel: no imports outside src/core, no colour maths. Turning a hex
// value into PCCS coordinates needs culori and therefore lives in
// src/color/pccsMap.ts, not here.

export const PCCS_SCHEMA_VERSION = 1

/** One of the 24 steps of the PCCS hue circle. */
export interface PccsHue {
  /** 1-24. The identity — `abbr` is NOT unique (14/15 are both BG, 17/18 both B). */
  n: number
  abbr: string
  ja: string
  en: string
}

/** A region of the lightness x saturation plane. */
export interface PccsTone {
  abbr: string
  ja: string
  en: string
  /** [lo, hi) on the PCCS lightness scale, 1.5-9.5. Topmost band includes 9.5. */
  lightness: [number, number]
  /** [lo, hi] on the PCCS saturation scale, 0-9. */
  saturation: [number, number]
  achromatic?: boolean
}

export const LIGHTNESS_MIN = 1.5
export const LIGHTNESS_MAX = 9.5
export const SATURATION_MAX = 9

function fail(file: string, msg: string): never {
  throw new Error(`Invalid ${file}: ${msg}`)
}

function checkEnvelope(
  file: string,
  data: unknown,
  sourceIds: Set<string>,
): { sources: string[]; notes: string } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) fail(file, 'not an object')
  const d = data as { schemaVersion?: number; description?: string; sources?: unknown; notes?: unknown }
  if (d.schemaVersion !== PCCS_SCHEMA_VERSION) {
    fail(file, `schemaVersion ${d.schemaVersion} != expected ${PCCS_SCHEMA_VERSION}`)
  }
  if (typeof d.description !== 'string' || !d.description) fail(file, 'description missing')
  if (!Array.isArray(d.sources) || d.sources.length === 0) fail(file, 'cites no sources')
  for (const id of d.sources) {
    if (!sourceIds.has(id)) fail(file, `cites unknown source id "${id}"`)
  }
  if (typeof d.notes !== 'string') fail(file, 'notes missing')
  return { sources: d.sources as string[], notes: d.notes }
}

export function validatePccsHues(data: unknown, sourceIds: Set<string>): PccsHue[] {
  const file = 'pccs-hues.json'
  checkEnvelope(file, data, sourceIds)
  const hues = (data as { hues?: unknown }).hues
  if (!Array.isArray(hues)) fail(file, 'hues missing')
  if (hues.length !== 24) fail(file, `expected 24 hues, found ${hues.length}`)

  hues.forEach((raw, i) => {
    const h = raw as PccsHue
    // The circle is a circle: position IS the meaning, so a gap or a
    // reordering is a corruption, not a style choice.
    if (h.n !== i + 1) fail(file, `hue at index ${i} has n=${h.n}, expected ${i + 1}`)
    if (!h.abbr) fail(file, `hue ${h.n} has no abbr`)
    if (!h.ja) fail(file, `hue ${h.n} has no Japanese name`)
    if (!h.en) fail(file, `hue ${h.n} has no English name`)
  })
  return hues as PccsHue[]
}

/** Identifies a tone's region, for detecting two tones claiming the same one. */
export function toneKey(t: PccsTone): string {
  return `L${t.lightness[0]}-${t.lightness[1]}/S${t.saturation[0]}-${t.saturation[1]}`
}

export function validatePccsTones(data: unknown, sourceIds: Set<string>): PccsTone[] {
  const file = 'pccs-tones.json'
  checkEnvelope(file, data, sourceIds)
  const tones = (data as { tones?: unknown }).tones
  if (!Array.isArray(tones)) fail(file, 'tones missing')

  const seenAbbr = new Set<string>()
  const seenRegion = new Map<string, string>()
  for (const raw of tones) {
    const t = raw as PccsTone
    if (!t.abbr) fail(file, 'a tone has no abbr')
    if (seenAbbr.has(t.abbr)) fail(file, `duplicate tone abbr "${t.abbr}"`)
    seenAbbr.add(t.abbr)
    if (!t.ja) fail(file, `tone "${t.abbr}" has no Japanese name`)
    if (!t.en) fail(file, `tone "${t.abbr}" has no English name`)

    for (const [name, range, lo, hi] of [
      ['lightness', t.lightness, LIGHTNESS_MIN, LIGHTNESS_MAX],
      ['saturation', t.saturation, 0, SATURATION_MAX],
    ] as const) {
      if (!Array.isArray(range) || range.length !== 2) fail(file, `tone "${t.abbr}" has a bad ${name}`)
      if (range[0] > range[1]) fail(file, `tone "${t.abbr}" has an inverted ${name}`)
      if (range[0] < lo || range[1] > hi) {
        fail(file, `tone "${t.abbr}" ${name} ${range[0]}-${range[1]} is outside ${lo}-${hi}`)
      }
    }

    // The ja.wikipedia dull/grayish collision, caught at load rather than
    // shipped. Achromatic tones are points on the grey axis and are exempt.
    if (!t.achromatic) {
      const key = toneKey(t)
      const clash = seenRegion.get(key)
      if (clash) fail(file, `tones "${clash}" and "${t.abbr}" claim the same region ${key}`)
      seenRegion.set(key, t.abbr)
    }
  }

  const chromatic = (tones as PccsTone[]).filter((t) => !t.achromatic)
  if (chromatic.length !== 12) fail(file, `expected 12 chromatic tones, found ${chromatic.length}`)
  return tones as PccsTone[]
}

/** The tone whose region contains this pair, or null if none does. */
export function toneAt(
  tones: PccsTone[],
  lightness: number,
  saturation: number,
): PccsTone | null {
  for (const t of tones) {
    if (t.achromatic) continue
    const [sLo, sHi] = t.saturation
    if (saturation < sLo - 0.5 || saturation > sHi + 0.5) continue
    const [lLo, lHi] = t.lightness
    // Half-open, so a colour on a boundary lands in exactly one band. The
    // topmost band in each row has to include the endpoint or 9.5 falls out.
    if (lightness >= lLo && (lightness < lHi || lHi === LIGHTNESS_MAX)) return t
  }
  return null
}
