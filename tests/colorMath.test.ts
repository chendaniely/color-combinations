import { describe, expect, it } from 'vitest'
import {
  hexToRgb, hueOf, isNeutral, readableTextOn, rgbToHsl,
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
})
