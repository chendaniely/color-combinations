// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProbeReview } from '../src/components/sample/ProbeReview'
import type { CaptureResult } from '../src/components/sample/FaceCapture'
import type { RGB } from '../src/core/colorMath'
import { installPhotoMocks } from './helpers/syntheticPhoto'

beforeEach(() => { installPhotoMocks() })
afterEach(cleanup)

function capture(overrides: Partial<CaptureResult> = {}): CaptureResult {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 200
  return {
    canvas,
    faceFound: true,
    probes: [
      { kind: 'forehead', cx: 100, cy: 70, radius: 8, rgb: [198, 145, 105] as RGB },
      { kind: 'leftCheek', cx: 70, cy: 120, radius: 8, rgb: [200, 147, 107] as RGB },
      { kind: 'hair', cx: 100, cy: 30, radius: 8, rgb: [26, 17, 16] as RGB },
    ],
    whiteRef: { cx: 180, cy: 180, rgb: [240, 239, 237] as RGB },
    ...overrides,
  }
}

describe('ProbeReview', () => {
  it('shows the colours it read', () => {
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByText(/^skin$/i)).toBeTruthy()
    expect(screen.getByText(/^hair$/i)).toBeTruthy()
  })

  it('confirms a white-balanced reading', () => {
    const onConfirm = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm).toHaveBeenCalled()
    expect(onConfirm.mock.calls[0][0].whiteBalanced).toBe(true)
  })

  it('dismissing the white reference produces a rough reading', () => {
    const onConfirm = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /nothing white/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm.mock.calls[0][0].whiteBalanced).toBe(false)
  })

  it('reports no hair when there is no hair probe', () => {
    const onConfirm = vi.fn()
    const noHair = capture({ probes: capture().probes.filter((p) => p.kind !== 'hair') })
    render(<ProbeReview capture={noHair} onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm.mock.calls[0][0].hair).toBeNull()
  })

  it('takes skin as the median across every skin probe, not just one', () => {
    const onConfirm = vi.fn()
    // No white reference, so the median is reported unmodified and this test
    // is about the combining step alone.
    render(<ProbeReview capture={capture({ whiteRef: null })}
      onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    // forehead [198,145,105] and cheek [200,147,107] -> median [199,146,106]
    expect(onConfirm.mock.calls[0][0].skin).toBe('#c7926a')
  })

  it('offers a retake', () => {
    const onRetake = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={onRetake} />)
    fireEvent.click(screen.getByRole('button', { name: /retake/i }))
    expect(onRetake).toHaveBeenCalled()
  })

  it('offers correction controls for skin, hair and white', () => {
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByRole('button', { name: /correct.*skin/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /correct.*hair/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /correct.*white/i })).toBeTruthy()
  })

  it('cannot continue with no skin at all until the visitor taps one', () => {
    const onConfirm = vi.fn()
    const nothing = capture({ probes: [], faceFound: false, whiteRef: null })
    render(<ProbeReview capture={nothing} onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('says so when no face was found, and asks for a tap', () => {
    const nothing = capture({ probes: [], faceFound: false, whiteRef: null })
    render(<ProbeReview capture={nothing} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByText(/couldn.t find a face/i)).toBeTruthy()
  })
})
