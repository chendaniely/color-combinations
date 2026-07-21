import { describe, expect, it } from 'vitest'
import { averagePatch } from '../src/core/sampling'

// helper: build a width×height RGBA buffer from a per-pixel color fn
function buf(w: number, h: number, fn: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y); const i = (y * w + x) * 4
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
  }
  return d
}

describe('averagePatch', () => {
  it('returns the solid color of a uniform patch', () => {
    const d = buf(4, 4, () => [200, 40, 10])
    expect(averagePatch(d, 4, 4, 2, 2, 1)).toEqual([200, 40, 10])
  })
  it('averages a two-tone patch and rounds', () => {
    const d = buf(2, 1, (x) => (x === 0 ? [0, 0, 0] : [100, 100, 100]))
    expect(averagePatch(d, 2, 1, 0, 0, 1)).toEqual([50, 50, 50])
  })
  it('clamps the patch to the image bounds (corner tap)', () => {
    const d = buf(3, 3, () => [10, 20, 30])
    expect(averagePatch(d, 3, 3, 0, 0, 5)).toEqual([10, 20, 30]) // no out-of-range read
  })
})
