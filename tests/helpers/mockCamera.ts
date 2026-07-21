import { vi } from 'vitest'
import type { RGB } from '../../src/core/colorMath'

// Install jsdom-friendly camera + canvas mocks; returns the fake track so tests
// can assert it was stopped. `sampleColor` is what getImageData returns (as a
// uniform fill) unless `options.pixelColor` is given, in which case each pixel
// is computed per-(x,y) — needed to test non-uniform-image / non-square-aspect
// coordinate mapping (object-fit: cover). `options.width`/`height` set the
// source (video/canvas) pixel dimensions; the displayed box stays 100×100
// (see getBoundingClientRect below) unless the test itself overrides it.
export function installCameraMocks(
  sampleColor: RGB = [126, 135, 67],
  options: { width?: number; height?: number; pixelColor?: (x: number, y: number) => RGB } = {},
) {
  const { width = 4, height = 4, pixelColor } = options
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] }
  const getUserMedia = vi.fn().mockResolvedValue(stream)

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  ;(HTMLMediaElement.prototype as unknown as { play: () => Promise<void> }).play =
    vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: width, configurable: true })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: height, configurable: true })

  const colorAt = pixelColor ?? (() => sampleColor)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colorAt(x, y)
      const i = (y * width + x) * 4
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
    }
  }
  const ctx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data, width, height })) }
  ;(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = vi.fn(() => ctx)
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

  return { track, getUserMedia }
}
