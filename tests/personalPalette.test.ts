import { describe, expect, it } from 'vitest'
import { labOf } from '../src/color/skinMetrics'
import { measuredPalette, scorePalette } from '../src/color/personalPalette'
import { dataset } from '../src/data'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../src/core/types'

const COLORS = dataset.data.colors

function reading(
  undertone: Undertone, depth: Depth, contrast: ContrastBand, skin = '#a1673f',
): SkinReading {
  const { L, h } = labOf([
    parseInt(skin.slice(1, 3), 16), parseInt(skin.slice(3, 5), 16), parseInt(skin.slice(5, 7), 16),
  ])
  return {
    skin, hair: '#1a1110', undertone, depth, contrast,
    skinL: L, skinHue: h, ita: 0, contrastGap: 40, whiteBalanced: true,
  }
}

describe('scorePalette', () => {
  const r = reading('warm', 'deep', 'high')
  const scored = scorePalette(r, COLORS)

  it('scores every colour in the book', () => {
    expect(scored).toHaveLength(COLORS.length)
  })

  it('keeps a plausible share — not everything, not nothing', () => {
    const kept = scored.filter((s) => s.keep).length
    expect(kept).toBeGreaterThan(20)
    expect(kept).toBeLessThan(120)
  })

  it('gives every kept colour reasons and no failures', () => {
    for (const s of scored.filter((x) => x.keep)) {
      expect(s.reasons.length, `${s.color.name} kept with no reason`).toBeGreaterThan(0)
      expect(s.fails).toHaveLength(0)
    }
  })

  it('gives every rejected colour at least one failure', () => {
    for (const s of scored.filter((x) => !x.keep)) {
      expect(s.fails.length, `${s.color.name} rejected with no reason`).toBeGreaterThan(0)
    }
  })

  it('writes reasons a person could actually read', () => {
    const kept = scored.find((s) => s.keep)!
    for (const reason of kept.reasons) {
      expect(reason.length).toBeGreaterThan(10)
      expect(reason).not.toMatch(/undefined|NaN|\[object/)
    }
  })

  it('never keeps a colour within 15 L* of the skin', () => {
    for (const s of scored.filter((x) => x.keep)) {
      expect(Math.abs(labOf(s.color.rgb).L - r.skinL)).toBeGreaterThanOrEqual(15)
    }
  })

  it('rejects the sallow band for every reading', () => {
    for (const u of ['warm', 'neutral', 'cool'] as Undertone[]) {
      for (const s of scorePalette(reading(u, 'medium', 'medium'), COLORS)) {
        const { C, h } = labOf(s.color.rgb)
        const sallow = (h >= 70 && h <= 100 && C < 25) || (h >= 300 && h <= 340 && C < 15)
        if (sallow) expect(s.keep, `${s.color.name} is in the sallow band`).toBe(false)
      }
    }
  })

  it('a neutral undertone is not stricter than warm or cool', () => {
    const warm = scorePalette(reading('warm', 'medium', 'medium'), COLORS).filter((s) => s.keep).length
    const cool = scorePalette(reading('cool', 'medium', 'medium'), COLORS).filter((s) => s.keep).length
    const neutral = scorePalette(reading('neutral', 'medium', 'medium'), COLORS).filter((s) => s.keep).length
    expect(neutral).toBeGreaterThanOrEqual(Math.min(warm, cool))
  })
})

// The honest failure mode of this whole feature is a visitor getting an empty
// palette — most likely a cool-toned one, since Wada's book runs 109 warm to 48
// cool. Every band the analysis can report must return something WEARABLE, not
// merely non-empty.
//
// Measured across all 108 band combinations: smallest 11, largest 70, and the
// smallest is indeed a cool reading. The floor below is set under that with
// room to spare, so it catches a real regression rather than normal drift.
const USABLE_MINIMUM = 8

describe('every tonal band gets a usable palette', () => {
  const SKINS: [string, string][] = [
    ['deep warm', '#a1673f'],
    ['deep neutral', '#654333'],
    ['mid warm', '#c69169'],
    ['mid olive', '#ad8c61'],
    ['light cool', '#edc4bd'],
    ['very light cool', '#f6e4dd'],
  ]

  for (const [name, skin] of SKINS) {
    for (const u of ['warm', 'neutral', 'cool'] as Undertone[]) {
      for (const d of ['light', 'medium', 'deep'] as Depth[]) {
        for (const c of ['high', 'medium', 'low'] as ContrastBand[]) {
          it(`${name} / ${u} / ${d} / ${c} gets a wearable palette`, () => {
            const palette = measuredPalette(reading(u, d, c, skin), COLORS)
            expect(palette.length, 'palette too small to dress from')
              .toBeGreaterThanOrEqual(USABLE_MINIMUM)
          })
        }
      }
    }
  }
})

describe('measuredPalette', () => {
  it('returns the kept colours in book order', () => {
    const r = reading('warm', 'deep', 'high')
    const ids = measuredPalette(r, COLORS).map((c) => c.id)
    expect([...ids].sort((a, b) => a - b)).toEqual(ids)
  })
})
