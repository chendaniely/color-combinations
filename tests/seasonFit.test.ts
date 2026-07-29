// Membership and fit. The measured facts in the comments are the reason the
// site shows a fit at all, so they are asserted rather than trusted.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fitBand } from '../src/color/colorDistance'
import { idealCells, idealPairs, seasonCells, seasonMembers } from '../src/color/seasonFit'
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

// The panel exists to show where the book falls short, so the thing it must
// never do is under-report that. The first implementation deduplicated pairs by
// book colour, which dropped three of Clear Spring's ten rows — and since
// dropping a duplicate always drops the worse pairing, it removed exactly the
// evidence the panel is for.
//
// Two rows below record what measuring then showed, because the first reading of
// that screenshot was itself wrong. "10 rows, all a good match" next to "14 of
// 44 members not close" is NOT a contradiction: an ideal is matched against the
// whole book, while a member belongs to the season by its PARENT's rule and may
// sit far from this sub-season. Both numbers were right. The real limit is
// crowding, not absence.
describe('ideal pairs report the gap rather than hiding it', () => {
  it('gives exactly one row per ideal colour', () => {
    for (const sub of rules.subSeasons) {
      const ideal = idealCells(rules, sub, grid)
      const pairs = idealPairs(rules, sub, grid, colors)
      expect(pairs.length, `${sub.id} lost rows`).toBe(ideal.length)
    }
  })

  it('covers every hue of the ideal set, with no hue reported twice', () => {
    for (const sub of rules.subSeasons) {
      const pairs = idealPairs(rules, sub, grid, colors)
      const pairHues = pairs.map((p) => p.hue)
      expect(new Set(pairHues).size, `${sub.id} repeats a hue`).toBe(pairHues.length)
      expect([...pairHues], `${sub.id} is not in hue order`)
        .toEqual([...pairHues].sort((a, b) => a - b))
    }
  })

  // The behaviour the dedup destroyed. Two ideals may legitimately land on the
  // same book colour, and both rows must survive to say so.
  it('keeps both rows when two ideals share their nearest colour', () => {
    const shared = rules.subSeasons.flatMap((sub) => {
      const pairs = idealPairs(rules, sub, grid, colors)
      const counts = new Map<number, number>()
      for (const p of pairs) counts.set(p.colorId, (counts.get(p.colorId) ?? 0) + 1)
      return [...counts.values()].filter((n) => n > 1)
    })
    expect(shared.length, 'no season reuses a colour, so dedup could not be detected')
      .toBeGreaterThan(0)
  })

  // The measurement that decides what the panel should SAY. Across all twelve
  // seasons only one ideal of 142 lacks a close match, so a "N of N are a good
  // match" summary would be true and would sound like a triumph. The real limit
  // is crowding: 2 to 4 colours in each season each serve several ideals. The
  // panel therefore reports distinct colours, and this pins the fact that makes
  // that the right choice.
  it('is limited by crowding rather than by missing matches', () => {
    let crowded = 0
    let poorlyMatched = 0
    for (const sub of rules.subSeasons) {
      const pairs = idealPairs(rules, sub, grid, colors)
      if (new Set(pairs.map((p) => p.colorId)).size < pairs.length) crowded++
      poorlyMatched += pairs.filter((p) => p.band === 'not close').length
    }
    expect(crowded, 'no season is crowded, so the summary should not emphasise it')
      .toBe(rules.subSeasons.length)
    expect(poorlyMatched, 'ideals now lack matches, so the summary wording needs revisiting')
      .toBe(0)
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
