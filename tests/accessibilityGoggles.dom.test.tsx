// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AccessibilityGoggles } from '../src/components/AccessibilityGoggles'
import { initialState } from '../src/core/state'

afterEach(cleanup)

describe('AccessibilityGoggles outside-click (jsdom)', () => {
  it('closes the open menu when a pointer press lands outside it', () => {
    const { container } = render(
      <div>
        <AccessibilityGoggles state={initialState} dispatch={() => {}} />
        <button type="button">elsewhere</button>
      </div>,
    )
    const details = container.querySelector('details.a11y-goggles') as HTMLDetailsElement
    details.open = true
    fireEvent.pointerDown(document.body)
    expect(details.open).toBe(false)
  })

  it('keeps the menu open when a press lands inside (so several lenses can be toggled)', () => {
    const { container } = render(<AccessibilityGoggles state={initialState} dispatch={() => {}} />)
    const details = container.querySelector('details.a11y-goggles') as HTMLDetailsElement
    details.open = true
    const option = container.querySelector('.a11y-option') as HTMLElement
    fireEvent.pointerDown(option)
    expect(details.open).toBe(true)
  })
})
