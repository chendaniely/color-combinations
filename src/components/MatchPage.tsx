import { combosForSet, remapKeysToLevel, suggestPartners } from '../core/matching'
import type { Action, AppState, MatchLevel } from '../core/state'
import { dataset } from '../data'
import { PaletteTray } from './PaletteTray'
import { PlateCard } from './PlateCard'
import { ShadePicker } from './ShadePicker'
import { SuggestionList } from './SuggestionList'

const MATCH_SIZES = new Set<2 | 3 | 4>([2, 3, 4])
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 1, label: 'Shades' }, { level: 2, label: 'Families' },
]

export function MatchPage({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { level, keys } = state.palette
  function switchLevel(to: MatchLevel) {
    if (to === level) return
    dispatch({ type: 'setMatchLevel', level: to, keys: remapKeysToLevel(dataset, keys, level, to) })
  }
  const suggestions = keys.length ? suggestPartners(dataset, level, keys, MATCH_SIZES) : []
  const combos = keys.length ? combosForSet(dataset, level, keys, MATCH_SIZES) : []
  return (
    <div className="match-view">
      <div className="match-head">
        <h1>Build a palette</h1>
        <div className="level" role="radiogroup" aria-label="Matching level">
          {LEVELS.map(({ level: lv, label }) => (
            <button key={lv} role="radio" aria-checked={level === lv} onClick={() => switchLevel(lv)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="lede">Start from a shade you have and see what it goes with; add more shades to build an
        outfit of three, four, or more. Colors don't have to match exactly.</p>
      {keys.length === 0 ? (
        <ShadePicker level={level} dispatch={dispatch} />
      ) : (
        <>
          <PaletteTray keys={keys} dispatch={dispatch} />
          <div className="match-cols">
            <section>
              <h2 className="seclabel">Add a shade <span className="q">— goes with everything above</span></h2>
              <SuggestionList suggestions={suggestions} dispatch={dispatch} />
              {suggestions.length === 0 &&
                <p className="empty-note">Nothing in the book pairs with all of these — try removing a shade.</p>}
            </section>
            <section>
              <h2 className="seclabel">The book pairs these <span className="q">— {combos.length} palette{combos.length === 1 ? '' : 's'}</span></h2>
              <div className="plate-list">
                {combos.slice(0, 12).map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
