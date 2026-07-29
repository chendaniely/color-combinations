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

  // Focus MOVEMENT is testable in jsdom even though focus TRAPPING is not: the
  // component calls focus() itself rather than relying on the browser, which is
  // the whole point of the change. Trapping stays a browser test.
  it('moves focus into the dialog, not onto its close button', () => {
    render(<Overlay label="Test" onClose={() => {}}><button>Inside</button></Overlay>)
    const dialog = screen.getByRole('dialog')
    // Letting the browser choose lands on the first tabbable child — the × —
    // so a screen reader's first news of the dialog is the word "Close".
    expect(document.activeElement).toBe(dialog)
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Close' }))
  })

  it('is focusable programmatically without joining the Tab order', () => {
    render(<Overlay label="Test" onClose={() => {}}>body</Overlay>)
    // A <dialog> is not focusable by default, so the focus() above would be a
    // silent no-op without tabIndex=-1.
    expect(screen.getByRole('dialog').getAttribute('tabindex')).toBe('-1')
  })

  it('returns focus to whatever opened it', () => {
    // The defect: dismissing an overlay dropped focus to the top of <body>, so
    // a keyboard user had to Tab back through the entire header.
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<Overlay label="Test" onClose={() => {}}>body</Overlay>)
    expect(document.activeElement).not.toBe(trigger)

    unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('does not throw when the thing that opened it has itself gone away', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = render(<Overlay label="Test" onClose={() => {}}>body</Overlay>)
    // A trigger can legitimately unmount while the overlay is up — a doorway
    // button replaced by the screen it opened. Restoring focus to a detached
    // node must be a no-op, not a crash.
    trigger.remove()
    expect(() => unmount()).not.toThrow()
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
