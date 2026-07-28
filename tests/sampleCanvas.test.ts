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

// A canvas whose source pixels vary by column, so a mis-mapped tap reads a
// different value instead of silently agreeing.
function stripeCanvas(w: number, h: number, boxW: number, boxH: number): HTMLCanvasElement {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      data[i] = Math.round((x / (w - 1)) * 255); data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255
    }
  }
  return {
    width: w, height: h,
    getContext: () => ({ getImageData: () => ({ data, width: w, height: h }) }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: boxW, height: boxH }),
  } as unknown as HTMLCanvasElement
}

describe('sampleCanvasAt (jsdom)', () => {
  it('averages the patch at the tapped source pixel', () => {
    expect(sampleCanvasAt(mockCanvas([35, 97, 146]), 50, 50)).toEqual([35, 97, 146])
  })
  it('returns null when the canvas has no dimensions', () => {
    expect(sampleCanvasAt(mockCanvas([0, 0, 0], 0, 0), 10, 10)).toBeNull()
  })
  it('defaults to cover, matching the camera and upload pickers', () => {
    expect(sampleCanvasAt(mockCanvas([35, 97, 146]), 50, 50, 6, 'cover')).toEqual([35, 97, 146])
  })

  // ProbeReview displays the whole frame (object-fit: contain) so the white
  // object at the edge stays visible and tappable. Inverting a cover transform
  // on a contained canvas maps taps to the wrong pixels.
  it('maps a tap correctly on a contained canvas', () => {
    // 40x20 source shown in a 100x100 box: contain scale = 2.5, so the image
    // occupies y 25..75 and the full width. The left edge is x=0 in source.
    const canvas = stripeCanvas(40, 20, 100, 100)
    const left = sampleCanvasAt(canvas, 2, 50, 1, 'contain')!
    const right = sampleCanvasAt(canvas, 98, 50, 1, 'contain')!
    expect(left[0]).toBeLessThan(40)        // near the dark end of the ramp
    expect(right[0]).toBeGreaterThan(215)   // near the bright end
  })

  it('cover and contain disagree on a non-matching aspect, as they must', () => {
    const canvas = stripeCanvas(40, 20, 100, 100)
    const asCover = sampleCanvasAt(canvas, 10, 50, 1, 'cover')!
    const asContain = sampleCanvasAt(canvas, 10, 50, 1, 'contain')!
    expect(asCover[0]).not.toBe(asContain[0])
  })
})
