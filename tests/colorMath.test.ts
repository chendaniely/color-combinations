import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  cmykToRgb, hexToRgb, hsvToRgb, hueOf, isNeutral, readableTextOn, rgbToCmyk, rgbToHsl, rgbToHsv,
} from '../src/core/colorMath'

describe('colorMath', () => {
  it('parses hex', () => {
    expect(hexToRgb('#ffb3f0')).toEqual([255, 179, 240])
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })
  it('converts to hsl', () => {
    expect(rgbToHsl([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsl([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsl([255, 255, 255]).l).toBeCloseTo(1)
    expect(rgbToHsl([255, 255, 255]).s).toBeCloseTo(0)
  })
  it('hueOf matches known colors', () => {
    expect(hueOf('#ffb3f0')).toBeGreaterThan(300) // Hermosa Pink ≈ 316
    expect(hueOf('#ffb3f0')).toBeLessThan(330)
  })
  it('flags neutrals by low saturation', () => {
    expect(isNeutral('#808080')).toBe(true)
    expect(isNeutral('#ff3319')).toBe(false)
  })
  it('picks readable text color', () => {
    expect(readableTextOn('#1b3644')).toBe('light') // dark slate → light text
    expect(readableTextOn('#ffcfc4')).toBe('dark')
  })
  it('converts to hsv', () => {
    expect(rgbToHsv([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsv([255, 0, 0]).s).toBeCloseTo(1)
    expect(rgbToHsv([255, 0, 0]).v).toBeCloseTo(1)
    expect(rgbToHsv([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsv([0, 0, 255]).h).toBeCloseTo(240)
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
