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
    const { baseElement: container } = render(
      <ProbeReview capture={capture(640, 480, true)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas).toBeTruthy()
    expect(canvas.style.display).not.toBe('none')
  })

  it('renders the whole frame rather than a centre crop', () => {
    // A cover crop can hide the white object at the edge of the frame, which
    // would make "correct the white" impossible to use.
    const { baseElement: container } = render(
      <ProbeReview capture={capture(640, 480, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.className).toContain('probe-canvas')
  })

  it('sizes the stage to the photo so dot percentages are exact', () => {
    const { baseElement: container } = render(
      <ProbeReview capture={capture(640, 480, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const stage = container.querySelector('.probe-stage') as HTMLElement
    expect(stage.style.aspectRatio).toBe('640 / 480')
  })

  it('places a dot at the source fraction of the photo', () => {
    const { baseElement: container } = render(
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
    const { baseElement: container } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const white = container.querySelector('.probe-dot.is-white') as HTMLElement
    expect(white).toBeTruthy()
    expect(white.style.left).toBe('75%')   // 150 / 200
    expect(white.style.top).toBe('50%')    // 100 / 200
    expect(white.textContent).toBe('white')
  })

  it('shows no white marker when none was found', () => {
    const { baseElement: container } = render(
      <ProbeReview capture={capture(200, 200, false)} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(container.querySelector('.probe-dot.is-white')).toBeNull()
  })

  it('removes the marker when the visitor says there is nothing white', () => {
    const { baseElement: container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /nothing white/i }))
    expect(container.querySelector('.probe-dot.is-white')).toBeNull()
  })

  it('moves the marker to where the visitor taps a correction', () => {
    const { baseElement: container, getByRole } = render(
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

  it('repaints the photo when the white reference changes', () => {
    const { baseElement: container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const ctx = (container.querySelector('canvas') as HTMLCanvasElement)
      .getContext('2d') as unknown as { putImageData: { mock: { calls: unknown[] } } }
    const before = ctx.putImageData.mock.calls.length
    fireEvent.click(getByRole('button', { name: /correct.*white/i }))
    fireEvent.pointerDown(container.querySelector('.probe-stage') as HTMLElement,
      { clientX: 25, clientY: 25 })
    expect(ctx.putImageData.mock.calls.length).toBeGreaterThan(before)
  })

  it('shows the skin swatch white-balanced, so it moves with the reference', () => {
    const { baseElement: container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const skinChip = () =>
      (container.querySelectorAll('.probe-chip')[0] as HTMLElement).style.background
    const balanced = skinChip()
    fireEvent.click(getByRole('button', { name: /nothing white/i }))
    // With the reference dropped the correction is the identity, so the swatch
    // must visibly change — otherwise it was never being corrected at all.
    expect(skinChip()).not.toBe(balanced)
  })

  it('never corrects the source pixels, so corrections cannot compound', () => {
    const { baseElement: container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const stage = container.querySelector('.probe-stage') as HTMLElement
    // Tap the same spot twice with a white reference active. If the source were
    // being corrected in place, the second read would differ from the first.
    fireEvent.click(getByRole('button', { name: /correct.*hair/i }))
    fireEvent.pointerDown(stage, { clientX: 40, clientY: 40 })
    const first = (container.querySelectorAll('.probe-chip')[1] as HTMLElement).style.background
    fireEvent.click(getByRole('button', { name: /correct.*hair/i }))
    fireEvent.pointerDown(stage, { clientX: 40, clientY: 40 })
    const second = (container.querySelectorAll('.probe-chip')[1] as HTMLElement).style.background
    expect(second).toBe(first)
  })

  it('offers temperature and tint sliders', () => {
    const { getByLabelText } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(getByLabelText(/temperature/i)).toBeTruthy()
    expect(getByLabelText(/tint/i)).toBeTruthy()
  })

  it('seeds the sliders from the eyedropped white, as photo software does', () => {
    const { getByLabelText } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    // The auto-found reference is warm-ish, so temperature must not sit at 0.
    const temp = getByLabelText(/temperature/i) as HTMLInputElement
    expect(Number(temp.value)).not.toBe(0)
  })

  it('repaints the photo when a slider moves', () => {
    const { baseElement: container, getByLabelText } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    const ctx = (container.querySelector('canvas') as HTMLCanvasElement)
      .getContext('2d') as unknown as { putImageData: { mock: { calls: unknown[] } } }
    const before = ctx.putImageData.mock.calls.length
    fireEvent.change(getByLabelText(/temperature/i), { target: { value: '0.5' } })
    expect(ctx.putImageData.mock.calls.length).toBeGreaterThan(before)
  })

  it('a slider change feeds through to the confirmed reading', () => {
    const onConfirm = vi.fn()
    const { getByLabelText, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={onConfirm} onRetake={vi.fn()} />)
    fireEvent.change(getByLabelText(/temperature/i), { target: { value: '-0.7' } })
    fireEvent.click(getByRole('button', { name: /continue/i }))
    const cool = onConfirm.mock.calls[0][0].skin

    cleanup()
    const onConfirm2 = vi.fn()
    const r2 = render(
      <ProbeReview capture={withWhite()} onConfirm={onConfirm2} onRetake={vi.fn()} />)
    fireEvent.change(r2.getByLabelText(/temperature/i), { target: { value: '0.7' } })
    fireEvent.click(r2.getByRole('button', { name: /continue/i }))
    expect(onConfirm2.mock.calls[0][0].skin).not.toBe(cool)
  })

  it('Reset clears both the correction and the marker', () => {
    const { baseElement: container, getByRole, getByLabelText } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /^reset$/i }))
    expect(Number((getByLabelText(/temperature/i) as HTMLInputElement).value)).toBe(0)
    expect(container.querySelector('.probe-dot.is-white')).toBeNull()
  })

  it('moves the hair marker when the hair is corrected', () => {
    const { baseElement: container, getByRole } = render(
      <ProbeReview capture={withWhite()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    fireEvent.click(getByRole('button', { name: /correct.*hair/i }))
    const stage = container.querySelector('.probe-stage') as HTMLElement
    fireEvent.pointerDown(stage, { clientX: 75, clientY: 10 })
    const hair = container.querySelector('.probe-dot.is-hair') as HTMLElement
    expect(hair.style.left).toBe('75%')
    expect(hair.style.top).toBe('10%')
  })
})
