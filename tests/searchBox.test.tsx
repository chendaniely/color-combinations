// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchBox } from '../src/components/SearchBox'

afterEach(cleanup)

function typed(text: string) {
  const dispatch = vi.fn()
  render(<SearchBox dispatch={dispatch} />)
  const input = screen.getByRole('combobox', { name: 'Search colors' })
  fireEvent.change(input, { target: { value: text } })
  return { dispatch, input }
}

// Before this, the type-ahead was silent to a screen reader: role=listbox and
// aria-selected sat on the results, but nothing announced that a popup had
// opened, and nothing announced which result the arrow keys had moved to.
describe('search type-ahead announces itself', () => {
  it('is a combobox, collapsed until there are results', () => {
    render(<SearchBox dispatch={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'Search colors' })
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('expands once results appear', () => {
    const { input } = typed('blue')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
  })

  it('points aria-activedescendant at the highlighted option', () => {
    const { input } = typed('blue')
    const first = screen.getAllByRole('option')[0]
    expect(input.getAttribute('aria-activedescendant')).toBe(first.id)
    expect(first.getAttribute('aria-selected')).toBe('true')
  })

  it('moves the active descendant with the arrow keys', () => {
    const { input } = typed('blue')
    const options = screen.getAllByRole('option')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe(options[1].id)
    expect(options[1].getAttribute('aria-selected')).toBe('true')
    expect(options[0].getAttribute('aria-selected')).toBe('false')
  })

  it('aria-controls resolves to a real element even when collapsed', () => {
    render(<SearchBox dispatch={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'Search colors' })
    const id = input.getAttribute('aria-controls')!
    expect(document.getElementById(id)).toBeTruthy()
  })

  // The options used to wrap <button>s. An interactive child inside
  // role=option is not reliably reachable, and each button stole a tab stop
  // from a widget whose whole point is that focus never leaves the input.
  it('puts no tab stop inside the option list', () => {
    typed('blue')
    const list = screen.getByRole('listbox')
    expect(list.querySelector('button, a, input, [tabindex]')).toBeNull()
  })

  it('still selects a colour on pointer down', () => {
    const { dispatch } = typed('blue')
    fireEvent.mouseDown(screen.getAllByRole('option')[0])
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'select' }),
    )
  })
})
