// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rgbToHsv } from '../src/core/colorMath'
import { ColorPicker } from '../src/components/sample/ColorPicker'

afterEach(cleanup)

describe('ColorPicker (jsdom)', () => {
  it('opens seeded on NYC blue across all three notations', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#236192')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('35, 97, 146')
  })

  it('propagates a typed hex to the other notations', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#F26522' } })
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('242, 101, 34')
    expect((screen.getByLabelText('CMYK') as HTMLInputElement).value).toBe('0, 58, 86, 5')
  })

  it('propagates a typed CMYK to the hex field', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('CMYK'), { target: { value: '0, 30, 6, 0' } })
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#ffb3f0')
  })

  it('drives the color from the brightness slider', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '100' } })
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('61, 169, 255')
  })

  it('explores the current color', () => {
    const onSample = vi.fn()
    render(<ColorPicker onSample={onSample} onClose={() => {}} />)
    fireEvent.click(screen.getByText('Explore this color'))
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })

  it('keeps Explore enabled while a field holds an unparseable draft', () => {
    const onSample = vi.fn()
    render(<ColorPicker onSample={onSample} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#2' } })
    const explore = screen.getByText('Explore this color') as HTMLButtonElement
    expect(explore.disabled).toBe(false)
    fireEvent.click(explore)
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })

  // The headline invariant: ColorPicker must hold ONE HSV as its state, never
  // RGB, because hue is undefined at zero saturation. An RGB-backed picker
  // would re-derive HSV from (0, 0, 0) on the way back up and lose the hue —
  // the pin (and the fields) would come back gray instead of blue. Driving the
  // slider through the extreme and back is the only way to observe that loss.
  it('hue survives a trip through black (brightness round trip does not gray out the color)', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    const brightness = screen.getByLabelText('Brightness')
    // The starting brightness as a fraction, computed the same way the seed
    // itself is (rgbToHsv of the NYC blue) — not the rounded percent the
    // slider displays, so the round trip lands back on the exact seed color.
    const startPercent = rgbToHsv([35, 97, 146]).v * 100

    fireEvent.change(brightness, { target: { value: '0' } }) // extreme: black
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#000000')

    fireEvent.change(brightness, { target: { value: '1' } }) // near the extreme
    fireEvent.change(brightness, { target: { value: String(startPercent) } }) // back up

    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#236192')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('35, 97, 146')
  })
})
