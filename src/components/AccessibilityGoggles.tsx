import { LENSES } from '../color/accessibility'
import type { Action, AppState } from '../core/state'

// Reusable multi-select "goggles" control. A native <details> disclosure keeps
// it SSR-safe and keyboard-operable with no open-state bookkeeping. Rendered in
// the Wheel, Browse, and Match control areas; drives AppState.access.
export function AccessibilityGoggles({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const active = state.access
  return (
    <details className="a11y-goggles">
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
