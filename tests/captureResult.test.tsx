// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CaptureResult } from '../src/components/camera/CaptureResult'
import { hexToRgb } from '../src/core/colorMath'
import { ancestorAtLevel } from '../src/core/dataset'
import { dataset } from '../src/data'

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

  it('tapping a near match promotes it to the hero and the actions use it', () => {
    // Off-book olive: nearestColors returns several distinct near matches, so the
    // default hero (closest) and a later list item are guaranteed different colors.
    const onMatch = vi.fn()
    render(<CaptureResult rgb={hexToRgb('#7c7b3f')} onMatch={onMatch} onBrowse={() => {}} />)

    const originalHeroName = document.querySelector('.cap-name')!.textContent

    fireEvent.click(screen.getByText(/more close matches/))
    const items = document.querySelectorAll('.cap-li')
    expect(items.length).toBeGreaterThan(1)
    const promoted = items[1] as HTMLElement
    const promotedName = promoted.querySelector('.cap-li-nm')!.textContent!
    expect(promotedName).not.toBe(originalHeroName)

    fireEvent.click(promoted)

    // Hero re-labeled to the promoted color, not the original closest match.
    expect(document.querySelector('.cap-name')!.textContent).toBe(promotedName)

    // Match fires at the default Shade level, keyed to the PROMOTED color's
    // ancestor — not the original hero's.
    const promotedColor = dataset.data.colors.find((c) => c.name === promotedName)!
    const expectedKey = ancestorAtLevel(dataset, promotedColor.id, 1)
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch).toHaveBeenCalledWith(1, expectedKey)
  })
})
