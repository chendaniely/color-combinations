// @vitest-environment jsdom
// The ways into a colour, as one component used in more than one place.
//
// It existed already, as a card list buried inside ColorSampler's overlay —
// which is why the owner could not find the camera: "the options under the
// pencil aren't that visable to the user". Extracting it is what lets Match >
// Colors stop being a dead end without a second implementation drifting from
// the first.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Camera } from '@phosphor-icons/react'
import { ColorEntry } from '../src/components/sample/ColorEntry'

afterEach(cleanup)

// Emoji became icons on 2026-07-30. The browser test that guards the header
// button asserts a `data-icon` attribute the author writes by hand, which a
// reviewer showed passes when `Pencil` is imported *as* `Camera` — it checks
// the label, not the drawing. This checks the drawing, in milliseconds, by
// comparing against the library's own glyph.
describe('the icons are the glyphs they claim to be', () => {
  const pathsOf = (el: HTMLElement) =>
    [...el.querySelectorAll('path')].map((p) => p.getAttribute('d')).join('|')

  it('renders the real Phosphor Camera on the camera card', () => {
    const { container } = render(<ColorEntry onPick={vi.fn()} cameraAvailable />)
    const card = [...container.querySelectorAll('.sample-src')]
      .find((b) => /camera/i.test(b.textContent ?? ''))!
    const reference = render(<Camera weight="light" />).container

    expect(pathsOf(card as HTMLElement)).not.toBe('')
    expect(pathsOf(card as HTMLElement), 'the camera card is drawing something else')
      .toBe(pathsOf(reference))
  })
})

describe('the colour-entry gallery', () => {
  it('offers every way in', () => {
    render(<ColorEntry onPick={vi.fn()} cameraAvailable />)
    for (const name of [/search/i, /camera/i, /upload/i, /pick a colou?r/i]) {
      expect(screen.getByRole('button', { name }), String(name)).toBeTruthy()
    }
  })

  it('reports which one was chosen', () => {
    const onPick = vi.fn()
    render(<ColorEntry onPick={onPick} cameraAvailable />)
    fireEvent.click(screen.getByRole('button', { name: /camera/i }))
    expect(onPick).toHaveBeenCalledWith('camera')
    fireEvent.click(screen.getByRole('button', { name: /upload/i }))
    expect(onPick).toHaveBeenCalledWith('upload')
    fireEvent.click(screen.getByRole('button', { name: /pick a colou?r/i }))
    expect(onPick).toHaveBeenCalledWith('pick')
  })

  // Search is the odd one out on purpose: it points at the header box rather
  // than opening an overlay, because a second search input would be two things
  // to keep in step and pointing at the permanent one teaches where it lives.
  it('reports search as its own kind of pick', () => {
    const onPick = vi.fn()
    render(<ColorEntry onPick={onPick} cameraAvailable />)
    fireEvent.click(screen.getByRole('button', { name: /search/i }))
    expect(onPick).toHaveBeenCalledWith('search')
  })

  it('omits the camera on a device that has none, rather than offering a dead button', () => {
    render(<ColorEntry onPick={vi.fn()} cameraAvailable={false} />)
    expect(screen.queryByRole('button', { name: /camera/i })).toBeNull()
    // The others still stand.
    expect(screen.getByRole('button', { name: /upload/i })).toBeTruthy()
  })

  it('describes what each card does, not just what it is called', () => {
    const { container } = render(<ColorEntry onPick={vi.fn()} cameraAvailable />)
    // Every card carries a sub-line. A grid of bare nouns explains nothing to
    // somebody who has never sampled a colour before.
    const subs = container.querySelectorAll('.sample-src small')
    expect(subs.length).toBe(container.querySelectorAll('.sample-src').length)
    for (const s of subs) expect(s.textContent!.length).toBeGreaterThan(8)
  })
})
