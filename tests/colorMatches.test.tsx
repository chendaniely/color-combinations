// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorMatches } from '../src/components/sample/ColorMatches'
import { hexToRgb } from '../src/core/colorMath'
import { ancestorAtLevel } from '../src/core/dataset'
import { dataset } from '../src/data'

afterEach(cleanup)

describe('ColorMatches (jsdom)', () => {
  it('shows 12 nearest colors, preselects the closest, fires Match at Shade (1)', () => {
    const onMatch = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={onMatch} onBrowse={() => {}} />)
    expect(document.querySelectorAll('.match-cell').length).toBe(12)
    // Helvetia Blue #0057ba is the closest book color to NYC blue.
    expect(screen.getByRole('option', { selected: true }).textContent).toContain('Helvetia Blue')
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch.mock.calls[0][0]).toBe(1)
  })
  it('switching to Family changes the level the actions use', () => {
    const onBrowse = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={() => {}} onBrowse={onBrowse} />)
    fireEvent.click(screen.getByRole('radio', { name: /Family/ }))
    fireEvent.click(screen.getByText(/^Browse /))
    expect(onBrowse.mock.calls[0][0]).toBe(2)
  })
  it('selecting another swatch re-keys the actions to that color', () => {
    const onMatch = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={onMatch} onBrowse={() => {}} />)
    const cells = document.querySelectorAll('.match-cell')
    const second = cells[1] as HTMLElement
    const secondName = second.querySelector('.match-nm')!.textContent!
    fireEvent.click(second)
    const secondColor = dataset.data.colors.find((c) => c.name === secondName)!
    const expectedKey = ancestorAtLevel(dataset, secondColor.id, 1)
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch).toHaveBeenCalledWith(1, expectedKey)
  })
})
