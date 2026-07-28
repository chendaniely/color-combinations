// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
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
