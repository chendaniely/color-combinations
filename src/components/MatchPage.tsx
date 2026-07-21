import { useState } from 'react'
import { combosForSet, remapKeysToLevel, suggestPartners } from '../core/matching'
import type { Action, AppState, MatchLevel } from '../core/state'
import { allowedFor, dataset } from '../data'
import { PaletteTray } from './PaletteTray'
import { PlateCard } from './PlateCard'
import { ShadePicker } from './ShadePicker'
import { SuggestionList } from './SuggestionList'

const MATCH_SIZES = new Set<2 | 3 | 4>([2, 3, 4])
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Colors' }, { level: 1, label: 'Shades' }, { level: 2, label: 'Families' },
]
const LEVEL_LABEL: Record<MatchLevel, string> = { 0: 'Colors', 1: 'Shades', 2: 'Families' }

export function MatchPage({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { level, keys } = state.palette
  const [levelNotice, setLevelNotice] = useState<string | null>(null)
  function switchLevel(to: MatchLevel) {
    if (to === level) return
    const remapped = remapKeysToLevel(dataset, keys, level, to)
    setLevelNotice(keys.length > 0 && remapped.length === 0
      ? `Switched to ${LEVEL_LABEL[to]} — your previous palette doesn't map here, so pick a new one to start.`
      : null)
    dispatch({ type: 'setMatchLevel', level: to, keys: remapped })
  }
  const allowed = allowedFor(state.access)
  const suggestions = keys.length ? suggestPartners(dataset, level, keys, MATCH_SIZES, allowed) : []
  const combos = keys.length ? combosForSet(dataset, level, keys, MATCH_SIZES, allowed) : []
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
        <>
          {levelNotice && <p className="empty-note">{levelNotice}</p>}
          {level === 0
            ? <p className="lede">Search a color name above, or snap a color with the camera — exact colors land here.</p>
            : <ShadePicker level={level} dispatch={dispatch} />}
        </>
      ) : (
        <>
          <PaletteTray keys={keys} dispatch={dispatch} />
          <div className="match-cols">
            <section>
              <h2 className="seclabel">Add a shade <span className="q">— goes with everything above</span></h2>
              <SuggestionList suggestions={suggestions} dispatch={dispatch} />
              {suggestions.length === 0 &&
                <p className="empty-note">{state.access.length > 0 && combos.length === 0
                  ? 'No accessible pairings for this palette — loosen the goggles.'
                  : 'Nothing in the book pairs with all of these — try removing a shade.'}</p>}
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
