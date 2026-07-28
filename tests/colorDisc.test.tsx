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

  it('emits a new value from the brightness slider', () => {
    const onChange = vi.fn()
    render(<ColorDisc hsv={HSV} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '100' } })
    expect(onChange).toHaveBeenCalledWith({ h: 206, s: 0.76, v: 1 })
  })
})
