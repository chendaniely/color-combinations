// @vitest-environment jsdom
// Browse's filters, asserted by COUNTING what survives them.
//
// tests/appSmoke.test.tsx already checks that an active shade filter renders a
// dismissible chip. That is the chrome, not the filter: the chip would still
// appear if the predicate matched everything, or nothing. TODO.md carried
// "add a test asserting the shade predicate actually narrows combos.length"
// for exactly that reason.
//
// The predicates are inline in BrowseView rather than exported, so this drives
// the component and counts plates. Slower than a unit test on a pure function,
// and the honest option — extracting them purely to make them testable would
// change the code to suit the test.
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowseView } from '../src/components/BrowseView'
import { ancestorAtLevel, displayableCombinations } from '../src/core/dataset'
import { initialState } from '../src/core/state'
import { dataset } from '../src/data'

afterEach(cleanup)

function browse(patch: Partial<typeof initialState.browse>) {
  const state = { ...initialState, view: 'browse' as const, browse: { ...initialState.browse, ...patch } }
  const { container } = render(<BrowseView state={state} dispatch={vi.fn()} />)
  return container.querySelectorAll('.plate-card, .plate').length
}

// A shade with enough combinations that narrowing to it is unambiguous, chosen
// from the data rather than hard-coded so a re-curation cannot silently make
// this test vacuous.
const shadeCounts = new Map<string, number>()
for (const c of displayableCombinations(dataset)) {
  for (const id of c.colorIds) {
    const shade = ancestorAtLevel(dataset, id, 1)
    if (shade) shadeCounts.set(shade, (shadeCounts.get(shade) ?? 0) + 1)
  }
}
const [busiestShade] = [...shadeCounts.entries()].sort((a, b) => b[1] - a[1])[0]

describe('the shade filter genuinely narrows the list', () => {
  it('shows fewer plates with a shade than without', () => {
    const unfiltered = browse({})
    cleanup()
    const filtered = browse({ shade: busiestShade })
    expect(unfiltered, 'no plates rendered at all — the test proves nothing').toBeGreaterThan(0)
    expect(filtered, `shade "${busiestShade}" rendered nothing`).toBeGreaterThan(0)
    expect(filtered, 'the shade filter did not narrow anything').toBeLessThan(unfiltered)
  })

  it('narrows to combinations that actually contain that shade', () => {
    const expected = displayableCombinations(dataset).filter((c) =>
      c.colorIds.some((id) => ancestorAtLevel(dataset, id, 1) === busiestShade),
    ).length
    expect(browse({ shade: busiestShade })).toBe(expected)
  })

  it('renders nothing for a shade that does not exist, rather than everything', () => {
    // The failure mode worth guarding: a predicate that silently no-ops on an
    // unknown value would show the whole book and look like success.
    expect(browse({ shade: 'not-a-real-shade' })).toBe(0)
  })
})

describe('the family filter genuinely narrows the list', () => {
  const family = dataset.data.groups.broad[0].id

  it('shows fewer plates with a family than without', () => {
    const unfiltered = browse({})
    cleanup()
    const filtered = browse({ family })
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(unfiltered)
  })

  it('renders nothing for a family that does not exist', () => {
    expect(browse({ family: 'not-a-real-family' })).toBe(0)
  })
})

describe('the colour filter genuinely narrows the list', () => {
  it('narrows to combinations containing exactly that colour', () => {
    const colorId = dataset.data.colors.find((c) => c.combinationIds.length > 2)!.id
    const expected = displayableCombinations(dataset).filter((c) =>
      c.colorIds.includes(colorId),
    ).length
    expect(browse({ colorId: String(colorId) })).toBe(expected)
    expect(expected).toBeGreaterThan(0)
  })
})

describe('filters compose rather than replacing each other', () => {
  it('a shade AND a family is no wider than either alone', () => {
    const family = ancestorAtLevel(
      dataset,
      dataset.data.colors.find((c) => ancestorAtLevel(dataset, c.id, 1) === busiestShade)!.id,
      2,
    )!
    const shadeOnly = browse({ shade: busiestShade })
    cleanup()
    const familyOnly = browse({ family })
    cleanup()
    const both = browse({ shade: busiestShade, family })
    expect(both).toBeLessThanOrEqual(Math.min(shadeOnly, familyOnly))
    expect(both).toBeGreaterThan(0)
  })
})

describe('the size chips narrow the list', () => {
  it('a single size shows fewer than all sizes', () => {
    const all = render(
      <BrowseView state={{ ...initialState, view: 'browse' as const, sizes: [2, 3, 4] }}
        dispatch={vi.fn()} />,
    ).container.querySelectorAll('.plate-card, .plate').length
    cleanup()
    const pairsOnly = render(
      <BrowseView state={{ ...initialState, view: 'browse' as const, sizes: [2] }}
        dispatch={vi.fn()} />,
    ).container.querySelectorAll('.plate-card, .plate').length
    expect(pairsOnly).toBeGreaterThan(0)
    expect(pairsOnly).toBeLessThan(all)
  })
})
