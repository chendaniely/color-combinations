// The season rules replaced twelve hand-listed palettes that had no published
// source. The tests below are mostly about keeping the line between "sourced"
// and "ours" from blurring, because that line is the entire point: the site
// makes a claim to the visitor about which half is which.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validatePccsTones } from '../src/core/pccs'
import {
  classifySeason,
  isTemperature,
  parentOf,
  seasonById,
  validateSeasonRules,
  type ToneBands,
} from '../src/core/seasons'
import { sourceIds, validateSources } from '../src/core/sources'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../src/core/types'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const ids = sourceIds(validateSources(read('data/reference/sources.json')))
const tones = validatePccsTones(read('data/reference/pccs-tones.json'), ids)
const toneAbbrs = new Set(tones.map((t) => t.abbr))
const raw = read('data/curated/season-rules.json')
const rules = validateSeasonRules(raw, toneAbbrs, ids)

const toneBands = new Map<string, ToneBands>(
  tones
    .filter((t) => t.representative)
    .map((t) => [t.abbr, t.representative!]),
)

function reading(undertone: Undertone, depth: Depth, contrast: ContrastBand): SkinReading {
  return {
    skin: '#a1673f', hair: '#1a1110',
    undertone, depth, contrast,
    skinL: 50, skinHue: 57, ita: 0, contrastGap: 40, whiteBalanced: true,
  }
}

const UNDERTONES: Undertone[] = ['warm', 'neutral', 'cool']
const DEPTHS: Depth[] = ['light', 'medium', 'deep']
const CONTRASTS: ContrastBand[] = ['high', 'medium', 'low']

describe('the four parent seasons', () => {
  it('are exactly spring, summer, autumn and winter', () => {
    expect(rules.parents.map((p) => p.id).sort()).toEqual(['autumn', 'spring', 'summer', 'winter'])
  })

  // The claim the site makes to the visitor. If a parent stops being sourced,
  // the two-level display is lying.
  it('are all marked sourced and all cite a real source', () => {
    for (const p of rules.parents) {
      expect(p.sourced, `${p.id}`).toBe(true)
      expect(p.sources.length, `${p.id} cites nothing`).toBeGreaterThan(0)
      for (const id of p.sources) expect(ids.has(id), `${p.id} cites "${id}"`).toBe(true)
    }
  })

  it('build each season from tones that exist', () => {
    for (const p of rules.parents) {
      expect(p.tones.length).toBeGreaterThan(0)
      for (const t of p.tones) expect(toneAbbrs.has(t), `${p.id} uses "${t}"`).toBe(true)
    }
  })

  it('splits warm and cool between them', () => {
    const temps = rules.parents.map((p) => p.temperature)
    expect(temps.filter((t) => t === 'warm')).toHaveLength(2)
    expect(temps.filter((t) => t === 'cool')).toHaveLength(2)
  })
})

describe('the twelve sub-seasons', () => {
  it('are twelve, with unique ids', () => {
    expect(rules.subSeasons).toHaveLength(12)
    expect(new Set(rules.subSeasons.map((s) => s.id)).size).toBe(12)
  })

  // The other half of the honesty claim. These are ours; nothing may quietly
  // promote them.
  it('are all marked as NOT sourced', () => {
    for (const s of rules.subSeasons) expect(s.sourced, `${s.id}`).toBe(false)
  })

  it('each has a dominant tone belonging to its own parent', () => {
    for (const s of rules.subSeasons) {
      const parent = parentOf(rules, s.id)
      expect(parent.tones, `${s.id} tone "${s.dominantTone}" not in ${parent.id}`)
        .toContain(s.dominantTone)
    }
  })

  it('gives every parent exactly three', () => {
    for (const p of rules.parents) {
      const kids = rules.subSeasons.filter((s) => s.parent === p.id)
      expect(kids, `${p.id} has ${kids.length}`).toHaveLength(3)
    }
  })

  // Deliberate: a dull warm and a dull cool are different colours, so the same
  // tone may head sub-seasons of different parents. Asserted so it is not
  // "fixed".
  it('allows a dominant tone to repeat across different parents', () => {
    const byTone = new Map<string, string[]>()
    for (const s of rules.subSeasons) {
      byTone.set(s.dominantTone, [...(byTone.get(s.dominantTone) ?? []), s.parent])
    }
    const shared = [...byTone.values()].filter((parents) => parents.length > 1)
    expect(shared.length).toBeGreaterThan(0)
    for (const parents of shared) expect(new Set(parents).size).toBe(parents.length)
  })
})

describe('the temperature split', () => {
  it('assigns all 24 hues exactly once', () => {
    const all = [...rules.temperature.warm, ...rules.temperature.cool].sort((a, b) => a - b)
    expect(all).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
  })

  it('gives a reason for every hue that is not obviously one or the other', () => {
    // The core arcs need no defence; the straddlers do. Every hue named in
    // `reasons` must be real, and the ambiguous ones must all be covered.
    for (const key of Object.keys(rules.temperature.reasons)) {
      const n = Number(key)
      expect(Number.isInteger(n) && n >= 1 && n <= 24, `reason for "${key}"`).toBe(true)
      expect(rules.temperature.reasons[key].length).toBeGreaterThan(10)
    }
    for (const n of [1, 2, 11, 12, 13, 22, 23, 24]) {
      expect(rules.temperature.reasons[String(n)], `hue ${n} is unexplained`).toBeDefined()
    }
  })

  it('answers isTemperature consistently with the lists', () => {
    for (const n of rules.temperature.warm) {
      expect(isTemperature(rules, n, 'warm'), `hue ${n}`).toBe(true)
      expect(isTemperature(rules, n, 'cool'), `hue ${n}`).toBe(false)
    }
  })

  it('records the imbalance as intentional rather than leaving it to look like a bug', () => {
    expect(rules.temperature.warm.length).not.toBe(rules.temperature.cool.length)
    expect(raw.notes).toMatch(/10 warm/)
  })
})

describe('classifySeason', () => {
  it('maps every reading the analysis can produce to exactly one real season', () => {
    for (const u of UNDERTONES) {
      for (const d of DEPTHS) {
        for (const c of CONTRASTS) {
          const id = classifySeason(rules, reading(u, d, c), toneBands)
          expect(
            rules.subSeasons.some((s) => s.id === id),
            `${u}/${d}/${c} -> unknown season ${id}`,
          ).toBe(true)
        }
      }
    }
  })

  it('is deterministic', () => {
    const r = reading('warm', 'deep', 'high')
    expect(classifySeason(rules, r, toneBands)).toBe(classifySeason(rules, r, toneBands))
  })

  // The result must be a property of the RULES, not of their order in the file.
  // season-rules.json is hand-editable by design, and before the explicit
  // tiebreak a tie was won by whichever row came first — so swapping two lines
  // would silently change what a visitor is told. Worst for a NEUTRAL undertone,
  // which no parent matches, so every season scores zero on the heaviest axis
  // and ties are the norm rather than the exception.
  it('does not depend on the order of rows in season-rules.json', () => {
    const shuffled = {
      ...rules,
      subSeasons: [...rules.subSeasons].reverse(),
      parents: [...rules.parents].reverse(),
    }
    for (const u of UNDERTONES) {
      for (const d of DEPTHS) {
        for (const c of CONTRASTS) {
          const r = reading(u, d, c)
          expect(
            classifySeason(shuffled, r, toneBands),
            `${u}/${d}/${c} changed when the rules were reordered`,
          ).toBe(classifySeason(rules, r, toneBands))
        }
      }
    }
  })

  // A neutral undertone is a real reading — skinMetrics returns it — and it
  // matches no parent, so it is decided by depth and chroma alone. Assert it
  // still reaches BOTH families rather than collapsing onto one, which would
  // mean neutral visitors were quietly being told they are warm.
  it('sends a neutral undertone to both warm and cool families', () => {
    const temps = new Set<string>()
    for (const d of DEPTHS) {
      for (const c of CONTRASTS) {
        temps.add(parentOf(rules, classifySeason(rules, reading('neutral', d, c), toneBands)).temperature)
      }
    }
    expect([...temps].sort()).toEqual(['cool', 'warm'])
  })

  it('puts a warm reading under a warm parent', () => {
    const id = classifySeason(rules, reading('warm', 'deep', 'high'), toneBands)
    expect(parentOf(rules, id).temperature).toBe('warm')
  })

  it('puts a cool reading under a cool parent', () => {
    const id = classifySeason(rules, reading('cool', 'deep', 'high'), toneBands)
    expect(parentOf(rules, id).temperature).toBe('cool')
  })

  it('seasonById returns the season and throws on an unknown id', () => {
    expect(seasonById(rules, rules.subSeasons[0].id).name).toBe(rules.subSeasons[0].name)
    expect(() => seasonById(rules, 'not-a-season')).toThrow()
  })
})

describe('validateSeasonRules', () => {
  it('rejects a wrong schemaVersion', () => {
    expect(() => validateSeasonRules({ ...raw, schemaVersion: 9 }, toneAbbrs, ids))
      .toThrow(/schemaVersion/)
  })

  it('rejects a parent that is not sourced', () => {
    const bad = { ...raw, parents: raw.parents.map((p: object, i: number) =>
      i === 0 ? { ...p, sourced: false } : p) }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/must be sourced/)
  })

  it('rejects a sub-season claiming to be sourced', () => {
    const bad = { ...raw, subSeasons: raw.subSeasons.map((s: object, i: number) =>
      i === 0 ? { ...s, sourced: true } : s) }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/sourced: false/)
  })

  it('rejects a dominant tone the parent does not have', () => {
    const bad = { ...raw, subSeasons: raw.subSeasons.map((s: { id: string }) =>
      s.id === 'deep-autumn' ? { ...s, dominantTone: 'p' } : s) }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/not in parent/)
  })

  it('rejects an unknown tone', () => {
    const bad = { ...raw, subSeasons: raw.subSeasons.map((s: { id: string }) =>
      s.id === 'deep-autumn' ? { ...s, dominantTone: 'zz' } : s) }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/unknown tone/)
  })

  it('rejects a hue left out of the temperature split', () => {
    const bad = { ...raw, temperature: { ...raw.temperature, warm: raw.temperature.warm.slice(1) } }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/23 hues|expected 24/)
  })

  it('rejects a hue in both halves', () => {
    const bad = {
      ...raw,
      temperature: {
        ...raw.temperature,
        warm: [...raw.temperature.warm.slice(1), raw.temperature.cool[0]],
      },
    }
    expect(() => validateSeasonRules(bad, toneAbbrs, ids)).toThrow(/both temperature halves/)
  })

  it('rejects a non-object', () => {
    expect(() => validateSeasonRules(null, toneAbbrs, ids)).toThrow()
    expect(() => validateSeasonRules([], toneAbbrs, ids)).toThrow()
  })
})
