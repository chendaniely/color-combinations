import { useEffect, useRef } from 'react'
import { LENSES } from '../color/accessibility'
import type { Action, AppState } from '../core/state'

// Reusable multi-select "goggles" control. A native <details> disclosure keeps
// it SSR-safe and keyboard-operable with no open-state bookkeeping. Lives once
// in the shared Header so it sits in the same spot on every view and drives the
// single global AppState.access. A document-level pointer listener closes the
// menu when a press lands outside it (clicks on the lens options stay inside, so
// toggling several lenses in a row keeps the menu open).
export function AccessibilityGoggles({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const active = state.access
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = ref.current
      if (el?.open && !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <details className="a11y-goggles" ref={ref}>
      <summary aria-label={`Accessibility filters${active.length ? `, ${active.length} on` : ''}`}>
        {active.length ? `Accessibility · ${active.length}` : 'Accessibility'}
      </summary>
      <div className="a11y-menu" role="group" aria-label="Accessibility filters">
        {LENSES.map((lens) => (
          <button
            key={lens.id} type="button" className="a11y-option"
            aria-pressed={active.includes(lens.id)}
            onClick={() => dispatch({ type: 'toggleAccess', id: lens.id })}
          >
            <span className="a11y-option-label">{lens.label}</span>
            <span className="a11y-option-desc">{lens.description}</span>
          </button>
        ))}
      </div>
    </details>
  )
}
