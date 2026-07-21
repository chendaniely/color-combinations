import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccessibilityGoggles } from '../src/components/AccessibilityGoggles'
import { allowedFor } from '../src/data'
import { initialState } from '../src/core/state'

describe('AccessibilityGoggles control', () => {
  it('renders the label and all three lenses', () => {
    const html = renderToString(<AccessibilityGoggles state={initialState} dispatch={() => {}} />)
    expect(html).toContain('Accessibility')
    expect(html).toContain('Web text-ready')
    expect(html).toContain('Color-blind safe')
  })
  it('shows the active count when lenses are on', () => {
    const on = { ...initialState, access: ['web-text' as const, 'colorblind' as const] }
    expect(renderToString(<AccessibilityGoggles state={on} dispatch={() => {}} />)).toContain('Accessibility · 2')
  })
})

describe('allowedFor', () => {
  it('returns undefined (no filter) for an empty selection', () => {
    expect(allowedFor([])).toBeUndefined()
  })
  it('returns the AND-stacked set for active lenses', () => {
    const set = allowedFor(['web-text', 'print-bw', 'colorblind'])!
    expect(set.size).toBe(36)
  })
})
