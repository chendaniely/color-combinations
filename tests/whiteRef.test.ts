import { describe, expect, it } from 'vitest'
import { findWhiteRef } from '../src/core/whiteRef'
import type { RGB } from '../src/core/colorMath'

// Build a WxH image, then paint a rectangle a given colour.
function image(w: number, h: number, bg: RGB): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = bg[0]; d[i * 4 + 1] = bg[1]; d[i * 4 + 2] = bg[2]; d[i * 4 + 3] = 255
  }
  return d
}
function paint(
  d: Uint8ClampedArray, w: number,
  x0: number, y0: number, x1: number, y1: number, c: RGB,
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]
    }
  }
}

describe('findWhiteRef', () => {
  it('finds a neutral bright patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 65, 65, 99, 99, [232, 231, 229])   // a sheet of paper
    const got = findWhiteRef(d, 100, 100, null)!
    expect(got).not.toBeNull()
    expect(got.rgb[0]).toBeGreaterThan(200)
    expect(got.cx).toBeGreaterThan(60)
    expect(got.cy).toBeGreaterThan(60)
  })

  it('ignores a bright but saturated patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 65, 65, 99, 99, [240, 90, 20])     // NYC orange, not white
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('rejects a clipped patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 65, 65, 99, 99, [255, 255, 254])   // blown out
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('rejects a patch too dark to be a lit white', () => {
    const d = image(100, 100, [10, 10, 10])
    paint(d, 100, 65, 65, 99, 99, [70, 70, 70])      // grey in shadow
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('never returns a patch inside the face box', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 20, 20, 60, 60, [235, 234, 232])   // a bright forehead
    const box = { x: 15, y: 15, width: 50, height: 50 }
    expect(findWhiteRef(d, 100, 100, box)).toBeNull()
  })

  it('returns null for a frame with nothing white in it', () => {
    expect(findWhiteRef(image(100, 100, [40, 38, 36]), 100, 100, null)).toBeNull()
  })
})
