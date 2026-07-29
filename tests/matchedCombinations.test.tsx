// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MatchedCombinations } from '../src/components/you/MatchedCombinations'
import { measuredPalette } from '../src/color/personalPalette'
import { dataset } from '../src/data'
import type { FloorStop } from '../src/core/state'
import type { SkinReading } from '../src/core/types'

afterEach(cleanup)

const WARM_DEEP: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 49.4, skinHue: 57.1, ita: -1, contrastGap: 43.5, whiteBalanced: true,
}

const PALETTE = new Set(measuredPalette(WARM_DEEP, dataset.data.colors).map((c) => c.id))

function setup(floor: FloorStop = 2, palette = PALETTE) {
  const dispatch = vi.fn()
  const utils = render(
    <MatchedCombinations palette={palette} floor={floor} dispatch={dispatch} />)
  return { ...utils, dispatch }
}

describe('the floor control', () => {
  it('offers all four stops', () => {
    setup()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('marks the current stop', () => {
    setup(2)
    const chosen = screen.getAllByRole('radio').filter(
      (b) => b.getAttribute('aria-checked') === 'true')
    expect(chosen).toHaveLength(1)
    expect(chosen[0].textContent).toMatch(/half or more/i)
  })

  it('dispatches the new stop when one is chosen', () => {
    const { dispatch } = setup(2)
    fireEvent.click(screen.getByRole('radio', { name: /every colour is yours/i }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'setFloor', floor: 0 })
  })

  it('a stricter stop shows fewer plates', () => {
    const loose = setup(3).container.querySelectorAll('.plate').length
    cleanup()
    const strict = setup(0).container.querySelectorAll('.plate').length
    expect(strict).toBeLessThan(loose)
  })

  it('counts what each stop would show, so the choice is informed', () => {
    setup()
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.textContent).toMatch(/\d+/)
    }
  })
})

describe('the ranked list', () => {
  it('shows the strongest matches first', () => {
    const { container } = setup(3)
    const fractions = [...container.querySelectorAll('.you-combo')]
      .map((el) => Number(el.getAttribute('data-fraction')))
    const sorted = [...fractions].sort((a, b) => b - a)
    expect(fractions).toEqual(sorted)
  })

  it('outlines the colours that are not yours', () => {
    const { container } = setup(3)
    const outlined = container.querySelectorAll('.plate-bar.is-outsider')
    expect(outlined.length).toBeGreaterThan(0)
  })

  it('does not outline anything in a fully-yours combination', () => {
    const { container } = setup(0)
    expect(container.querySelectorAll('.plate-bar.is-outsider')).toHaveLength(0)
  })

  it('says how much of each combination is yours', () => {
    const { container } = setup(2)
    expect(container.querySelector('.you-combo')!.textContent).toMatch(/\d+ of \d+/)
  })

  it('explains an empty result instead of showing blank space', () => {
    const { container } = render(
      <MatchedCombinations palette={new Set()} floor={0} dispatch={vi.fn()} />)
    expect(container.textContent).toMatch(/no combinations/i)
    expect(container.querySelectorAll('.plate')).toHaveLength(0)
  })
})
