// @vitest-environment jsdom
// The Copy-link button.
//
// It is redundant on a desktop, where the address bar already shows the state.
// It exists because MOBILE BROWSERS HIDE THE ADDRESS BAR while scrolling, and
// the You tab is used on a phone by definition — that is where the camera is.
// Without it the whole deep-link feature would be invisible where it matters.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareLink } from '../src/components/ShareLink'

afterEach(cleanup)

let written: string[]

beforeEach(() => {
  written = []
  Object.assign(navigator, {
    clipboard: { writeText: (t: string) => { written.push(t); return Promise.resolve() } },
  })
})

describe('ShareLink', () => {
  it('copies the current address', async () => {
    render(<ShareLink />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(written).toEqual([location.href]))
  })

  // The URL changes as the visitor moves around. A value captured at render
  // would go stale the moment they opened a different colour, and copying the
  // WRONG link is worse than having no button.
  it('reads the address at click time, not at render time', async () => {
    render(<ShareLink />)
    location.hash = '#/browse?family=reds'
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(written[0]).toContain('#/browse?family=reds'))
  })

  it('confirms afterwards, then goes back to its label', async () => {
    vi.useFakeTimers()
    render(<ShareLink label="Copy link" />)
    fireEvent.click(screen.getByRole('button'))
    await vi.waitFor(() => expect(screen.getByRole('button').textContent).toMatch(/copied/i))
    vi.advanceTimersByTime(1600)
    await vi.waitFor(() => expect(screen.getByRole('button').textContent).toBe('Copy link'))
    vi.useRealTimers()
  })

  it('takes a caller-chosen label, for its accessible name too', () => {
    render(<ShareLink label="Copy link to Deep Autumn" />)
    expect(screen.getByRole('button', { name: 'Copy link to Deep Autumn' })).toBeTruthy()
  })

  it('does not throw when the clipboard refuses both routes', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
    })
    // jsdom has no execCommand, so the fallback fails too — the worst case.
    render(<ShareLink />)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
    // And says nothing rather than claiming a copy happened.
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.getByRole('button').textContent).not.toMatch(/copied/i)
  })
})

// copyText's own contract, asserted because ShareLink's test exposed a break in
// it. It promises Promise<boolean> and must never reject: every caller shows
// "copied ✓" only on true, so a rejection skips the check and surfaces as an
// unhandled rejection instead. Reachable from CopyField and Copy CSS too — this
// was not a new bug, just a newly noticed one.
describe('copyText never rejects, whatever the browser lacks', () => {
  it('returns false when the clipboard API and execCommand are both missing', async () => {
    const { copyText } = await import('../src/copy')
    Object.assign(navigator, {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
    })
    // jsdom has no execCommand at all, which is exactly the missing case.
    await expect(copyText('hello')).resolves.toBe(false)
  })

  it('returns true when the clipboard accepts', async () => {
    const { copyText } = await import('../src/copy')
    Object.assign(navigator, { clipboard: { writeText: () => Promise.resolve() } })
    await expect(copyText('hello')).resolves.toBe(true)
  })
})
