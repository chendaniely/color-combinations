// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../src/components/ErrorBoundary'

afterEach(cleanup)

function Boom({ message = 'canvas unavailable' }: { message?: string }): never {
  throw new Error(message)
}

// React logs caught render errors to console.error regardless of the boundary,
// which would otherwise fill the test output with expected noise.
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('the crash screen', () => {
  it('renders children when nothing is wrong', () => {
    render(<ErrorBoundary><p>all fine</p></ErrorBoundary>)
    expect(screen.getByText('all fine')).toBeTruthy()
  })

  it('replaces a blank white page with an explanation', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/something went wrong/i)).toBeTruthy()
  })

  it('says it is not the visitor\'s fault, and that nothing was lost', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    const text = screen.getByRole('alert').textContent ?? ''
    expect(text).toMatch(/not something you did/i)
    expect(text).toMatch(/nothing is lost|nothing you have done is stored/i)
  })

  // The owner does not read JavaScript and cannot open a console. The message
  // is the one thing they can copy into a session to get the bug fixed.
  it('shows the error message so it can be reported', () => {
    render(<ErrorBoundary><Boom message="face detector failed to load" /></ErrorBoundary>)
    expect(screen.getByText('face detector failed to load')).toBeTruthy()
  })

  it('offers a reload', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy()
  })

  it('still logs the error, so the console trace survives', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    const logged = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls
    expect(logged.some((args) => String(args[0]).includes('Unhandled error in render'))).toBe(true)
  })

  it('does not re-render the tree that just threw', () => {
    const rendered = vi.fn()
    function Counting(): never { rendered(); throw new Error('boom') }
    render(<ErrorBoundary><Counting /></ErrorBoundary>)
    const afterCrash = rendered.mock.calls.length
    // Interacting with the crash screen must not attempt the broken tree again.
    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(rendered.mock.calls.length).toBe(afterCrash)
  })
})
