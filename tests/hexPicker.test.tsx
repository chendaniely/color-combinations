// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HexPicker } from '../src/components/sample/HexPicker'

afterEach(cleanup)

describe('HexPicker (jsdom)', () => {
  it('keeps Explore disabled until the hex is valid, then emits RGB', () => {
    const onSample = vi.fn()
    render(<HexPicker onSample={onSample} onClose={() => {}} />)
    const input = screen.getByLabelText('Hex color')
    const explore = screen.getByText('Explore this color') as HTMLButtonElement
    expect(explore.disabled).toBe(true)
    fireEvent.change(input, { target: { value: '#236192' } })
    expect(explore.disabled).toBe(false)
    fireEvent.click(explore)
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })
  it('shows a hint for an invalid hex and keeps Explore disabled', () => {
    render(<HexPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: 'nope' } })
    expect(screen.getByText(/3- or 6-digit hex/)).toBeTruthy()
    expect((screen.getByText('Explore this color') as HTMLButtonElement).disabled).toBe(true)
  })
})
