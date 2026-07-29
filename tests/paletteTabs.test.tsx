// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaletteTabs } from '../src/components/you/PaletteTabs'
import { seasons } from '../src/data'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const WARM_DEEP: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}

function setup(reading = WARM_DEEP, season: string | null = null) {
  const dispatch = vi.fn()
  const utils = render(
    <PaletteTabs reading={reading} season={season} dispatch={dispatch} />)
  return { ...utils, dispatch }
}

describe('the season row', () => {
  it('offers all twelve seasons', () => {
    setup()
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    expect(select.options).toHaveLength(seasons.length)
  })

  it('pre-selects our guess when the visitor has not overridden it', () => {
    setup()
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    // Warm + deep should land in an autumn.
    expect(select.value).toContain('autumn')
  })

  it('honours an override', () => {
    setup(WARM_DEEP, 'soft-summer')
    expect((screen.getByLabelText(/season/i) as HTMLSelectElement).value).toBe('soft-summer')
  })

  it('dispatches when the visitor picks a different season', () => {
    const { dispatch } = setup()
    fireEvent.change(screen.getByLabelText(/season/i), { target: { value: 'cool-winter' } })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSeason', season: 'cool-winter' })
  })

  it('says the dropdown is there for people who have been analysed', () => {
    setup()
    expect(screen.getByText(/analysed|analyzed|consultation/i)).toBeTruthy()
  })
})

describe('the palette toggle', () => {
  it('starts on the measured palette', () => {
    setup()
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].textContent).toMatch(/measured/i)
  })

  it('labels the season tab as traditional, so it cannot be mistaken', () => {
    setup()
    expect(screen.getAllByRole('tab')[1].textContent).toMatch(/traditional/i)
  })

  it('shows a count on each tab', () => {
    setup()
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.textContent).toMatch(/\d+/)
    }
  })

  it('switches lists when the second tab is chosen', () => {
    const { container } = setup()
    const before = container.querySelectorAll('.you-swatch').length
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true')
    expect(container.querySelectorAll('.you-swatch').length).not.toBe(before)
  })

  it('renames the second tab when the season changes', () => {
    const { rerender, dispatch } = setup()
    const first = screen.getAllByRole('tab')[1].textContent
    rerender(<PaletteTabs reading={WARM_DEEP} season="clear-winter" dispatch={dispatch} />)
    expect(screen.getAllByRole('tab')[1].textContent).not.toBe(first)
    expect(screen.getAllByRole('tab')[1].textContent).toMatch(/clear winter/i)
  })
})

// The promise made when the owner chose to ship both palettes: the visitor must
// always be able to see WHERE a palette came from.
describe('provenance', () => {
  it('is always visible, without needing to open anything', () => {
    const { container } = setup()
    expect(container.querySelector('.you-provenance')).toBeTruthy()
  })

  it('says the measured palette comes from the visitor\'s face', () => {
    const { container } = setup()
    expect(container.querySelector('.you-provenance')!.textContent).toMatch(/your face|measured from/i)
  })

  it('says the season palette comes from a table we wrote', () => {
    const { container } = setup()
    fireEvent.click(screen.getAllByRole('tab')[1])
    const text = container.querySelector('.you-provenance')!.textContent!
    expect(text).toMatch(/we wrote|curated|no published source/i)
  })

  it('differs between the two tabs', () => {
    const { container } = setup()
    const measured = container.querySelector('.you-provenance')!.textContent
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(container.querySelector('.you-provenance')!.textContent).not.toBe(measured)
  })
})

describe('the colours', () => {
  it('names every swatch', () => {
    const { container } = setup()
    const swatches = container.querySelectorAll('.you-swatch')
    expect(swatches.length).toBeGreaterThan(0)
    for (const s of swatches) expect(s.textContent!.trim().length).toBeGreaterThan(0)
  })

  it('explains why a colour is in the measured palette', () => {
    const { container } = setup()
    const first = container.querySelector('.you-swatch') as HTMLElement
    expect(first.getAttribute('title')).toMatch(/skin|warm|cool|contrast/i)
  })

  it('discloses that the book leans warm, so a short list is not a bug', () => {
    // Wada's palette runs 109 warm to 48 cool; a cool visitor gets less.
    const cool: SkinReading = { ...WARM_DEEP, undertone: 'cool', skinHue: 33 }
    const { container } = render(
      <PaletteTabs reading={cool} season={null} dispatch={vi.fn()} />)
    expect(container.textContent).toMatch(/leans warm|109/i)
  })
})
