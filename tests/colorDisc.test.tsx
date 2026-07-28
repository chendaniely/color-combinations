// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorDisc } from '../src/components/sample/ColorDisc'

afterEach(cleanup)

const HSV = { h: 206, s: 0.76, v: 0.57 }

describe('ColorDisc (jsdom)', () => {
  it('shows the brightness slider at the current value', () => {
    render(<ColorDisc hsv={HSV} onChange={() => {}} />)
    expect((screen.getByLabelText('Brightness') as HTMLInputElement).value).toBe('57')
  })

  it('moves hue with left and right arrows', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    const disc = screen.getByLabelText(/Color wheel/)
    fireEvent.keyDown(disc, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith({ h: 208, s: 0.76, v: 0.57 })
    fireEvent.keyDown(disc, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith({ h: 204, s: 0.76, v: 0.57 })
  })

  it('takes bigger steps with shift held', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    fireEvent.keyDown(screen.getByLabelText(/Color wheel/), { key: 'ArrowRight', shiftKey: true })
    expect(onChange).toHaveBeenCalledWith({ h: 216, s: 0.76, v: 0.57 })
  })

  it('clamps saturation at the rim', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={{ h: 0, s: 1, v: 1 }} onChange={onChange} />)
    fireEvent.keyDown(screen.getByLabelText(/Color wheel/), { key: 'ArrowUp' })
    expect(onChange).toHaveBeenCalledWith({ h: 0, s: 1, v: 1 })
  })

  it('ignores keys it does not handle', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    fireEvent.keyDown(screen.getByLabelText(/Color wheel/), { key: 'a' })
    expect(onChange).not.toHaveBeenCalled()
  })

  // atan2(0, 0) — the disc's exact center — is a documented artifact of
  // discPointToHueSat that returns h = 90 rather than "undefined". Saturation
  // is 0 there either way, so the rendered color doesn't change, but the
  // picker stores HSV specifically so hue survives zero-saturation states; a
  // click dead-center must not silently overwrite the hue the user had.
  it('preserves the existing hue on a click at the disc\'s exact center', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    const disc = screen.getByLabelText(/Color wheel/) as HTMLDivElement
    disc.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 236, height: 236, right: 236, bottom: 236, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    disc.setPointerCapture = vi.fn()
    disc.hasPointerCapture = vi.fn(() => true)
    // Box center: (0 + 236/2, 0 + 236/2) → dx = 0, dy = 0.
    fireEvent.pointerDown(disc, { clientX: 118, clientY: 118, pointerId: 1 })
    expect(onChange).toHaveBeenCalledWith({ h: HSV.h, s: 0, v: HSV.v })
  })

  it('emits a new value from the brightness slider', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '100' } })
    expect(onChange).toHaveBeenCalledWith({ h: 206, s: 0.76, v: 1 })
  })
})
