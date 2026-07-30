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
    // Wada's palette leans warm, so a cool visitor gets a shorter list. The
    // exact counts are computed from the book (see `warmCool` in src/data.ts),
    // so this asserts the DISCLOSURE exists rather than a number that would go
    // stale — which is precisely what happened to the old hardcoded 109/48.
    const cool: SkinReading = { ...WARM_DEEP, undertone: 'cool', skinHue: 33 }
    const { container } = render(
      <PaletteTabs reading={cool} season={null} dispatch={vi.fn()} />)
    await ready()
    expect(container.textContent).toMatch(/leans warm/i)
  })
})

// A neutral undertone matches none of the four seasons, which are all warm or
// cool. Depth and contrast alone decide, so the answer is genuinely less certain
// and the page says so. Found by hunting: skinMetrics really does return
// 'neutral', and before this the site presented that case with exactly the same
// confidence as a clear warm or cool reading.
describe('a neutral undertone is flagged as less certain', () => {
  const NEUTRAL: SkinReading = { ...WARM_DEEP, undertone: 'neutral' }

  it('says so on the season tab, and points at the override', async () => {
    const { container } = await setup(NEUTRAL)
    fireEvent.click(screen.getAllByRole('tab')[1])
    const text = container.textContent!
    expect(text).toMatch(/undertone reads\s*neutral/i)
    expect(text).toMatch(/depth and\s*contrast alone/i)
    expect(text).toMatch(/dropdown/i)
  })

  it('does not nag a clearly warm reading with it', async () => {
    const { container } = await setup(WARM_DEEP)
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(container.textContent).not.toMatch(/undertone reads\s*neutral/i)
  })

  it('stays off the measured tab, which does not use seasons at all', async () => {
    const { container } = await setup(NEUTRAL)
    expect(container.textContent).not.toMatch(/undertone reads\s*neutral/i)
  })
})

// A shared link carries a season but never a reading — the owner's privacy
// decision. So "somebody sent me this" is a state the tab must render: the
// season's colours, no measurements of anybody, and an invitation to run it.
describe('a season shared by link, with no reading', () => {
  async function shared(season = 'deep-autumn') {
    const utils = render(
      <PaletteTabs reading={null} season={season} dispatch={vi.fn()} />)
    await waitFor(() => expect(screen.queryByLabelText(/season/i)).toBeTruthy())
    return utils
  }

  it('shows the season, both levels, without a reading', async () => {
    const { container } = await shared()
    expect(container.querySelector('.season-parent')!.textContent).toMatch(/autumn/i)
    expect(container.querySelector('.season-sub')!.textContent).toMatch(/deep autumn/i)
  })

  it('shows the season colours', async () => {
    const { container } = await shared()
    expect(container.querySelectorAll('.you-swatch').length).toBeGreaterThan(0)
  })

  // A one-tab tablist would be a lie about what is available.
  it('renders no tab strip, because there is no second palette', async () => {
    await shared()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByText(/measured for you/i)).toBeNull()
  })

  it('says it came from a link and that nothing here measures the reader', async () => {
    const { container } = await shared()
    const note = container.querySelector('.shared-season')!
    expect(note.textContent).toMatch(/opened from a shared link/i)
    expect(note.textContent).toMatch(/nothing here is a measurement of you/i)
    expect(note.textContent).toMatch(/take your own photo/i)
  })

  it('does not claim a neutral undertone it never measured', async () => {
    const { container } = await shared()
    expect(container.textContent).not.toMatch(/undertone reads/i)
  })

  it('still shows the fit panel, which needs no reading', async () => {
    const { container } = await shared()
    expect(container.querySelector('.season-fit')).toBeTruthy()
    // Rows became buttons in v1.9.2 so they can be picked to start a palette.
    expect(container.querySelectorAll('.fit-pair').length).toBeGreaterThan(0)
  })
})

// "this way anything on that page can be interactive as a starting point"
// (owner, 2026-07-30). Two lists, one pick — so the interesting cases are the
// ones that cross between them.
describe('picking a starting colour from either list', () => {
  // The fit panel only renders on the season view, and a shared link lands
  // there directly — the shortest route to having both lists on screen.
  async function bothLists(season = 'deep-autumn') {
    const utils = render(
      <PaletteTabs reading={null} season={season} dispatch={vi.fn()} />)
    await waitFor(() => expect(screen.queryByLabelText(/season/i)).toBeTruthy())
    return utils
  }

  it('a fit row changes the selection, even outside the palette', async () => {
    const { container } = await bothLists()
    const rows = [...container.querySelectorAll<HTMLElement>('.fit-pair')]
    const palette = new Set([...container.querySelectorAll('.you-swatch')]
      .map((el) => el.getAttribute('title')))

    // The case that made this more than a click handler: a third of the fit
    // rows across the twelve seasons name a colour the palette does not hold,
    // and the old guard in YouDoorways silently ignored exactly those.
    const outside = rows.find(
      (r) => !palette.has(r.querySelector('.fit-name')!.textContent))
    expect(outside, 'no fit row outside the palette in this season').toBeTruthy()

    fireEvent.click(outside!)
    expect(outside!.getAttribute('aria-selected')).toBe('true')
  })

  it('picking in one list clears the pick in the other', async () => {
    const { container } = await bothLists()
    const swatch = container.querySelector<HTMLElement>('.you-swatch')!
    const row = container.querySelector<HTMLElement>('.fit-pair')!

    fireEvent.click(row)
    expect(row.getAttribute('aria-selected')).toBe('true')
    fireEvent.click(swatch)
    expect(swatch.getAttribute('aria-selected')).toBe('true')
    // One pick on the page, so the row must let go — unless it happens to name
    // the same colour, which the crowding this panel documents makes possible.
    if (row.querySelector('.fit-name')!.textContent !== swatch.getAttribute('title')) {
      expect(row.getAttribute('aria-selected')).toBe('false')
    }
  })

  it('leaves each list exactly one tab stop, and neither with none', async () => {
    const { container } = await bothLists()
    const stops = (sel: string) => [...container.querySelectorAll(sel)]
      .filter((e) => e.getAttribute('tabindex') === '0').length

    // Matching the roving tabindex on colour id alone would leave the OTHER
    // list with no tabbable item at all — unreachable by keyboard — whenever
    // the pick lived across the way.
    fireEvent.click(container.querySelector<HTMLElement>('.fit-pair')!)
    expect(stops('.you-swatch'), 'the swatch grid lost its tab stop').toBe(1)
    expect(stops('.fit-pair'), 'the fit list has more than one tab stop').toBe(1)
  })
})
