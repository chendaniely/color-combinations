// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sampleCanvasAt } from '../src/components/camera/sampleCanvas'

// A 4×4 canvas of one color, displayed in a 100×100 box (object-fit: cover).
function mockCanvas(pixel: [number, number, number], w = 4, h = 4): HTMLCanvasElement {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { data[i * 4] = pixel[0]; data[i * 4 + 1] = pixel[1]; data[i * 4 + 2] = pixel[2]; data[i * 4 + 3] = 255 }
  return {
    width: w, height: h,
    getContext: () => ({ getImageData: () => ({ data, width: w, height: h }) }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  } as unknown as HTMLCanvasElement
}

describe('sampleCanvasAt (jsdom)', () => {
  it('averages the patch at the tapped source pixel', () => {
    expect(sampleCanvasAt(mockCanvas([35, 97, 146]), 50, 50)).toEqual([35, 97, 146])
  })
  it('returns null when the canvas has no dimensions', () => {
    expect(sampleCanvasAt(mockCanvas([0, 0, 0], 0, 0), 10, 10)).toBeNull()
  })
})
