// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaletteTabs } from '../src/components/you/PaletteTabs'
import { loadSeasonData } from '../src/data'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

// The season datasets are code-split — ~98 kB that only this tab needs — so
// the component renders a loading state first and every test has to wait for
// the real thing. See loadSeasonData().
const { seasonRules } = await loadSeasonData()

async function ready() {
  await waitFor(() => expect(screen.queryByLabelText(/season/i)).toBeTruthy())
}

const WARM_DEEP: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}

async function setup(reading = WARM_DEEP, season: string | null = null) {
  const dispatch = vi.fn()
  const utils = render(
    <PaletteTabs reading={reading} season={season} dispatch={dispatch} />)
  await ready()
  return { ...utils, dispatch }
}

describe('the season row', () => {
  it('offers all twelve seasons', async () => {
    await setup()
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    expect(select.options).toHaveLength(seasonRules.subSeasons.length)
  })

  it('pre-selects our guess when the visitor has not overridden it', async () => {
    await setup()
    const select = screen.getByLabelText(/season/i) as HTMLSelectElement
    // Warm + deep should land in an autumn.
    expect(select.value).toContain('autumn')
  })

  it('honours an override', async () => {
    await setup(WARM_DEEP, 'soft-summer')
    expect((screen.getByLabelText(/season/i) as HTMLSelectElement).value).toBe('soft-summer')
  })

  it('dispatches when the visitor picks a different season', async () => {
    const { dispatch } = await setup()
    fireEvent.change(screen.getByLabelText(/season/i), { target: { value: 'cool-winter' } })
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSeason', season: 'cool-winter' })
  })

  it('says the dropdown is there for people who have been analysed', async () => {
    await setup()
    expect(screen.getByText(/analysed|analyzed|consultation/i)).toBeTruthy()
  })
})

describe('the palette toggle', () => {
  it('starts on the measured palette', async () => {
    await setup()
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].textContent).toMatch(/measured/i)
  })

  // Was "traditional". The label is now carried by the two-level display, which
  // says the stronger thing: which half is published and which half is ours.
  it('shows the parent season as sourced and the sub-season as ours', async () => {
    const { container } = await setup()
    expect(container.querySelector('.season-badge.sourced')!.textContent)
      .toMatch(/published/i)
    expect(container.querySelector('.season-badge.ours')!.textContent)
      .toMatch(/our/i)
    expect(container.querySelector('.season-parent')!.textContent).toMatch(/autumn/i)
  })

  it('shows a count on each tab', async () => {
    await setup()
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab.textContent).toMatch(/\d+/)
    }
  })

  it('switches lists when the second tab is chosen', async () => {
    const { container } = await setup()
    const before = container.querySelectorAll('.you-swatch').length
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true')
    expect(container.querySelectorAll('.you-swatch').length).not.toBe(before)
  })

  it('renames the second tab when the season changes', async () => {
    const { rerender, dispatch } = await setup()
    const first = screen.getAllByRole('tab')[1].textContent
    rerender(<PaletteTabs reading={WARM_DEEP} season="clear-winter" dispatch={dispatch} />)
    expect(screen.getAllByRole('tab')[1].textContent).not.toBe(first)
    expect(screen.getAllByRole('tab')[1].textContent).toMatch(/clear winter/i)
  })
})

// The promise made when the owner chose to ship both palettes: the visitor must
// always be able to see WHERE a palette came from.
describe('provenance', () => {
  it('is always visible, without needing to open anything', async () => {
    const { container } = await setup()
    expect(container.querySelector('.you-provenance')).toBeTruthy()
  })

  it('says the measured palette comes from the visitor\'s face', async () => {
    const { container } = await setup()
    expect(container.querySelector('.you-provenance')!.textContent).toMatch(/your face|measured from/i)
  })

  it('says where the season palette comes from, and which part is ours', async () => {
    const { container } = await setup()
    fireEvent.click(screen.getAllByRole('tab')[1])
    const text = container.querySelector('.you-provenance')!.textContent!
    expect(text).toMatch(/PCCS/)
    expect(text).toMatch(/Japan Color Research Institute/i)
    expect(text, 'must still say the sub-season is ours').toMatch(/our own subdivision/i)
  })

  it('differs between the two tabs', async () => {
    const { container } = await setup()
    const measured = container.querySelector('.you-provenance')!.textContent
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(container.querySelector('.you-provenance')!.textContent).not.toBe(measured)
  })
})

describe('the colours', () => {
  it('names every swatch', async () => {
    const { container } = await setup()
    const swatches = container.querySelectorAll('.you-swatch')
    expect(swatches.length).toBeGreaterThan(0)
    for (const s of swatches) expect(s.textContent!.trim().length).toBeGreaterThan(0)
  })

  it('explains why a colour is in the measured palette', async () => {
    const { container } = await setup()
    const first = container.querySelector('.you-swatch') as HTMLElement
    expect(first.getAttribute('title')).toMatch(/skin|warm|cool|contrast/i)
  })

  it('discloses that the book leans warm, so a short list is not a bug', async () => {
    // Wada's palette runs 109 warm to 48 cool; a cool visitor gets less.
    const cool: SkinReading = { ...WARM_DEEP, undertone: 'cool', skinHue: 33 }
    const { container } = render(
      <PaletteTabs reading={cool} season={null} dispatch={vi.fn()} />)
    await ready()
    expect(container.textContent).toMatch(/leans warm|109/i)
  })
})
