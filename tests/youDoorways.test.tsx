// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPanel } from '../src/components/AboutPanel'
import { YouDoorways } from '../src/components/you/YouDoorways'
import { measuredPalette } from '../src/color/personalPalette'
import { dataset } from '../src/data'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}
const PALETTE = new Set(measuredPalette(READING, dataset.data.colors).map((c) => c.id))

function setup(palette: ReadonlySet<number> = PALETTE) {
  const dispatch = vi.fn()
  const utils = render(
    <YouDoorways palette={palette} floor={2} label="Your colours" dispatch={dispatch} />)
  return { ...utils, dispatch }
}

describe('the doorways out of the You tab', () => {
  it('offers a way into both Browse and Match', () => {
    setup()
    expect(screen.getByRole('button', { name: /browse all/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /start a palette from/i })).toBeTruthy()
  })

  // THE BUG THIS FILE DID NOT CATCH, reported by the owner: "the list of colors
  // that lets the user explore is only 1 color". Browse received ONE colour of
  // the visitor's palette, because Browse could not filter by a set — while the
  // button said "Browse THESE in the book". The old test asserted only that
  // *some* setBrowseFilter was dispatched, which the broken code did.
  it('hands Browse the WHOLE palette, not one colour of it', () => {
    const { dispatch } = setup()
    fireEvent.click(screen.getByRole('button', { name: /browse all/i }))
    const call = dispatch.mock.calls.find((c) => c[0].type === 'setBrowsePalette')
    expect(call, 'Browse was given no palette at all').toBeTruthy()
    expect(call![0].palette.ids).toHaveLength(PALETTE.size)
    expect(new Set(call![0].palette.ids)).toEqual(PALETTE)
  })

  it('carries the floor and a label, so Browse can say what it is showing', () => {
    const { dispatch } = setup()
    fireEvent.click(screen.getByRole('button', { name: /browse all/i }))
    const call = dispatch.mock.calls.find((c) => c[0].type === 'setBrowsePalette')!
    expect(call[0].palette.floor).toBe(2)
    expect(call[0].palette.label).toBe('Your colours')
  })

  it('puts the count on the button instead of saying "these"', () => {
    setup()
    expect(screen.getByRole('button', { name: new RegExp(`browse all ${PALETTE.size}`, 'i') }))
      .toBeTruthy()
  })

  // Match stays single-colour ON PURPOSE. `combosForSet` requires EVERY key to
  // be present, so seeding the whole palette would return zero combinations —
  // fewer results, not more. The fix there is honesty, not more colours.
  it('seeds Match from the first colour on screen, and names it', () => {
    const { dispatch } = setup()
    fireEvent.click(screen.getByRole('button', { name: /start a palette from/i }))
    const seed = dispatch.mock.calls.find((c) => c[0].type === 'seedPalette')
    expect(seed).toBeTruthy()
    expect(seed![0].level).toBe(0)
    const id = Number(seed![0].key.replace(/^c/, ''))
    expect(id).toBe([...PALETTE][0])
    // Naming it is the point: the old code picked silently, by lowest id in the
    // book, which was not necessarily a colour the visitor could even see.
    const first = dataset.colorById.get(id)!
    expect(screen.getByRole('button', { name: new RegExp(first.name, 'i') })).toBeTruthy()
  })

  it('explains why Browse takes them all and Match takes one', () => {
    const { container } = setup()
    expect(container.textContent).toMatch(/narrowing/i)
    expect(container.textContent).toMatch(/every.*colour you add/i)
  })

  it('is hidden when there is nothing to hand over', () => {
    const { container } = render(
      <YouDoorways palette={new Set()} floor={2} label="Your colours" dispatch={vi.fn()} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('survives a palette holding an id the book has not got', () => {
    // Belt and braces: the palette is derived from the dataset today, but this
    // is the class of bug that took the whole site down in v1.7.2.
    const { container } = render(
      <YouDoorways palette={new Set([999999])} floor={2} label="x" dispatch={vi.fn()} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})

// The promise made when the owner chose to ship both palettes. Not decoration:
// the season lists are our invention and the About text has to say so.
describe('the About panel states where each palette comes from', () => {
  const html = renderToString(<AboutPanel dispatch={() => {}} />)

  it('describes the You tab', () => {
    expect(html).toMatch(/photograph|photo of your face|You tab/i)
  })

  it('says the measured palette comes from the visitor\'s face', () => {
    expect(html).toMatch(/measured from your face|from your face/i)
  })

  it('says plainly that the season sub-seasons are ours', () => {
    expect(html).toMatch(/no published source|we wrote|our own|ours/i)
  })

  it('does not overclaim the analysis as authoritative', () => {
    expect(html).not.toMatch(/scientifically proven|guaranteed|definitive/i)
  })

  it('repeats the on-device promise', () => {
    expect(html).toMatch(/never leaves|stays on your device|not uploaded/i)
  })
})
