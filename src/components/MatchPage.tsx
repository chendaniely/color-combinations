import { useEffect, useMemo, useState } from 'react'
import { combosForSet, remapKeysToLevel, suggestPartners } from '../core/matching'
import type { Action, AppState, MatchLevel } from '../core/state'
import { allowedFor, dataset } from '../data'
import { PaletteTray } from './PaletteTray'
import { ShareLink } from './ShareLink'
import { PlateCard } from './PlateCard'
import { ShadePicker } from './ShadePicker'
import { SuggestionList } from './SuggestionList'
import { useRovingFocus } from './useRovingFocus'

const MATCH_SIZES = new Set<2 | 3 | 4>([2, 3, 4])
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Colors' }, { level: 1, label: 'Shades' }, { level: 2, label: 'Families' },
]
const LEVEL_LABEL: Record<MatchLevel, string> = { 0: 'Colors', 1: 'Shades', 2: 'Families' }
// The page's copy used to say "shade" everywhere regardless of the active
// level, so choosing Colors or Families left the instructions describing a
// level the visitor was not on.
const NOUN: Record<MatchLevel, { one: string; many: string }> = {
  0: { one: 'color', many: 'colors' },
  1: { one: 'shade', many: 'shades' },
  2: { one: 'family', many: 'families' },
}

export function MatchPage({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { level, keys } = state.palette
  const [levelNotice, setLevelNotice] = useState<string | null>(null)
  const levelNav = useRovingFocus()
  function switchLevel(to: MatchLevel) {
    if (to === level) return
    const remapped = remapKeysToLevel(dataset, keys, level, to)
    setLevelNotice(keys.length > 0 && remapped.length === 0
      ? `Switched to ${LEVEL_LABEL[to]} — your previous palette doesn't map here, so pick a new one to start.`
      : null)
    dispatch({ type: 'setMatchLevel', level: to, keys: remapped })
  }
  // The notice is about a palette that failed to remap, so it stops being true
  // the moment the visitor picks anything. Without this it lingered in state
  // while hidden (it only renders when the palette is empty) and reappeared
  // later when they emptied the palette by Start over or by removing the last
  // chip — a message about a level switch that had happened long before.
  useEffect(() => {
    if (keys.length > 0) setLevelNotice(null)
  }, [keys.length])

  const noun = NOUN[level]
  // useMemo for consistency with App and ChordWheel — see the note in
  // BrowseView.
  const allowed = useMemo(() => allowedFor(state.access), [state.access])
  const suggestions = keys.length ? suggestPartners(dataset, level, keys, MATCH_SIZES, allowed) : []
  const combos = keys.length ? combosForSet(dataset, level, keys, MATCH_SIZES, allowed) : []
  return (
    <div className="match-view">
      <div className="match-head">
        <h1>Build a palette</h1>
        <div className="level" role="radiogroup" aria-label="Matching level"
          ref={levelNav.ref} onKeyDown={levelNav.onKeyDown}>
          {LEVELS.map(({ level: lv, label }) => (
            <button key={lv} role="radio" aria-checked={level === lv}
              {...levelNav.itemProps(level === lv)}
              onClick={() => switchLevel(lv)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="lede">Start from a {noun.one} you have and see what it goes with; add more {noun.many} to
        build an outfit of three, four, or more. Colors don't have to match exactly.</p>
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
          {/* A link to a palette IS a saved palette on a site with no accounts —
              the other half of TODO.md's "save / export a built palette". */}
          {keys.length > 0 && <ShareLink label="Copy link to this palette" />}
          <div className="match-cols">
            <section>
              <h2 className="seclabel">Add a {noun.one} <span className="q">— goes with everything above</span></h2>
              <SuggestionList suggestions={suggestions} dispatch={dispatch} />
              {suggestions.length === 0 &&
                <p className="empty-note">{state.access.length > 0 && combos.length === 0
                  ? 'No accessible pairings for this palette — loosen the goggles.'
                  : `Nothing in the book pairs with all of these — try removing a ${noun.one}.`}</p>}
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
