// The Lab <-> PCCS mapping is the one remaining place where we make a
// modelling judgement rather than follow a source: PCCS was defined on
// physical paper chips under illuminant C, and Wada's colours reach us as sRGB
// hex. These tests pin the properties that judgement has to preserve.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validatePccsTones } from '../src/core/pccs'
import { sourceIds, validateSources } from '../src/core/sources'
import { hueAngle, hueNumber, labToPccs, maxChroma, pccsToHex, toneOf } from '../src/color/pccsMap'

const ids = sourceIds(
  validateSources(JSON.parse(readFileSync('data/reference/sources.json', 'utf8'))),
)
const tones = validatePccsTones(
  JSON.parse(readFileSync('data/reference/pccs-tones.json', 'utf8')),
  ids,
)

describe('lightness', () => {
  // PCCS lightness IS Munsell value, and the scale is defined to run 1.5 to
  // 9.5 — black and white are the endpoints, not 0 and 10.
  it('puts black at the floor and white at the ceiling', () => {
    expect(labToPccs('#000000').lightness).toBeCloseTo(1.5, 1)
    expect(labToPccs('#ffffff').lightness).toBeCloseTo(9.5, 1)
  })

  it('rises monotonically through the greys', () => {
    const greys = ['#222222', '#555555', '#888888', '#bbbbbb', '#eeeeee']
    const ls = greys.map((g) => labToPccs(g).lightness)
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeGreaterThan(ls[i - 1])
  })
})

describe('saturation', () => {
  it('reads a pure sRGB primary as very nearly the maximum', () => {
    expect(labToPccs('#ff0000').saturation).toBeGreaterThan(8.5)
    expect(labToPccs('#00ff00').saturation).toBeGreaterThan(8.5)
  })

  it('reads a grey as zero', () => {
    expect(labToPccs('#808080').saturation).toBeCloseTo(0, 1)
  })

  // Saturation is chroma RELATIVE to what the gamut allows at that lightness.
  // Without that normalisation a pale colour could never read as vivid, and
  // the Pale and Light tones would be unreachable.
  it('is relative, so a light colour can still be highly saturated', () => {
    const pale = labToPccs('#ffd0d0')
    expect(pale.lightness).toBeGreaterThan(8)
    expect(pale.saturation).toBeGreaterThan(0)
  })
})

describe('maxChroma', () => {
  it('narrows as lightness approaches white', () => {
    expect(maxChroma(50, 40)).toBeGreaterThan(maxChroma(95, 40))
  })

  it('narrows as lightness approaches black', () => {
    expect(maxChroma(50, 40)).toBeGreaterThan(maxChroma(5, 40))
  })

  it('is never negative', () => {
    for (const L of [0, 10, 50, 90, 100]) {
      for (const h of [0, 90, 180, 270]) {
        expect(maxChroma(L, h), `L=${L} h=${h}`).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('the hue circle', () => {
  it('round-trips every one of the 24 steps', () => {
    for (let n = 1; n <= 24; n++) {
      expect(hueNumber(hueAngle(n)), `hue ${n}`).toBe(n)
    }
  })

  it('places PCCS hue 2 on red and hue 8 on yellow', () => {
    expect(hueNumber(labToPccs('#ff0000').hueAngle)).toBe(2)
    expect(hueNumber(labToPccs('#ffff00').hueAngle)).toBe(8)
  })

  it('wraps rather than running off the end', () => {
    expect(hueNumber(hueAngle(1) - 360)).toBe(1)
    expect(hueNumber(hueAngle(24) + 360)).toBe(24)
  })
})

describe('pccsToHex round-trips', () => {
  it('returns a colour that maps back to where it came from', () => {
    for (let n = 1; n <= 24; n += 3) {
      for (const lightness of [3.0, 5.0, 7.0, 8.5]) {
        for (const saturation of [2, 5, 8]) {
          const hex = pccsToHex(n, lightness, saturation)
          const back = labToPccs(hex)
          expect(back.lightness, `hue ${n} L${lightness} S${saturation}`).toBeCloseTo(lightness, 0)
          expect(back.saturation, `hue ${n} L${lightness} S${saturation}`).toBeCloseTo(saturation, 0)
        }
      }
    }
  })

  it('always produces a valid sRGB hex', () => {
    for (let n = 1; n <= 24; n++) {
      expect(pccsToHex(n, 5, 9)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('toneOf', () => {
  it('calls a pure red vivid', () => {
    expect(toneOf(tones, '#ff0000')).toBe('v')
  })

  it('assigns every colour in the book to exactly one tone', () => {
    const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8'))
    const unassigned = book.colors.filter(
      (c: { hex: string }) => toneOf(tones, c.hex) === null,
    )
    // Greys and near-blacks legitimately fall on the achromatic axis, which
    // has no chromatic tone. Everything else must land somewhere.
    for (const c of unassigned) {
      expect(labToPccs(c.hex).saturation, `${c.hex} is unassigned but not grey`).toBeLessThan(1)
    }
  })
})
