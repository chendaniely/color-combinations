import type { Action, FloorStop } from '../../core/state'
import { dataset } from '../../data'

// Carry the result into the rest of the site. The You tab is a doorway, not a
// destination — the point of knowing your colours is to go and use them.
//
// This used to hand BOTH destinations a single colour, chosen as
// `dataset.data.colors.find(c => palette.has(c.id))` — the lowest id in the
// book, not the best match — while both buttons said "these". A visitor with
// nineteen colours arrived in Browse filtered to one of them, and the reason
// was that neither destination could hold a palette.
//
// Now they differ, because the two destinations genuinely differ:
//
// - BROWSE takes the whole palette and the floor, since v1.8.2 taught it to
//   filter by a set. This is the one the label always promised.
// - MATCH still takes ONE colour, and that is correct rather than a shortcut:
//   `combosForSet` requires EVERY key to be present, so seeding nineteen
//   colours would return zero combinations. It is a narrowing builder. What
//   changed is that it seeds from the FIRST COLOUR ON SCREEN and names it,
//   instead of picking silently and saying "these".
//
// A caveat worth stating rather than glossing: "first on screen" is the best
// fit for a SEASON palette, which arrives ranked from the join table, but only
// dataset order for the MEASURED one — `measuredPalette` filters `scorePalette`
// without sorting, and `Scored` carries no numeric score to sort by. So this is
// a real improvement for seasons and merely honest for measured. Ranking the
// measured list would mean inventing a score, which is a bigger decision than
// this fix.
export function YouDoorways({ palette, floor, label, dispatch }: {
  /** Iteration order is the order shown on screen. */
  palette: ReadonlySet<number>
  floor: FloorStop
  /** What to call this palette in Browse: "Your colours", "Clear Spring". */
  label: string
  dispatch: (a: Action) => void
}) {
  const ids = [...palette]
  if (ids.length === 0) return null

  // The first colour AS SHOWN, not the first in the book. For a season palette
  // that is the closest match; for the measured one it is simply the first
  // swatch the visitor is looking at. Either way it is a colour they can see,
  // which the old `dataset.data.colors.find(...)` was not.
  const first = dataset.colorById.get(ids[0])
  if (!first) return null

  return (
    <section className="you-doorways" aria-label="Take these colours further">
      <p>
        Your colours work anywhere on the site — take them into the palette
        builder, or browse every combination that uses them.
      </p>
      <div className="you-doorway-buttons">
        <button className="cam-btn primary"
          onClick={() => dispatch({
            type: 'setBrowsePalette',
            palette: { ids, label, floor },
          })}>
          → Browse all {ids.length} in the book
        </button>
        <button className="cam-btn ghost"
          onClick={() => dispatch({ type: 'seedPalette', key: `c${first.id}`, level: 0 })}>
          → Start a palette from {first.name}
        </button>
      </div>
      <p className="muted you-doorway-note">
        Match builds a palette by narrowing — it looks for combinations
        containing <em>every</em> colour you add — so it starts from one of yours
        rather than all {ids.length} at once. Add more there to narrow further.
      </p>
    </section>
  )
}
