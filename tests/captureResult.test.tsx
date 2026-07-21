// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CaptureResult } from '../src/components/camera/CaptureResult'
import { hexToRgb } from '../src/core/colorMath'

afterEach(cleanup)

describe('CaptureResult (jsdom)', () => {
  it('fires Match at the default Shade level (1)', () => {
    const onMatch = vi.fn()
    render(<CaptureResult rgb={hexToRgb('#7e8743')} onMatch={onMatch} onBrowse={() => {}} />)
    // 'Dark Citrine' also appears as the (unselected) Color-level chip's value —
    // scope to the hero name specifically to disambiguate.
    expect(screen.getByText('Dark Citrine', { selector: '.cap-name' })).toBeTruthy()
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch.mock.calls[0][0]).toBe(1) // Shade preselected
  })
  it('switching to Family changes the level the actions use', () => {
    const onBrowse = vi.fn()
    render(<CaptureResult rgb={hexToRgb('#7e8743')} onMatch={() => {}} onBrowse={onBrowse} />)
    fireEvent.click(screen.getByRole('radio', { name: /Family/ }))
    fireEvent.click(screen.getByText(/^Browse /))
    expect(onBrowse.mock.calls[0][0]).toBe(2) // Family
  })
})
