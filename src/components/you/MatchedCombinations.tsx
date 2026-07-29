import { useMemo } from 'react'
import { FLOOR_LABELS, passesFloor, rankCombinations } from '../../core/combinationMatch'
import { displayableCombinations } from '../../core/dataset'
import type { Action, FloorStop } from '../../core/state'
import { dataset } from '../../data'
import { PlateCard } from '../PlateCard'

const STOPS: FloorStop[] = [0, 1, 2, 3]
const SHOWN = 24

// Rank, don't filter. Requiring every colour to be the visitor's leaves 12 of
// 338 — a section that reads as broken — so the list is ordered by how much of
// each combination is theirs and a floor decides where it stops. Discrete stops
// because combinations hold 2-5 colours: a smooth slider would have dead zones.
export function MatchedCombinations({ palette, floor, dispatch }: {
  palette: ReadonlySet<number>
  floor: FloorStop
  dispatch: (a: Action) => void
}) {
  const ranked = useMemo(
    () => rankCombinations(displayableCombinations(dataset), palette), [palette])

  const counts = useMemo(
    () => STOPS.map((f) => ranked.filter((r) => passesFloor(r, f)).length), [ranked])

  const shown = ranked.filter((r) => passesFloor(r, floor))

  return (
    <section className="you-combos" aria-label="Combinations that suit you">
      <h2>Combinations</h2>
      <p className="you-combos-lede">
        Every combination in the book, strongest match first. Colours that
        aren’t in your palette are outlined, so you can see exactly which accent
        isn’t yours.
      </p>

      <div className="you-floor" role="radiogroup" aria-label="How much must be yours">
        {STOPS.map((f, i) => (
          <button key={f} role="radio" aria-checked={floor === f}
            onClick={() => dispatch({ type: 'setFloor', floor: f })}>
            {FLOOR_LABELS[f]} <em>{counts[i]}</em>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="you-note">
          No combinations reach that bar. Loosen it a step — or if your palette
          is small, the wider settings will suit you better.
        </p>
      ) : (
        <>
          <div className="you-combo-grid">
            {shown.slice(0, SHOWN).map((r) => (
              <div key={r.combination.id} className="you-combo"
                data-fraction={r.fraction}>
                <PlateCard comboId={r.combination.id} dispatch={dispatch}
                  outsiders={r.outsiders} />
                <small>{r.yours} of {r.total} yours</small>
              </div>
            ))}
          </div>
          {shown.length > SHOWN && (
            <p className="you-note">
              Showing the {SHOWN} strongest of {shown.length}. Tighten the bar
              above to narrow the list.
            </p>
          )}
        </>
      )}
    </section>
  )
}
