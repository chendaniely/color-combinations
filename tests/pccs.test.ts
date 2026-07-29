// PCCS — the Practical Color Co-ordinate System, Japan Color Research
// Institute, 1964. These two files are transcriptions of published reference
// data, so the tests are about faithfulness and internal consistency rather
// than about behaviour.
//
// The tone-collision test is the important one. Japanese Wikipedia lists
// `dull` and `grayish` with identical coordinates, which cannot be true of a
// system whose whole point is that each tone occupies its own region. That
// error is exactly the kind that survives a careless transcription, so it gets
// a test rather than a comment.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  PCCS_SCHEMA_VERSION,
  toneKey,
  validatePccsHues,
  validatePccsTones,
} from '../src/core/pccs'
import { sourceIds, validateSources } from '../src/core/sources'

const rawHues = JSON.parse(readFileSync('data/reference/pccs-hues.json', 'utf8'))
const rawTones = JSON.parse(readFileSync('data/reference/pccs-tones.json', 'utf8'))
const ids = sourceIds(
  validateSources(JSON.parse(readFileSync('data/reference/sources.json', 'utf8'))),
)

const hues = validatePccsHues(rawHues, ids)
const tones = validatePccsTones(rawTones, ids)
const chromatic = tones.filter((t) => !t.achromatic)

describe('the PCCS hue circle', () => {
  it('is at the expected schema version and describes itself', () => {
    expect(rawHues.schemaVersion).toBe(PCCS_SCHEMA_VERSION)
    expect(rawHues.description.length).toBeGreaterThan(0)
  })

  it('has 24 hues numbered 1 to 24 with no gaps', () => {
    expect(hues).toHaveLength(24)
    expect(hues.map((h) => h.n)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
  })

  it('names every hue in Japanese and English', () => {
    for (const h of hues) {
      expect(h.ja.length, `hue ${h.n} has no Japanese name`).toBeGreaterThan(0)
      expect(h.en.length, `hue ${h.n} has no English name`).toBeGreaterThan(0)
      expect(h.abbr.length, `hue ${h.n} has no abbreviation`).toBeGreaterThan(0)
    }
  })

  // Not a defect: PCCS runs 24 perceptual steps but doubles up the short
  // labels in the blue-green and blue regions. `n` is the identity, `abbr` is
  // a label. Asserted so nobody "fixes" it into 24 unique strings.
  it('allows repeated abbreviations, because the published circle repeats them', () => {
    const abbrs = hues.map((h) => h.abbr)
    expect(new Set(abbrs).size).toBeLessThan(24)
    expect(rawHues.notes, 'the repetition must be explained in the file').toMatch(/abbrev/i)
  })
})

describe('the PCCS tone system', () => {
  it('has 12 chromatic tones and 5 achromatic', () => {
    expect(chromatic).toHaveLength(12)
    expect(tones.filter((t) => t.achromatic)).toHaveLength(5)
  })

  it('keeps every tone inside the published scales', () => {
    for (const t of tones) {
      const [lLo, lHi] = t.lightness
      const [sLo, sHi] = t.saturation
      expect(lLo, `${t.abbr} lightness low`).toBeGreaterThanOrEqual(1.5)
      expect(lHi, `${t.abbr} lightness high`).toBeLessThanOrEqual(9.5)
      expect(lLo, `${t.abbr} lightness inverted`).toBeLessThanOrEqual(lHi)
      expect(sLo, `${t.abbr} saturation low`).toBeGreaterThanOrEqual(0)
      expect(sHi, `${t.abbr} saturation high`).toBeLessThanOrEqual(9)
      expect(sLo, `${t.abbr} saturation inverted`).toBeLessThanOrEqual(sHi)
    }
  })

  // The guard against the ja.wikipedia dull/grayish collision.
  it('gives no two chromatic tones the same region', () => {
    const seen = new Map<string, string>()
    for (const t of chromatic) {
      const key = toneKey(t)
      const clash = seen.get(key)
      expect(clash, `tones "${t.abbr}" and "${clash}" occupy the same region ${key}`).toBeUndefined()
      seen.set(key, t.abbr)
    }
  })

  // A colour must land in exactly one tone, or `toneOf` is not a function.
  // Within each saturation row the lightness bands must tile without gaps.
  it('partitions lightness within each saturation row', () => {
    const rows = new Map<string, typeof chromatic>()
    for (const t of chromatic) {
      const row = `${t.saturation[0]}-${t.saturation[1]}`
      rows.set(row, [...(rows.get(row) ?? []), t])
    }
    for (const [row, ts] of rows) {
      const sorted = [...ts].sort((a, b) => a.lightness[0] - b.lightness[0])
      expect(sorted[0].lightness[0], `row ${row} does not start at 1.5`).toBe(1.5)
      expect(sorted[sorted.length - 1].lightness[1], `row ${row} does not end at 9.5`).toBe(9.5)
      for (let i = 1; i < sorted.length; i++) {
        expect(
          sorted[i].lightness[0],
          `row ${row}: gap or overlap between ${sorted[i - 1].abbr} and ${sorted[i].abbr}`,
        ).toBe(sorted[i - 1].lightness[1])
      }
    }
  })

  it('covers the whole saturation scale across the rows', () => {
    const rows = [...new Set(chromatic.map((t) => `${t.saturation[0]}-${t.saturation[1]}`))].sort()
    expect(rows).toEqual(['1-3', '4-6', '7-8', '9-9'])
  })

  it('names every tone in Japanese and English', () => {
    for (const t of tones) {
      expect(t.ja.length, `${t.abbr} has no Japanese name`).toBeGreaterThan(0)
      expect(t.en.length, `${t.abbr} has no English name`).toBeGreaterThan(0)
    }
  })

  it('records the source conflict rather than smoothing it over', () => {
    expect(rawTones.notes).toMatch(/wikipedia/i)
  })
})

describe('both files cite their sources', () => {
  it('cites only ids that exist in the registry', () => {
    for (const cited of [...rawHues.sources, ...rawTones.sources]) {
      expect(ids.has(cited), `unknown source id "${cited}"`).toBe(true)
    }
  })

  it('rejects a citation that does not resolve', () => {
    const bad = { ...rawTones, sources: ['not-a-real-source'] }
    expect(() => validatePccsTones(bad, ids)).toThrow(/not-a-real-source/)
  })

  it('rejects a wrong schemaVersion', () => {
    expect(() => validatePccsHues({ ...rawHues, schemaVersion: 99 }, ids)).toThrow(/schemaVersion/)
  })
})
