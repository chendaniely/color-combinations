import type { Action, AppState } from '../core/state'
import type { GranularityLevel, SizeBucket } from '../core/types'

const LEVELS: { level: GranularityLevel; label: string }[] = [
  { level: 0, label: 'Colors' },
  { level: 1, label: 'Shades' },
  { level: 2, label: 'Families' },
  { level: 3, label: 'Groups' },
]
const SIZES: SizeBucket[] = [2, 3, 4]

interface Props { state: AppState; dispatch: (a: Action) => void }

export function WheelControls({ state, dispatch }: Props) {
  return (
    <div className="wheel-controls">
      <div className="granularity" role="radiogroup" aria-label="Grouping granularity">
        {LEVELS.map(({ level, label }) => (
          <button key={level} role="radio" aria-checked={state.granularity === level}
            onClick={() => dispatch({ type: 'setGranularity', level })}>
            {label}
          </button>
        ))}
      </div>
      <p className="hint">
        Nothing has to match exactly — zoom out to see what pairs with, say, blues in general.
      </p>
      <div className="size-filter" aria-label="Colors per combination">
        {SIZES.map((s) => (
          <button key={s} aria-pressed={state.sizes.includes(s)}
            onClick={() => dispatch({ type: 'toggleSize', size: s })}>
            {s === 4 ? '4+' : s}
          </button>
        ))}
        <span className="size-label">colors per combo</span>
      </div>
    </div>
  )
}
