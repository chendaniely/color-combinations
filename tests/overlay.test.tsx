// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Overlay } from '../src/components/Overlay'
import { ColorSampler } from '../src/components/sample/ColorSampler'

afterEach(cleanup)

// What jsdom CAN check about Overlay: that it is a real <dialog>, that it is
// opened, that it escapes its React parent in the DOM, and that it wires the
// close affordance. What it CANNOT check is the behaviour that motivated the
// change — focus trapping, Escape, inertness of the page behind — because
// jsdom implements none of it (showModal is polyfilled in tests/setup.ts).
// Those are asserted against a real browser in tests/browser/overlay.spec.ts.
describe('Overlay', () => {
  it('is a native dialog, not a div wearing role=dialog', () => {
    render(<Overlay label="Test" onClose={() => {}}>body</Overlay>)
    const dialog = screen.getByRole('dialog')
    expect(dialog.tagName).toBe('DIALOG')
  })

  it('is open, so the browser applies modal semantics', () => {
    render(<Overlay label="Test" onClose={() => {}}>body</Overlay>)
    expect((screen.getByRole('dialog') as HTMLDialogElement).open).toBe(true)
  })

  // The reason for the portal. ColorSampler renders inside SearchBox's
  // `.search-box`, where `.search-box input` (0,1,1) outranked every bare
  // single-class rule an overlay defined — the trap that produced the colour
  // picker's wrong font and its orange "valid field looks invalid" underline.
  // Escaping the DOM subtree is what makes that unreachable, and it is the DOM
  // tree that matters here: the top layer alone would not have helped, because
  // descendant matching follows the document, not paint order.
  it('escapes its React parent in the DOM, landing on body', () => {
    const { container } = render(
      <div className="search-box">
        <Overlay label="Test" onClose={() => {}}>body</Overlay>
      </div>,
    )
    expect(container.querySelector('dialog')).toBeNull()
    const dialog = screen.getByRole('dialog')
    expect(dialog.closest('.search-box')).toBeNull()
    expect(dialog.parentElement).toBe(document.body)
  })

  it('renders a close button whose name callers choose', () => {
    const onClose = vi.fn()
    render(<Overlay label="Test" onClose={onClose} closeLabel="Back">body</Overlay>)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders no close button when the screen provides its own way out', () => {
    render(<Overlay label="Test" onClose={() => {}} closeLabel={null}>body</Overlay>)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the caller\'s class alongside the shared one', () => {
    render(<Overlay label="Test" onClose={() => {}} className="probe-review">body</Overlay>)
    const dialog = screen.getByRole('dialog')
    expect(dialog.classList.contains('cam-overlay')).toBe(true)
    expect(dialog.classList.contains('probe-review')).toBe(true)
  })
})

// Moved here from appSmoke.test.tsx, which server-renders. See the note there.
describe('ColorSampler source picker', () => {
  it('offers camera-agnostic sources (upload + picker)', () => {
    render(<ColorSampler dispatch={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Sample a color' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /upload a photo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /pick a color/i })).toBeTruthy()
  })
})
