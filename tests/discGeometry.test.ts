import { describe, expect, it } from 'vitest'
import { discPointToHueSat, hueSatToDiscPoint } from '../src/core/discGeometry'

describe('discGeometry', () => {
  it('puts hue 0 at 12 o\'clock and increases clockwise', () => {
    expect(discPointToHueSat(0, -100, 100).h).toBeCloseTo(0)
    expect(discPointToHueSat(100, 0, 100).h).toBeCloseTo(90)
    expect(discPointToHueSat(0, 100, 100).h).toBeCloseTo(180)
    expect(discPointToHueSat(-100, 0, 100).h).toBeCloseTo(270)
  })
  it('maps radius to saturation', () => {
    expect(discPointToHueSat(0, 0, 100).s).toBe(0)
    expect(discPointToHueSat(50, 0, 100).s).toBeCloseTo(0.5)
    expect(discPointToHueSat(100, 0, 100).s).toBeCloseTo(1)
  })
  it('clamps past the rim instead of wrapping', () => {
    const far = discPointToHueSat(400, 0, 100)
    expect(far.s).toBe(1)
    expect(far.h).toBeCloseTo(90)
  })
  it('round-trips hue and saturation through a point', () => {
    for (const h of [0, 47, 120, 213, 359]) {
      for (const s of [0.15, 0.5, 1]) {
        const { dx, dy } = hueSatToDiscPoint(h, s, 118)
        const back = discPointToHueSat(dx, dy, 118)
        expect(back.h).toBeCloseTo(h)
        expect(back.s).toBeCloseTo(s)
      }
    }
  })
  it('clamps saturation when placing a point', () => {
    expect(hueSatToDiscPoint(90, 5, 100).dx).toBeCloseTo(100)
    expect(hueSatToDiscPoint(90, -3, 100).dx).toBeCloseTo(0)
  })
  it('degrades safely on a zero-size disc', () => {
    expect(discPointToHueSat(0, 0, 0)).toEqual({ h: 0, s: 0 })
  })
})
