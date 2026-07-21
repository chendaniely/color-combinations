import { describe, expect, it } from 'vitest'
import { hexToRgb } from '../src/core/colorMath'
import { nearestColors } from '../src/color/nearestColor'
import { dataset } from '../src/data'

describe('nearestColors', () => {
  it('returns an exact book color first at distance 0', () => {
    // #7e8743 is the book color "Dark Citrine"
    const out = nearestColors(dataset, hexToRgb('#7e8743'), 5)
    expect(out).toHaveLength(5)
    expect(out[0].color.hex).toBe('#7e8743')
    expect(out[0].distance).toBeCloseTo(0)
  })
  it('ranks by increasing distance', () => {
    const out = nearestColors(dataset, hexToRgb('#7c7b3f'), 6)
    for (let i = 1; i < out.length; i++) {
      expect(out[i].distance).toBeGreaterThanOrEqual(out[i - 1].distance)
    }
  })
  it('caps at count', () => {
    expect(nearestColors(dataset, hexToRgb('#123456'), 3)).toHaveLength(3)
  })
})
