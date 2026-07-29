import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  cmykToRgb, hexToRgb, hsvToRgb, hueOf, isNeutral, parseCmyk, parseRgb, rgbToCmyk, rgbToHex, rgbToHsl, rgbToHsv,
} from '../src/core/colorMath'

describe('colorMath', () => {
  it('parses hex', () => {
    expect(hexToRgb('#ffb3f0')).toEqual([255, 179, 240])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })
  it('formats rgb as lowercase hex, inverting hexToRgb', () => {
    expect(rgbToHex([255, 179, 240])).toBe('#ffb3f0')
    expect(rgbToHex([0, 0, 0])).toBe('#000000')
    expect(rgbToHex([35, 97, 146])).toBe('#236192') // pads single-digit channels
    expect(rgbToHex(hexToRgb('#f26522'))).toBe('#f26522')
  })
  it('converts to hsl', () => {
    expect(rgbToHsl([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsl([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsl([255, 255, 255]).l).toBeCloseTo(1)
    expect(rgbToHsl([255, 255, 255]).s).toBeCloseTo(0)
  })
  it('hueOf matches known colors', () => {
    expect(hueOf('#ffb3f0')).toBeGreaterThan(300) // Hermosa Pink ≈ 311.84
    expect(hueOf('#ffb3f0')).toBeLessThan(330)
  })
  it('flags neutrals by low saturation', () => {
    expect(isNeutral('#808080')).toBe(true)
    expect(isNeutral('#ff3319')).toBe(false)
  })
  it('converts to hsv', () => {
    expect(rgbToHsv([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsv([255, 0, 0]).s).toBeCloseTo(1)
    expect(rgbToHsv([255, 0, 0]).v).toBeCloseTo(1)
    expect(rgbToHsv([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsv([0, 0, 255]).h).toBeCloseTo(240)
  })
  // HSL and HSV share one hue definition (the private hueFrom helper). This is
  // the invariant that lets them share it — if anyone re-inlines the sector
  // maths into one of them and gets it subtly wrong, this fails.
  it('agrees on hue between hsl and hsv, across the whole wheel', () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 17) {
        for (let b = 0; b <= 255; b += 17) {
          expect(rgbToHsv([r, g, b]).h).toBeCloseTo(rgbToHsl([r, g, b]).h, 10)
        }
      }
    }
  })
  it('reports zero saturation for grays and black', () => {
    expect(rgbToHsv([128, 128, 128]).s).toBe(0)
    expect(rgbToHsv([128, 128, 128]).v).toBeCloseTo(128 / 255)
    expect(rgbToHsv([0, 0, 0]).s).toBe(0)
    expect(rgbToHsv([0, 0, 0]).v).toBe(0)
  })
  it('hsvToRgb inverts rgbToHsv', () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual([255, 0, 0])
    expect(hsvToRgb({ h: 0, s: 0, v: 0 })).toEqual([0, 0, 0])
    expect(hsvToRgb(rgbToHsv([35, 97, 146]))).toEqual([35, 97, 146])
  })
  it('hsvToRgb wraps hue outside 0-360', () => {
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 0, s: 1, v: 1 }))
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 240, s: 1, v: 1 }))
  })
  it('round-trips every book color through HSV without drift', () => {
    // The picker holds HSV and derives RGB for display on every render, so any
    // drift here would show up as the hex silently changing while the user
    // drags the brightness slider.
    const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
      colors: { name: string; rgb: [number, number, number] }[]
    }
    const drifted = book.colors.filter(
      (c) => hsvToRgb(rgbToHsv(c.rgb)).some((n, i) => n !== c.rgb[i]),
    )
    expect(drifted.map((c) => c.name)).toEqual([])
  })
})

describe('cmyk matches the book', () => {
  const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
    colors: { name: string; rgb: [number, number, number]; cmyk: [number, number, number, number] }[]
  }

  it('round-trips rgb through cmyk', () => {
    expect(rgbToCmyk([255, 255, 255])).toEqual([0, 0, 0, 0])
    expect(rgbToCmyk([0, 0, 0])).toEqual([0, 0, 0, 100])
    expect(cmykToRgb([0, 0, 0, 100])).toEqual([0, 0, 0])
    expect(cmykToRgb([0, 30, 6, 0])).toEqual([255, 179, 240]) // Hermosa Pink
  })

  it("reproduces every book color's stored RGB from its stored CMYK", () => {
    const off = book.colors.filter(
      (c) => cmykToRgb(c.cmyk).some((n, i) => n !== c.rgb[i]),
    )
    // Exactly one known-malformed source record (M = 106%). If this count
    // changes, the upstream data changed — investigate before touching this test.
    expect(off.map((c) => c.name)).toEqual(['Dull Violet Black'])
  })
})

describe('color text parsers', () => {
  it('parses rgb in the shapes people paste', () => {
    expect(parseRgb('35, 97, 146')).toEqual([35, 97, 146])
    expect(parseRgb('35 97 146')).toEqual([35, 97, 146])
    expect(parseRgb('  rgb(35,97,146)  ')).toEqual([35, 97, 146])
    expect(parseRgb('35/97/146')).toEqual([35, 97, 146])
    expect(parseRgb('34.6, 97.2, 146')).toEqual([35, 97, 146])
  })
  it('rejects bad rgb', () => {
    expect(parseRgb('')).toBe(null)
    expect(parseRgb('35, 97')).toBe(null)
    expect(parseRgb('35, 97, 146, 2')).toBe(null)
    expect(parseRgb('35, 97, 256')).toBe(null)
    expect(parseRgb('35, -1, 146')).toBe(null)
    expect(parseRgb('red, green, blue')).toBe(null)
  })
  it('parses cmyk', () => {
    expect(parseCmyk('76, 34, 0, 43')).toEqual([76, 34, 0, 43])
    expect(parseCmyk('cmyk(0 30 6 0)')).toEqual([0, 30, 6, 0])
  })
  it('rejects bad cmyk, including the out-of-range value in the source data', () => {
    expect(parseCmyk('76, 34, 0')).toBe(null)
    expect(parseCmyk('95, 106, 38, 50')).toBe(null) // Dull Violet Black's malformed M
    expect(parseCmyk('nope')).toBe(null)
  })
  it('rejects a wrapper meant for the other notation (finding 1)', () => {
    // The picker has one field per notation; pasting rgb(...) into the CMYK
    // field must not be silently accepted as CMYK, and vice versa.
    expect(parseCmyk('rgb(76,34,0,43)')).toBe(null)
    expect(parseRgb('foo(35,97,146')).toBe(null)
  })
  it('still accepts a correctly wrapped value for each parser', () => {
    expect(parseRgb('rgb(35, 97, 146)')).toEqual([35, 97, 146])
    expect(parseCmyk('cmyk(76, 34, 0, 43)')).toEqual([76, 34, 0, 43])
  })
  it('rejects unbalanced parentheses (finding 2)', () => {
    expect(parseRgb('35, 97, 146)')).toBe(null) // stray trailing paren, no wrapper
    expect(parseRgb('rgb(35,97,146')).toBe(null) // wrapper opened but never closed
  })
  it('rejects non-decimal numeric literals (finding 3)', () => {
    expect(parseRgb('0x10,0x10,0x10')).toBe(null) // hex literals
    expect(parseRgb('1e2,1e2,1e2')).toBe(null) // exponential literals
    // Infinity/NaN must stay rejected too.
    expect(parseRgb('Infinity, Infinity, Infinity')).toBe(null)
    expect(parseRgb('NaN, NaN, NaN')).toBe(null)
  })
})
