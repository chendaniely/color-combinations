import { describe, expect, it } from 'vitest'
import { hexToRgb } from '../src/core/colorMath'
import { closenessLabel, colorDistance } from '../src/color/colorDistance'

describe('colorDistance seam', () => {
  it('is zero for identical colors and symmetric', () => {
    const a = hexToRgb('#7e8743'), b = hexToRgb('#236192')
    expect(colorDistance(a, a)).toBeCloseTo(0)
    expect(colorDistance(a, b)).toBeCloseTo(colorDistance(b, a))
  })
  it('grows with perceptual difference', () => {
    const black = hexToRgb('#000000')
    expect(colorDistance(black, hexToRgb('#ffffff')))
      .toBeGreaterThan(colorDistance(black, hexToRgb('#222222')))
  })
  it('labels closeness in plain words', () => {
    expect(closenessLabel(0)).toBe('very close')
    expect(closenessLabel(0.07)).toBe('close')
    expect(closenessLabel(0.2)).toBe('roughly')
  })
})
