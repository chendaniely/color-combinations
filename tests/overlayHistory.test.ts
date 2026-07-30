// The registry, in the fast suite. It is pure TypeScript with no browser
// globals, and it went untested through the whole of its first day — the
// defect below was found by a reviewer, not by a test, and would have been a
// three-line unit test away at any point.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  anyOverlayOpen, closeAllOverlays, registerOverlay, subscribeOverlays,
} from '../src/overlayHistory'

beforeEach(() => {
  // The module is a singleton; leave it empty for the next test.
  closeAllOverlays()
  while (anyOverlayOpen()) break
})

describe('the overlay registry', () => {
  it('is empty until something registers', () => {
    expect(anyOverlayOpen()).toBe(false)
  })

  it('reports open, and closed again after unregistering', () => {
    const off = registerOverlay(vi.fn())
    expect(anyOverlayOpen()).toBe(true)
    off()
    expect(anyOverlayOpen()).toBe(false)
  })

  // THE DEFECT THIS FILE EXISTS FOR.
  //
  // ColorSampler registers its task-level dismiss and hands the SAME function
  // to its card-list Overlay, which registers it again. Keyed by reference in a
  // Set, those collapsed to one member, so unmounting the card list on the way
  // into a capture screen deleted the task-level dismiss too. Back then left
  // the overlay open and the next press left the site.
  it('keeps two registrations of ONE function separate', () => {
    const close = vi.fn()
    const offA = registerOverlay(close)
    registerOverlay(close)

    offA()
    expect(anyOverlayOpen(), 'one unregister removed both').toBe(true)

    closeAllOverlays()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('calls every registered closer, not just the last', () => {
    const a = vi.fn()
    const b = vi.fn()
    registerOverlay(a)
    registerOverlay(b)
    closeAllOverlays()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('survives a closer that unregisters others while it runs', () => {
    // closeAllOverlays walks a snapshot precisely so this cannot throw or skip.
    const offB = vi.fn()
    const a = vi.fn(() => offB())
    registerOverlay(a)
    const b = vi.fn()
    const off = registerOverlay(b)
    offB.mockImplementation(off)

    expect(() => closeAllOverlays()).not.toThrow()
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('tells subscribers when the count changes', () => {
    const seen = vi.fn()
    const unsub = subscribeOverlays(seen)
    const off = registerOverlay(vi.fn())
    expect(seen).toHaveBeenCalledTimes(1)
    off()
    expect(seen).toHaveBeenCalledTimes(2)
    unsub()
    registerOverlay(vi.fn())()
    expect(seen, 'still notified after unsubscribing').toHaveBeenCalledTimes(2)
  })
})
