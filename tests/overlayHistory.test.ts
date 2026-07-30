// The registry, in the fast suite. It is pure TypeScript with no browser
// globals, and it went untested through the whole of its first day — the
// defect below was found by a reviewer, not by a test, and would have been a
// three-line unit test away at any point.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  anyOverlayOpen, closeAllOverlays, registerOverlay, subscribeOverlays,
} from '../src/overlayHistory'

// The module is a singleton, so each test has to put back what it took.
//
// `closeAllOverlays()` does NOT do that: it calls every closer and deliberately
// leaves the entries alone, because unregistering is the unmounting component's
// job. A first version of this file called it in `beforeEach` and believed the
// registry was empty afterwards — it was not, and one test leaked an entry into
// every test after it. Nothing went red, which is how a broken fixture survives.
// Tracking the unregister functions is the only honest reset.
const registered: (() => void)[] = []

function open(close = vi.fn()) {
  const off = registerOverlay(close)
  registered.push(off)
  return { close, off }
}

afterEach(() => {
  for (const off of registered.splice(0)) off()
  if (anyOverlayOpen()) throw new Error('a test leaked a registry entry')
})

describe('the overlay registry', () => {
  it('is empty until something registers', () => {
    expect(anyOverlayOpen()).toBe(false)
  })

  it('reports open, and closed again after unregistering', () => {
    const { off } = open()
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
    const { off: offA } = open(close)
    open(close)

    offA()
    expect(anyOverlayOpen(), 'one unregister removed both').toBe(true)

    closeAllOverlays()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('calls every registered closer, not just the last', () => {
    const { close: a } = open()
    const { close: b } = open()
    closeAllOverlays()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('survives a closer that unregisters others while it runs', () => {
    // closeAllOverlays walks a snapshot precisely so this cannot throw or skip.
    const offB = vi.fn()
    const a = vi.fn(() => offB())
    open(a)
    const b = vi.fn()
    const { off } = open(b)
    offB.mockImplementation(off)

    expect(() => closeAllOverlays()).not.toThrow()
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it('tells subscribers when the count changes', () => {
    const seen = vi.fn()
    const unsub = subscribeOverlays(seen)
    const { off } = open()
    expect(seen).toHaveBeenCalledTimes(1)
    off()
    expect(seen).toHaveBeenCalledTimes(2)
    unsub()
    open().off()
    expect(seen, 'still notified after unsubscribing').toHaveBeenCalledTimes(2)
  })
})
