import type { Action, FloorStop } from '../../core/state'
import { dataset } from '../../data'

// Carry the result into the rest of the site. The You tab is a doorway, not a
// destination — the point of knowing your colours is to go and use them.
//
// IT TRAVELS WITH THE PAGE (`position: sticky` — see `.you-doorways` in
// app.css). This tab has two long lists, up to fifty swatches and then a grid of
// plates, and a doorway sitting in the flow is off screen for most of the
// scroll. It was duplicated to compensate, first twice and briefly three times,
// until the owner named the better answer on 2026-07-30: "since i have those
// buttons repeated 3 times on the pages now. maybe we have those brose/start be
// a floating set of buttons so it's out of the way but travels with the user as
// they scroll on the desktop / phone". So there is now exactly ONE, and it is
// always on screen. Sticky rather than fixed on purpose: it stays in the flow,
// so it reserves its own space, needs no pointer-events games, degrades to a
// plain block where sticky is unsupported, and cannot collide with the fixed
// corner mark the way a bottom bar would.
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
export function YouDoorways({ palette, floor, label, selectedId, dispatch }: {
  /** Iteration order is the order shown on screen. */
  palette: ReadonlySet<number>
  floor: FloorStop
  /** What to call this palette in Browse: "Your colours", "Clear Spring". */
  label: string
  /**
   * The colour the visitor picked in the grid above. Falls back to the first
   * shown — which is what this ALWAYS used to do, and the owner's point was
   * that assuming is poor when someone is looking at fifty swatches.
   */
  selectedId?: number | undefined
  dispatch: (a: Action) => void
}) {
  const ids = [...palette]
  if (ids.length === 0) return null

  // The visitor's pick, or the first shown if they have not picked. Never the
  // first in the BOOK, which is what this did before v1.8.2 and could name a
  // colour nowhere near their list.
  const chosenId = selectedId !== undefined && palette.has(selectedId) ? selectedId : ids[0]
  const first = dataset.colorById.get(chosenId)
  if (!first) return null

  return (
    <section className="you-doorways" aria-label="Take these colours further">
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
    </section>
  )
}

// The prose that used to sit around those buttons, now that they travel.
//
// It lives here rather than in PaletteTabs so the explanation and the thing it
// explains stay in one file, and it is a separate export because it belongs
// somewhere else on the page: under the swatch grid, which is the only place
// "pick any swatch above" is true, and where somebody who has just read fifty
// colour names is deciding what to do with them.
export function YouDoorwayNote({ count }: { count: number }) {
  return (
    <p className="muted you-doorway-note">
      Your colours work anywhere on the site, and the two buttons above take them
      there. <b>Browse</b> carries all {count}. <b>Match</b> builds by narrowing —
      it looks for combinations containing <em>every</em> colour you add — so it
      starts from one of yours rather than all {count} at once. Pick any swatch
      above to start from that one instead, then add more in Match to narrow
      further.
    </p>
  )
}
