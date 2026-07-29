import { describe, expect, it } from 'vitest'
import { colorDistance } from '../src/color/colorDistance'
import { labOf, readSkin } from '../src/color/skinMetrics'
import { whiteBalance, whiteBalanceTable } from '../src/color/whiteBalance'
import type { RGB } from '../src/core/colorMath'

// Fixtures spanning the tonal range. A regression that degrades deeper tones
// must fail here — see the spec: this is a correctness requirement, not
// diligence theatre. Verified Lab values are in the comments.
const DEEP_WARM: RGB = [161, 103, 63]     // L 49.4  h 57.1  -> warm, deep
const MID_WARM: RGB = [198, 145, 105]     // L 64.7  h 59.9  -> warm, medium
const LIGHT_COOL: RGB = [237, 196, 189]   // L 82.6  h 33.1  -> cool, light
const BLACK_HAIR: RGB = [26, 17, 16]      // L  6.0
const ASH_HAIR: RGB = [107, 85, 69]       // L 38.1

describe('whiteBalance', () => {
  it('is the identity when there is no reference', () => {
    expect(whiteBalance(MID_WARM, null)).toEqual(MID_WARM)
  })
  it('is the identity when the reference is already neutral white', () => {
    expect(whiteBalance(MID_WARM, [255, 255, 255])).toEqual(MID_WARM)
  })
  it('cools a warm-lit photo when the reference is warm', () => {
    // Tungsten light: the "white" object came out orange.
    const corrected = whiteBalance(MID_WARM, [240, 210, 180])
    expect(corrected[2]).toBeGreaterThan(MID_WARM[2])   // blue is lifted
  })
  it('never exceeds the channel range', () => {
    const c = whiteBalance([250, 250, 250], [100, 200, 255])
    for (const v of c) {
      expect(v).toBeLessThanOrEqual(255)
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })
})

// Does the correction actually RECOVER the true colour, not merely change it?
// An illuminant multiplies linear light, so we simulate a cast physically and
// measure what is left over after correcting.
describe('whiteBalance accuracy under a simulated cast', () => {
  const dec = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const enc = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  // Apply per-channel linear gains, the way a light source does.
  const under = (rgb: RGB, gain: RGB): RGB =>
    rgb.map((v, i) => clamp(enc(dec(v / 255) * gain[i]) * 255)) as RGB

  const WHITE_REFLECTANCE = 0.85
  const CASTS: [string, RGB][] = [
    ['tungsten', [1.0, 0.78, 0.52]],
    ['blue shade', [0.72, 0.86, 1.0]],
    ['extreme tungsten', [1.0, 0.55, 0.25]],
    ['extreme blue', [0.45, 0.70, 1.0]],
  ]
  const SKINS: [string, RGB][] = [
    ['deep warm', [161, 103, 63]],
    ['mid warm', [198, 145, 105]],
    ['light cool', [237, 196, 189]],
    ['deep neutral', [101, 67, 51]],
  ]

  for (const [castName, gain] of CASTS) {
    for (const [skinName, skin] of SKINS) {
      it(`recovers ${skinName} skin under ${castName}`, () => {
        const observed = under(skin, gain)
        const whiteObserved = under([255, 255, 255].map((v) => v * WHITE_REFLECTANCE) as RGB, gain)
        const corrected = whiteBalance(observed, whiteObserved)

        const before = colorDistance(skin, observed)
        const after = colorDistance(skin, corrected)
        // OKLab distance: 0.02 is a small but visible step; the residual must
        // be well inside that, and far better than doing nothing.
        expect(after).toBeLessThan(0.02)
        expect(after).toBeLessThan(before)
      })
    }
  }

  it('preserves the undertone verdict through every cast', () => {
    for (const [, gain] of CASTS) {
      for (const [, skin] of SKINS) {
        const truth = readSkin(skin, null, null).undertone
        const observed = under(skin, gain)
        const whiteObserved = under([255, 255, 255].map((v) => v * WHITE_REFLECTANCE) as RGB, gain)
        expect(readSkin(observed, null, whiteObserved).undertone).toBe(truth)
      }
    }
  })
})

describe('whiteBalanceTable', () => {
  const REFS: RGB[] = [[240, 210, 180], [200, 220, 255], [255, 255, 255], [120, 100, 70]]

  it('gives byte-identical results to whiteBalance for every input value', () => {
    // The table is only worth having if it is exactly the same correction —
    // the photo preview and the measured reading must never disagree.
    for (const ref of REFS) {
      const [tr, tg, tb] = whiteBalanceTable(ref)
      for (let v = 0; v < 256; v++) {
        const direct = whiteBalance([v, v, v], ref)
        expect([tr[v], tg[v], tb[v]]).toEqual(direct)
      }
    }
  })

  it('maps the reference itself to a neutral grey', () => {
    for (const ref of REFS) {
      const [tr, tg, tb] = whiteBalanceTable(ref)
      const corrected = [tr[ref[0]], tg[ref[1]], tb[ref[2]]]
      // All three channels should land on the same value — that IS the
      // definition of the correction having worked.
      expect(Math.max(...corrected) - Math.min(...corrected)).toBeLessThanOrEqual(1)
    }
  })

  it('returns one 256-entry table per channel', () => {
    const tables = whiteBalanceTable([240, 210, 180])
    expect(tables).toHaveLength(3)
    for (const t of tables) expect(t).toHaveLength(256)
  })
})

describe('readSkin', () => {
  it('reads a deep warm face with black hair', () => {
    const r = readSkin(DEEP_WARM, BLACK_HAIR, null)
    expect(r.undertone).toBe('warm')
    expect(r.depth).toBe('deep')
    expect(r.contrast).toBe('high')
    expect(r.whiteBalanced).toBe(false)
    expect(r.skin).toMatch(/^#[0-9a-f]{6}$/)
    expect(r.hair).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('reads a light cool face', () => {
    const r = readSkin(LIGHT_COOL, ASH_HAIR, [250, 250, 250])
    expect(r.undertone).toBe('cool')
    expect(r.depth).toBe('light')
    expect(r.whiteBalanced).toBe(true)
  })

  it('reads a mid warm face', () => {
    const r = readSkin(MID_WARM, ASH_HAIR, null)
    expect(r.undertone).toBe('warm')
    expect(r.depth).toBe('medium')
  })

  it('handles a face with no visible hair', () => {
    const r = readSkin(MID_WARM, null, null)
    expect(r.hair).toBeNull()
    expect(r.contrastGap).toBeNull()
    expect(['high', 'medium', 'low']).toContain(r.contrast)
  })

  it('reports ITA in degrees, rising as skin lightens', () => {
    const deep = readSkin(DEEP_WARM, null, null)
    const light = readSkin(LIGHT_COOL, null, null)
    expect(light.ita).toBeGreaterThan(deep.ita)
  })

  it('contrast survives a bad white balance but undertone need not', () => {
    // Same face, same hair, photographed under a strong colour cast.
    const cast = (c: RGB): RGB =>
      [Math.min(255, c[0] * 1.2), c[1], c[2] * 0.8] as RGB
    const honest = readSkin(DEEP_WARM, BLACK_HAIR, null)
    const casted = readSkin(cast(DEEP_WARM), cast(BLACK_HAIR), null)
    expect(casted.contrast).toBe(honest.contrast)
  })
})

describe('labOf', () => {
  it('gives L 100 for white and 0 for black', () => {
    expect(labOf([255, 255, 255]).L).toBeCloseTo(100, 0)
    expect(labOf([0, 0, 0]).L).toBeCloseTo(0, 0)
  })
  it('gives a hue angle in 0..360', () => {
    const h = labOf([200, 60, 40]).h
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
  })
})
