// @vitest-environment jsdom
// What every screen does when app state names something the book has not got.
//
// Found by hunting rather than from a list. v1.7.1 fixed one instance of this
// in Browse — keyName() asserting non-null on a Map lookup — and the pattern
// turned out to appear in four more places, every one of them reading an id
// straight out of `state.selection`.
//
// Severity is not "an empty panel". The ErrorBoundary sits at the ROOT, in
// main.tsx, so a throw in a detail panel takes down the whole application: the
// wheel, Browse, Match, all of it, leaving the visitor to reload. One bad id
// costs the entire page.
//
// Unreachable today, because every id comes from clicking something real. It
// stops being unreachable the moment state can arrive from a URL, which is the
// top item in TODO.md — and a stale link is ordinary there, not exotic. These
// tests exist so that feature cannot reintroduce the crash.
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorDetail } from '../src/components/ColorDetail'
import { CombinationDetail } from '../src/components/CombinationDetail'
import { GroupDetail } from '../src/components/GroupDetail'
import { PlateCard } from '../src/components/PlateCard'
import { dataset } from '../src/data'

afterEach(cleanup)

const NO_SUCH_ID = 999999
const NO_SUCH_KEY = 'not-a-real-group'

describe('a detail panel asked for something that does not exist', () => {
  it('ColorDetail explains itself instead of throwing', () => {
    expect(() => render(<ColorDetail colorId={NO_SUCH_ID} dispatch={vi.fn()} />)).not.toThrow()
    expect(screen.getByText(/not in this book/i)).toBeTruthy()
    // Echo the id back: a broken shared link should be diagnosable, not merely
    // broken.
    expect(screen.getByText(String(NO_SUCH_ID))).toBeTruthy()
  })

  it('CombinationDetail explains itself instead of throwing', () => {
    expect(() => render(<CombinationDetail comboId={NO_SUCH_ID} dispatch={vi.fn()} />)).not.toThrow()
    expect(screen.getByText(/not in this book/i)).toBeTruthy()
  })

  it('GroupDetail explains itself instead of throwing', () => {
    expect(() => render(<GroupDetail groupId={NO_SUCH_KEY} dispatch={vi.fn()} />)).not.toThrow()
    expect(screen.getByText(/not in this book/i)).toBeTruthy()
    expect(screen.getByText(NO_SUCH_KEY)).toBeTruthy()
  })

  it('offers a way out, so the visitor is not stuck', () => {
    render(<ColorDetail colorId={NO_SUCH_ID} dispatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /close/i })).toBeTruthy()
  })
})

describe('a plate in a grid asked for something that does not exist', () => {
  it('renders nothing rather than taking the grid down', () => {
    const { container } = render(<PlateCard comboId={NO_SUCH_ID} dispatch={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })
})

// The other half of the contract: guarding must not have broken the real cases.
describe('the same screens still work for ids that DO exist', () => {
  const color = dataset.data.colors[0]
  const combo = dataset.data.combinations.find((c) => !c.excluded)!
  const group = dataset.data.groups.broad[0]

  it('ColorDetail renders the colour', () => {
    render(<ColorDetail colorId={color.id} dispatch={vi.fn()} />)
    expect(screen.getByText(color.name)).toBeTruthy()
    expect(screen.queryByText(/not in this book/i)).toBeNull()
  })

  it('CombinationDetail renders the combination', () => {
    render(<CombinationDetail comboId={combo.id} dispatch={vi.fn()} />)
    expect(screen.getByText(new RegExp(`Combination ${combo.id}`))).toBeTruthy()
    expect(screen.queryByText(/not in this book/i)).toBeNull()
  })

  it('GroupDetail renders the group', () => {
    render(<GroupDetail groupId={group.id} dispatch={vi.fn()} />)
    // By heading, not by text: a group's name legitimately appears in the panel
    // title AND in its own breadcrumb, so getByText finds two and throws.
    expect(screen.getByRole('heading', { name: group.name })).toBeTruthy()
    expect(screen.queryByText(/not in this book/i)).toBeNull()
  })

  it('PlateCard renders a plate', () => {
    const { container } = render(<PlateCard comboId={combo.id} dispatch={vi.fn()} />)
    expect(container.innerHTML).not.toBe('')
  })
})
