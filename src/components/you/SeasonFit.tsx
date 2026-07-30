import type { IdealPair } from '../../color/seasonFit'
import type { SubSeason } from '../../core/seasons'
import { dataset } from '../../data'
import { useRovingFocus } from '../useRovingFocus'

// How well Wada's book can serve a season, shown rather than implied.
//
// The book is a 1933 pigment book: measured on 2026-07-29 its median chroma is
// C* 52.7, 83 of its 157 colours sit above C* 50, and only 11 usable colours
// fall below C* 20. The four seasons DEFINED by mutedness are sharing those
// eleven. Nearest-neighbour will always return something, so without this
// panel a season the book cannot serve looks exactly as confident as one it
// serves well. Showing the ideal beside the nearest real colour is the whole
// point of the feature.
//
// THE RIGHT-HAND COLOURS ARE SELECTABLE, as of v1.9.2. Owner: "i also want the
// 'what the book has for ...' those list of colors also clickable that changes
// the start a palette from. this way anything on that page can be interactive
// as a starting point." Only the right-hand one: the left is a PCCS ideal, a
// computed target that is not in the book and has no id to start a palette
// from. Rendering it as a dead half of a live row is the honest arrangement —
// it is the thing the book does NOT have.
//
// A THIRD OF THESE COLOURS ARE NOT IN THE SEASON'S PALETTE — 47 of 144 across
// the twelve, measured before wiring this up. That is not a mismatch to correct
// but the panel's whole subject: the nearest match to an ideal can still be too
// far away to belong to the palette. It does mean the selection has to be
// allowed to leave the palette, which is why the guard against a STALE
// selection lives in PaletteTabs, where both lists are known.
//
// Presentational: it is handed its pairs and reports a click. PaletteTabs owns
// the selection because the swatch grid shares it — one pick, two lists.
export function SeasonFit({ sub, pairs, selectedId, selectedRow, onSelect }: {
  sub: SubSeason
  pairs: IdealPair[]
  /** The page-wide pick, which may well be a swatch rather than a row here. */
  selectedId: number | null
  /**
   * WHICH ROW the visitor clicked, when the pick came from this list.
   *
   * A colour id is not enough to identify a row, and that is the whole point of
   * this panel: 60 of the 144 rows across the twelve seasons repeat a colour
   * that serves more than one ideal. Deriving the row from the id with
   * `findIndex` returns the FIRST row carrying it, so clicking the second
   * "Light Pinkish Cinnamon" lit up the first — the highlight jumped backwards
   * as you arrowed forwards, and the focused option reported
   * aria-selected="false" in a single-select listbox. That was a worse lie than
   * the one it replaced (all duplicates selected at once), so the row has to
   * travel with the pick rather than be reconstructed from it.
   *
   * null when the page's pick is a swatch instead.
   */
  selectedRow: number | null
  onSelect: (id: number, row: number) => void
}) {
  const nameOf = (id: number) => dataset.colorById.get(id)?.name ?? ''
  const hexOf = (id: number) => dataset.colorById.get(id)?.hex ?? '#000'

  const list = useRovingFocus()
  // BY ROW, NOT BY COLOUR ID — for selection as well as for the tab stop.
  //
  // The crowding this panel exists to show means one colour can serve two or
  // three ideals, so matching on id marked every duplicate at once: measured on
  // Light Spring, three rows carried aria-selected="true" in a single-select
  // listbox, which a screen reader announces as three selections and which no
  // axe rule can see. The tab stop was already matched by row for exactly this
  // reason; the selection was not, which is the kind of half-applied fix that
  // reads as deliberate until someone measures it.
  //
  // -1 when the page's pick is a swatch rather than a row here. Then NO row is
  // selected, which is the truth, and row 0 merely holds the tab stop so the
  // list stays reachable from the keyboard.
  // A swatch pick that happens to name a colour this list also holds still
  // highlights it — the first row is the honest answer there, because the
  // visitor did not choose between the duplicates.
  const litRow = selectedRow ?? pairs.findIndex((p) => p.colorId === selectedId)
  const focusRow = Math.max(0, litRow)

  // The headline number is how many DISTINCT colours serve these ideals, not
  // how many are a good match. Measured across all twelve seasons, only one
  // ideal of 142 has no close match — so "12 of 12 are a good match" is true
  // and sounds like a triumph, while hiding that 2 to 4 colours are each doing
  // the work of several. The crowding is the real limit of a 157-colour book.
  const distinct = new Set(pairs.map((p) => p.colorId)).size

  return (
    <section className="season-fit" aria-label={`How well the book covers ${sub.name}`}>
      {/* h2, not h4. The page ran h1 -> h4 -> h2, skipping two levels going down
          and then jumping back up, so a screen reader hears a sub-sub-section
          where a peer section is. This panel and "Combinations" ARE peers: two
          top-level things the page has to say about a palette. The audit never
          caught it because heading-order is one of axe's best-practice rules and
          a11y.spec.ts is scoped to WCAG 2.1 A/AA. */}
      <h2>What the book has for {sub.name}</h2>

      <div className="fit-pairs" role="listbox"
        aria-label={`The book's nearest match to each ${sub.name} ideal — pick one to start a palette from`}
        ref={list.ref} onKeyDown={list.onKeyDown}>
        {pairs.map((p, i) => (
          <button key={p.hue} type="button" role="option"
            className={`fit-pair fit-${p.band.replace(' ', '-')}`}
            aria-selected={i === litRow} {...list.itemProps(i === focusRow)}
            onClick={() => onSelect(p.colorId, i)}>
            <i className="fit-ideal" style={{ background: p.idealHex }}
              aria-hidden="true" />
            <span className="fit-arrow" aria-hidden="true">→</span>
            <i className="fit-actual" style={{ background: hexOf(p.colorId) }}
              aria-hidden="true" />
            <span className="fit-name">{nameOf(p.colorId)}</span>
            <span className="fit-band">{p.band}</span>
          </button>
        ))}
      </div>

      {/* Required, not decorative. The owner's instruction: be clear this is
          the closest match to the book's palette, so things will not map 100%. */}
      <p className="fit-caveat">
        One row per ideal {sub.name} colour, around the hue circle. Left is the
        ideal; right is the <b>nearest match in Wada's book</b>, and picking one
        starts a palette from it.
        {distinct < pairs.length
          ? <> These {pairs.length} ideals are served by just <b>{distinct} different
            colours</b> — where one appears twice, the book has nothing else near
            either ideal.</>
          : <> All {pairs.length} ideals get their own distinct colour.</>}
        {' '}These are the nearest matches in the book, <b>not exact season
        colours</b>: it was printed in 1933 for pigments, not for personal colour
        analysis.
      </p>
    </section>
  )
}
