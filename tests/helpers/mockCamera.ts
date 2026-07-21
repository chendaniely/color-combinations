import { vi } from 'vitest'
import type { RGB } from '../../src/core/colorMath'

// Install jsdom-friendly camera + canvas mocks; returns the fake track so tests
// can assert it was stopped. `sampleColor` is what getImageData returns.
export function installCameraMocks(sampleColor: RGB = [126, 135, 67]) {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] }
  const getUserMedia = vi.fn().mockResolvedValue(stream)

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  ;(HTMLMediaElement.prototype as unknown as { play: () => Promise<void> }).play =
    vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: 4, configurable: true })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: 4, configurable: true })

  const [r, g, b] = sampleColor
  const data = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  const ctx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data, width: 4, height: 4 })) }
  ;(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = vi.fn(() => ctx)
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

  return { track, getUserMedia }
}
