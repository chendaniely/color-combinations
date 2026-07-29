// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProbeReview } from '../src/components/sample/ProbeReview'
import type { CaptureResult } from '../src/components/sample/FaceCapture'
import type { RGB } from '../src/core/colorMath'
import { installPhotoMocks } from './helpers/syntheticPhoto'

beforeEach(() => { installPhotoMocks() })
afterEach(cleanup)

// Regression tests for the two display defects found on 2026-07-28: the
// photograph was invisible on the camera path, and the probe dots were placed
// in a coordinate space that did not match how the canvas was rendered.
function capture(width: number, height: number, hidden: boolean): CaptureResult {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  // FaceCapture's camera path leaves display:none on the element; ProbeReview
  // mounts that same element, so it must not inherit the hidden state.
  if (hidden) canvas.style.display = 'none'
  return {
    canvas,
    faceFound: true,
    probes: [
      { kind: 'forehead', cx: width / 2, cy: height / 4, radius: 8, rgb: [198, 145, 105] as RGB },
      { kind: 'hair', cx: width / 2, cy: height / 10, radius: 8, rgb: [26, 17, 16] as RGB },
    ],
    whiteRef: null,
  }
}

describe('ProbeReview display', () => {
  it('shows the photograph even when the capture canvas arrived hidden', () => {
    const { container } = render(
      <ProbeReview capture={capture(640, 480, true)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeTruthy()
    expect(canvas.style.display).not.toBe('none')
  })

  it('renders the whole frame rather than a centre crop', () => {
    // A cover crop can hide the white object at the edge of the frame, which
    // would make "correct the white" impossible to use.
    const { container } = render(
      <ProbeReview capture={capture(640, 480, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.className).toContain('probe-canvas')
  })

  it('sizes the stage to the photo so dot percentages are exact', () => {
    const { container } = render(
      <ProbeReview capture={capture(640, 480, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const stage = container.querySelector('.probe-stage') as HTMLElement
    expect(stage.style.aspectRatio).toBe('640 / 480')
  })

  it('places a dot at the source fraction of the photo', () => {
    const { container } = render(
      <ProbeReview capture={capture(640, 480, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const dot = container.querySelector('.probe-dot') as HTMLElement
    expect(dot.style.left).toBe('50%')   // cx = width / 2
    expect(dot.style.top).toBe('25%')    // cy = height / 4
  })
})

// The white reference gets a marker for the same reason skin and hair do: the
// visitor cannot confirm a sample they cannot see.
describe('ProbeReview white marker', () => {
  function withWhite(): CaptureResult {
    const c = capture(200, 200, false)
    return { ...c, whiteRef: { cx: 150, cy: 100, rgb: [240, 239, 237] as RGB } }
  }

  it('marks where the white reference was taken', () => {
    const { container } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const white = container.querySelector('.probe-dot.is-white') as HTMLElement
    expect(white).toBeTruthy()
    expect(white.style.left).toBe('75%')   // 150 / 200
    expect(white.style.top).toBe('50%')    // 100 / 200
    expect(white.textContent).toBe('white')
  })

  it('shows no white marker when none was found', () => {
    const { container } = render(
      <ProbeReview capture={capture(200, 200, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(container.querySelector('.probe-dot.is-white')).toBeNull()
  })

  it('removes the marker when the visitor says there is nothing white', () => {
    const { container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /nothing white/i }))
    expect(container.querySelector('.probe-dot.is-white')).toBeNull()
  })

  it('moves the marker to where the visitor taps a correction', () => {
    const { container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /correct.*white/i }))
    // The mocked box is 100x100 for a 200x200 source, so a tap at (25, 25)
    // maps to source (50, 50) = 25%.
    const stage = container.querySelector('.probe-stage') as HTMLElement
    fireEvent.pointerDown(stage, { clientX: 25, clientY: 25 })
    const white = container.querySelector('.probe-dot.is-white') as HTMLElement
    expect(white.style.left).toBe('25%')
    expect(white.style.top).toBe('25%')
  })

  it('moves the hair marker when the hair is corrected', () => {
    const { container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /correct.*hair/i }))
    const stage = container.querySelector('.probe-stage') as HTMLElement
    fireEvent.pointerDown(stage, { clientX: 75, clientY: 10 })
    const hair = container.querySelector('.probe-dot.is-hair') as HTMLElement
    expect(hair.style.left).toBe('75%')
    expect(hair.style.top).toBe('10%')
  })
})
