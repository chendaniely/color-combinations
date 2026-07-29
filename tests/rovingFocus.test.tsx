// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorMatches } from '../src/components/sample/ColorMatches'

afterEach(cleanup)

function setup() {
  return render(
    <ColorMatches rgb={[35, 97, 146]} onMatch={vi.fn()} onBrowse={vi.fn()} />,
  )
}

// Every option in these groups used to be its own tab stop, so reaching the
// buttons below the nearest-colours grid meant pressing Tab twelve times, and
// the arrow keys did nothing at all. ARIA expects one tab stop per group with
// arrows moving inside it.
describe('composite widgets are one tab stop, navigated by arrows', () => {
  it('makes only the selected option tabbable', () => {
    setup()
    const options = screen.getAllByRole('option')
    const tabbable = options.filter((o) => o.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].getAttribute('aria-selected')).toBe('true')
  })

  it('makes only the checked radio tabbable', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    const tabbable = radios.filter((r) => r.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0].getAttribute('aria-checked')).toBe('true')
  })

  it('moves selection with ArrowRight, so selection follows focus', () => {
    setup()
    const options = screen.getAllByRole('option')
    options[0].focus()
    fireEvent.keyDown(options[0], { key: 'ArrowRight' })
    expect(screen.getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true')
  })

  it('wraps from the last option back to the first', () => {
    setup()
    const options = screen.getAllByRole('option')
    const last = options[options.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowRight' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
  })

  it('jumps to the ends with Home and End', () => {
    setup()
    let options = screen.getAllByRole('option')
    options[0].focus()
    fireEvent.keyDown(options[0], { key: 'End' })
    options = screen.getAllByRole('option')
    expect(options[options.length - 1].getAttribute('aria-selected')).toBe('true')

    fireEvent.keyDown(options[options.length - 1], { key: 'Home' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
  })

  it('changes the match level with the arrow keys', () => {
    setup()
    const radios = screen.getAllByRole('radio')
    // Default is Shade (index 1).
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    radios[1].focus()
    fireEvent.keyDown(radios[1], { key: 'ArrowLeft' })
    expect(screen.getAllByRole('radio')[0].getAttribute('aria-checked')).toBe('true')
  })

  it('ignores keys it does not own', () => {
    setup()
    const options = screen.getAllByRole('option')
    options[0].focus()
    fireEvent.keyDown(options[0], { key: 'a' })
    expect(screen.getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true')
  })
})
