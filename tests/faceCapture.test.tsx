// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FaceCapture } from '../src/components/sample/FaceCapture'
import type { FaceGeometry } from '../src/core/types'
import { choosePhoto, installPhotoMocks } from './helpers/syntheticPhoto'

const FACE: FaceGeometry = {
  box: { x: 40, y: 40, width: 120, height: 150 },
  leftEye: { x: 75, y: 90 }, rightEye: { x: 125, y: 90 },
  nose: { x: 100, y: 120 }, mouth: { x: 100, y: 150 },
  leftEar: { x: 42, y: 110 }, rightEar: { x: 158, y: 110 },
}

const detectFace = vi.fn()
vi.mock('../src/face/detect', () => ({
  detectFace: (...args: unknown[]) => detectFace(...args),
  FaceModelError: class FaceModelError extends Error {},
}))

beforeEach(() => {
  detectFace.mockReset()
  installPhotoMocks()
})

afterEach(cleanup)

function fileInput() {
  return screen.getByLabelText(/choose a photo/i)
}

describe('FaceCapture', () => {
  it('offers a photo upload', () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    expect(fileInput()).toBeTruthy()
  })

  it('tells the visitor to hold up something white', () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/something white/i)).toBeTruthy()
  })

  it('reports faceFound false when no face is detected', async () => {
    detectFace.mockResolvedValue(null)
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    choosePhoto(fileInput())
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0].faceFound).toBe(false)
  })

  it('returns one sampled probe per placed patch when a face is found', async () => {
    detectFace.mockResolvedValue(FACE)
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    choosePhoto(fileInput())
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    const result = onCapture.mock.calls[0][0]
    expect(result.faceFound).toBe(true)
    expect(result.probes.length).toBeGreaterThan(0)
    for (const p of result.probes) {
      expect(p.rgb).toHaveLength(3)
      expect(typeof p.kind).toBe('string')
    }
  })

  it('asks the visitor to move closer when the face is tiny', async () => {
    detectFace.mockResolvedValue({ ...FACE, box: { ...FACE.box, width: 10 } })
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    choosePhoto(fileInput())
    expect(await screen.findByText(/move closer/i)).toBeTruthy()
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('falls back to manual tapping when the model will not load', async () => {
    detectFace.mockRejectedValue(new Error('no wasm'))
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    choosePhoto(fileInput())
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0].faceFound).toBe(false)
  })

  it('never dead-ends: a model failure still hands back a usable canvas', async () => {
    detectFace.mockRejectedValue(new Error('no wasm'))
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    choosePhoto(fileInput())
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0].canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it('rejects a file that is not an image', async () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    const notAnImage = new File(['x'], 'notes.txt', { type: 'text/plain' })
    const input = fileInput() as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [notAnImage], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(await screen.findByText(/isn.t an image/i)).toBeTruthy()
  })

  it('keeps the on-device promise visible', () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/stays on this device/i)).toBeTruthy()
  })
})
