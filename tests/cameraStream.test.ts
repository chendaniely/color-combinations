import { describe, expect, it, vi } from 'vitest'
import { cameraSupported, stopStream } from '../src/components/camera/cameraStream'

describe('cameraStream', () => {
  it('stops every track', () => {
    const t1 = { stop: vi.fn() }, t2 = { stop: vi.fn() }
    stopStream({ getTracks: () => [t1, t2] } as unknown as MediaStream)
    expect(t1.stop).toHaveBeenCalledOnce()
    expect(t2.stop).toHaveBeenCalledOnce()
  })
  it('tolerates a null stream', () => {
    expect(() => stopStream(null)).not.toThrow()
  })
  it('reports unsupported outside a secure browser (node)', () => {
    expect(cameraSupported()).toBe(false) // no window/navigator in the node test env
  })
})
