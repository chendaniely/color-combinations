import { describe, expect, it } from 'vitest'
import { classifySeason, seasonById, validateSeasons } from '../src/core/seasons'
import { dataset, seasons as SEASONS } from '../src/data'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../src/core/types'

const colorIds = new Set(dataset.data.colors.map((c) => c.id))

function reading(
  undertone: Undertone, depth: Depth, contrast: ContrastBand,
): SkinReading {
  return {
    skin: '#a1673f', hair: '#1a1110',
    undertone, depth, contrast,
    skinL: 50, skinHue: 57, ita: 0, contrastGap: 40, whiteBalanced: true,
  }
}

const UNDERTONES: Undertone[] = ['warm', 'neutral', 'cool']
const DEPTHS: Depth[] = ['light', 'medium', 'deep']
const CONTRASTS: ContrastBand[] = ['high', 'medium', 'low']

describe('the curated season dataset', () => {
  it('has twelve seasons with unique ids', () => {
    expect(SEASONS).toHaveLength(12)
    expect(new Set(SEASONS.map((s) => s.id)).size).toBe(12)
  })

  it('names every season', () => {
    for (const s of SEASONS) expect(s.name.length).toBeGreaterThan(0)
  })

  it('references only colours that exist', () => {
    for (const s of SEASONS) {
      for (const id of s.colorIds) {
        expect(colorIds.has(id), `season ${s.id} references missing colour ${id}`).toBe(true)
      }
    }
  })

  // Was `> 0`, which a season holding a single colour would have passed. The
  // real distribution (2026-07-29) runs 7 to 35, median 15: Cool Summer and
  // Soft Summer sit at 7, Clear Spring at 35. That spread is expected rather
  // than wrong — the book runs 109 warm colours to 48 cool, so the cool
  // seasons genuinely have fewer candidates to draw on. The floor is set below
  // the real minimum so it catches a season being gutted, not normal curation.
  it('gives every season enough colours to be worth showing', () => {
    for (const s of SEASONS) {
      expect(s.colorIds.length, `season ${s.id} has too few colours to be useful`)
        .toBeGreaterThanOrEqual(5)
    }
  })

  it('keeps the thinnest season within reach of the others', () => {
    const sizes = SEASONS.map((s) => s.colorIds.length)
    const min = Math.min(...sizes)
    const max = Math.max(...sizes)
    // A 5x spread is what the book's warm bias produces. Much beyond that and
    // the curation has drifted rather than the source being lopsided.
    expect(max / min, `season sizes range ${min}–${max}, which looks like drift`)
      .toBeLessThanOrEqual(8)
  })

  it('lists each colour at most once per season', () => {
    for (const s of SEASONS) {
      expect(new Set(s.colorIds).size).toBe(s.colorIds.length)
    }
  })
})

describe('classifySeason', () => {
  it('maps every reading the analysis can produce to exactly one real season', () => {
    // 27 combinations of the three axes. A gap here means a visitor sees an
    // error instead of a palette, so this is exhaustive on purpose.
    for (const u of UNDERTONES) {
      for (const d of DEPTHS) {
        for (const c of CONTRASTS) {
          const id = classifySeason(SEASONS, reading(u, d, c))
          expect(SEASONS.some((s) => s.id === id), `${u}/${d}/${c} -> unknown season ${id}`).toBe(true)
        }
      }
    }
  })

  it('is deterministic', () => {
    const r = reading('warm', 'deep', 'high')
    expect(classifySeason(SEASONS, r)).toBe(classifySeason(SEASONS, r))
  })

  it('puts a warm deep reading in an autumn', () => {
    expect(classifySeason(SEASONS, reading('warm', 'deep', 'high'))).toContain('autumn')
  })

  it('puts a cool deep reading in a winter', () => {
    expect(classifySeason(SEASONS, reading('cool', 'deep', 'high'))).toContain('winter')
  })

  it('seasonById returns the season, and throws on an unknown id', () => {
    expect(seasonById(SEASONS, SEASONS[0].id).name).toBe(SEASONS[0].name)
    expect(() => seasonById(SEASONS, 'not-a-season')).toThrow()
  })
})

// The file is MEANT to be hand-edited — by the owner, or by another agent
// auditing it against published sources — so the guard matters more here than
// it would for generated data.
describe('validateSeasons', () => {
  const good = {
    schemaVersion: 1,
    seasons: [{
      id: 'deep-autumn', name: 'Deep Autumn',
      undertone: 'warm', depth: 'deep', chroma: 'high',
      colorIds: [...colorIds].slice(0, 3),
    }],
  }

  it('accepts a well-formed file', () => {
    expect(validateSeasons(good, colorIds)).toHaveLength(1)
  })

  it('rejects a wrong schemaVersion', () => {
    expect(() => validateSeasons({ ...good, schemaVersion: 2 }, colorIds)).toThrow(/schemaVersion/)
  })

  it('rejects a duplicate season id', () => {
    const dup = { ...good, seasons: [good.seasons[0], good.seasons[0]] }
    expect(() => validateSeasons(dup, colorIds)).toThrow(/duplicate/i)
  })

  it('rejects an unknown colour id', () => {
    const bad = { ...good, seasons: [{ ...good.seasons[0], colorIds: [999999] }] }
    expect(() => validateSeasons(bad, colorIds)).toThrow(/999999/)
  })

  it('rejects an empty palette', () => {
    const bad = { ...good, seasons: [{ ...good.seasons[0], colorIds: [] }] }
    expect(() => validateSeasons(bad, colorIds)).toThrow(/empty/i)
  })

  it('rejects a bad axis value', () => {
    const bad = { ...good, seasons: [{ ...good.seasons[0], undertone: 'lukewarm' }] }
    expect(() => validateSeasons(bad, colorIds)).toThrow(/undertone/i)
  })

  it('rejects a non-object', () => {
    expect(() => validateSeasons(null, colorIds)).toThrow()
    expect(() => validateSeasons([], colorIds)).toThrow()
  })
})
