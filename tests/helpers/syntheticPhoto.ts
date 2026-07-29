import { fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import type { RGB } from '../../src/core/colorMath'

// jsdom has no canvas, no Image decoding and no object URLs. This installs the
// smallest set of fakes FaceCapture needs: a canvas whose getImageData returns
// a known buffer, an Image that "loads" on the next microtask, and object-URL
// stubs. Sibling of helpers/mockCamera.ts, which does the same for the camera.
export function installPhotoMocks(
  fill: RGB = [198, 145, 105], width = 200, height = 200,
) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = 255
  }
  // getImageData returns a FRESH copy, as the real API does — callers that
  // white-balance a frame mutate the buffer they are given, and must not be
  // able to corrupt the source pixels through it.
  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(data), width, height })),
    putImageData: vi.fn(),
  }
  ;(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext =
    vi.fn(() => ctx)
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

  const urlAny = URL as unknown as Record<string, unknown>
  urlAny.createObjectURL = vi.fn(() => 'blob:synthetic')
  urlAny.revokeObjectURL = vi.fn()

  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    width = width
    height = height
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', FakeImage)

  return { data, width, height, ctx }
}

// Pick a photo in the upload path. Analysis runs on load — there is no second
// "capture" click, because ProbeReview is the confirmation step.
export function choosePhoto(input: HTMLElement) {
  const file = new File(['pretend-jpeg'], 'face.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })
}
