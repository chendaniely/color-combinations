// Membership and fit. The measured facts in the comments are the reason the
// site shows a fit at all, so they are asserted rather than trusted.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fitBand } from '../src/color/colorDistance'
import { idealCells, seasonCells, seasonMembers } from '../src/color/seasonFit'
import { labToPccs, toneOf } from '../src/color/pccsMap'
import { validatePccsGrid, validatePccsHues, validatePccsTones } from '../src/core/pccs'
import { isTemperature, parentOf, validateSeasonRules } from '../src/core/seasons'
import { sourceIds, validateSources } from '../src/core/sources'
import type { ColorRecord } from '../src/core/types'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'))
const ids = sourceIds(validateSources(read('data/reference/sources.json')))
const hues = validatePccsHues(read('data/reference/pccs-hues.json'), ids)
const tones = validatePccsTones(read('data/reference/pccs-tones.json'), ids)
const grid = validatePccsGrid(read('data/reference/pccs-grid.json'), ids, hues, tones)
const rules = validateSeasonRules(
  read('data/curated/season-rules.json'),
  new Set(tones.map((t) => t.abbr)),
  ids,
)
const colors: ColorRecord[] = read('data/processed/colors-data.json').colors

describe('fitBand', () => {
  it('bands by distance, widest band winning the boundary', () => {
    expect(fitBand(0)).toBe('very close')
    expect(fitBand(0.05)).toBe('very close')
    expect(fitBand(0.06)).toBe('close')
    expect(fitBand(0.10)).toBe('close')
    expect(fitBand(0.11)).toBe('roughly')
    expect(fitBand(0.25)).toBe('roughly')
    expect(fitBand(0.26)).toBe('not close')
    expect(fitBand(99)).toBe('not close')
  })
})

describe('membership', () => {
  it('gives every season somebody', () => {
    for (const sub of rules.subSeasons) {
      const members = seasonMembers(rules, sub, grid, tones, colors)
      expect(members.length, `${sub.id} is empty`).toBeGreaterThan(0)
    }
  })

  it('only admits colours in the right temperature half and the parent tones', () => {
    for (const sub of rules.subSeasons) {
      const parent = parentOf(rules, sub.id)
      const allowed = new Set(parent.tones)
      for (const m of seasonMembers(rules, sub, grid, tones, colors)) {
        const color = colors.find((c) => c.id === m.colorId)!
        const tone = toneOf(tones, color.hex)
        expect(tone, `${color.name} in ${sub.id} has no tone`).not.toBeNull()
        expect(allowed.has(tone!), `${color.name} tone ${tone} not in ${parent.id}`).toBe(true)
        expect(
          isTemperature(rules, labToPccs(color.hex).hue, parent.temperature),
          `${color.name} is not ${parent.temperature}`,
        ).toBe(true)
      }
    }
  })

  // Membership is the PARENT's sourced rule, so siblings share a pool. If this
  // ever stops being true, the "sourced" claim on the parents has quietly
  // moved down to the sub-seasons.
  it('gives the three sub-seasons of a parent the same colours', () => {
    for (const p of rules.parents) {
      const kids = rules.subSeasons.filter((s) => s.parent === p.id)
      const sets = kids.map((k) =>
        seasonMembers(rules, k, grid, tones, colors).map((m) => m.colorId).sort().join(','),
      )
      expect(new Set(sets).size, `${p.id} siblings differ in membership`).toBe(1)
    }
  })

  // ...but they must RANK it differently, or the twelve are decorative. This
  // caught the first implementation, which measured fit against the parent and
  // made all three siblings identical.
  it('ranks that shared pool differently for each sub-season', () => {
    for (const p of rules.parents) {
      const kids = rules.subSeasons.filter((s) => s.parent === p.id)
      const orders = kids.map((k) =>
        seasonMembers(rules, k, grid, tones, colors).map((m) => m.colorId).join(','),
      )
      expect(new Set(orders).size, `${p.id} siblings rank identically`).toBe(kids.length)
    }
  })

  it('returns members best-fit first', () => {
    for (const sub of rules.subSeasons) {
      const members = seasonMembers(rules, sub, grid, tones, colors)
      for (let i = 1; i < members.length; i++) {
        expect(members[i].distance, `${sub.id} is unsorted`)
          .toBeGreaterThanOrEqual(members[i - 1].distance)
      }
    }
  })

  it('labels each member with the band its distance implies', () => {
    for (const sub of rules.subSeasons) {
      for (const m of seasonMembers(rules, sub, grid, tones, colors)) {
        expect(m.band).toBe(fitBand(m.distance))
      }
    }
  })
})

describe('ideal cells', () => {
  it('are the sub-season dominant tone, and a subset of the parent cells', () => {
    for (const sub of rules.subSeasons) {
      const ideal = idealCells(rules, sub, grid)
      const all = seasonCells(rules, sub, grid)
      expect(ideal.length, `${sub.id} has no ideal cells`).toBeGreaterThan(0)
      expect(ideal.length).toBeLessThanOrEqual(all.length)
      for (const c of ideal) expect(c.tone).toBe(sub.dominantTone)
    }
  })
})

// The measurement that justifies showing a fit at all. If the book ever
// changes, these numbers should be re-read rather than quietly re-baselined.
describe('why the caveat is load-bearing', () => {
  it('confirms the book is a saturated pigment book', () => {
    const muted = colors.filter((c) => labToPccs(c.hex).saturation < 3)
    expect(muted.length, 'the book has more muted colours than measured').toBeLessThan(40)
  })

  it('finds at least one season the book serves badly', () => {
    const poor = rules.subSeasons.filter((sub) => {
      const members = seasonMembers(rules, sub, grid, tones, colors)
      const good = members.filter((m) => m.band === 'very close' || m.band === 'close')
      return good.length < members.length / 3
    })
    expect(poor.length, 'no season is poorly served, which contradicts the measurement')
      .toBeGreaterThan(0)
  })
})
