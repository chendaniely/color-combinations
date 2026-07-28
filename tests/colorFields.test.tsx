// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorFields } from '../src/components/sample/ColorFields'
import { rgbToHsv } from '../src/core/colorMath'

afterEach(cleanup)

const BLUE = rgbToHsv([35, 97, 146])

describe('ColorFields (jsdom)', () => {
  it('renders all three notations of the same color', () => {
    render(<ColorFields hsv={BLUE} onChange={() => {}} />)
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#236192')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('35, 97, 146')
    expect((screen.getByLabelText('CMYK') as HTMLInputElement).value).toBe('76, 34, 0, 43')
  })

  it('emits RGB when a hex is typed', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#F26522' } })
    expect(onChange).toHaveBeenCalledWith([242, 101, 34])
  })

  it('emits RGB when a CMYK is typed', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('CMYK'), { target: { value: '0, 30, 6, 0' } })
    expect(onChange).toHaveBeenCalledWith([255, 179, 240])
  })

  it('marks an unparseable draft invalid and emits nothing', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    const hex = screen.getByLabelText('Hex')
    fireEvent.change(hex, { target: { value: '#23' } })
    expect(hex.getAttribute('aria-invalid')).toBe('true')
    expect(onChange).not.toHaveBeenCalled()
    // The draft survives so the user can keep typing.
    expect((hex as HTMLInputElement).value).toBe('#23')
  })

  it('discards an unparseable draft on blur', () => {
    render(<ColorFields hsv={BLUE} onChange={() => {}} />)
    const hex = screen.getByLabelText('Hex')
    fireEvent.change(hex, { target: { value: 'garbage' } })
    fireEvent.blur(hex)
    expect((hex as HTMLInputElement).value).toBe('#236192')
    expect(hex.getAttribute('aria-invalid')).toBe('false')
  })

  it('keeps hex draft while external hsv changes (wheel driving fields)', () => {
    const { rerender } = render(<ColorFields hsv={BLUE} onChange={() => {}} />)
    const hex = screen.getByLabelText('Hex') as HTMLInputElement
    const rgb = screen.getByLabelText('RGB') as HTMLInputElement
    const cmyk = screen.getByLabelText('CMYK') as HTMLInputElement

    // Type a draft into hex without blurring
    fireEvent.change(hex, { target: { value: '#F26522' } })
    expect(hex.value).toBe('#F26522')

    // Re-render with a different hsv (simulating wheel drag)
    const ORANGE = rgbToHsv([242, 101, 34])
    rerender(<ColorFields hsv={ORANGE} onChange={() => {}} />)

    // Hex should still show the draft the user typed
    expect(hex.value).toBe('#F26522')
    // But RGB and CMYK should update to the new color
    expect(rgb.value).toBe('242, 101, 34')
    expect(cmyk.value).toBe('0, 58, 86, 5')
  })

  it('reverts invalid draft when switching to another field', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    const hex = screen.getByLabelText('Hex') as HTMLInputElement
    const rgb = screen.getByLabelText('RGB') as HTMLInputElement

    // Focus hex for real, then type an unparseable draft into it.
    act(() => { hex.focus() })
    fireEvent.change(hex, { target: { value: '#ZZZ' } })
    expect(hex.getAttribute('aria-invalid')).toBe('true')

    // Move focus to the RGB field, the way a real click would. jsdom fires a
    // genuine blur on hex synchronously as part of this focus transfer, which
    // is what should discard the bad draft. Wrapping in act() flushes the
    // resulting state update before we assert on it.
    act(() => { rgb.focus() })

    // Hex should revert to the committed color and no longer be marked invalid
    expect(hex.value).toBe('#236192')
    expect(hex.getAttribute('aria-invalid')).toBe('false')
  })
})
