import type { Action } from '../../core/state'
import { dataset } from '../../data'

// Carry the result into the rest of the site. The You tab is a doorway, not a
// destination — the point of knowing your colours is to go and use them.
//
// Both handoffs seed from the FIRST colour in the visitor's palette, because
// Match and Browse are both built around starting from one colour. Which one is
// arbitrary, but it must be one of theirs.
export function YouDoorways({ palette, dispatch }: {
  palette: ReadonlySet<number>
  dispatch: (a: Action) => void
}) {
  const first = dataset.data.colors.find((c) => palette.has(c.id))
  if (!first) return null

  return (
    <section className="you-doorways" aria-label="Take these colours further">
      <p>
        Your colours work anywhere on the site — take them into the palette
        builder, or browse every combination that uses one.
      </p>
      <div className="you-doorway-buttons">
        <button className="cam-btn primary"
          onClick={() => dispatch({ type: 'seedPalette', key: `c${first.id}`, level: 0 })}>
          → Build a palette in Match
        </button>
        <button className="cam-btn ghost"
          onClick={() => {
            dispatch({
              type: 'setBrowseFilter',
              browse: { family: '', shade: '', colorId: String(first.id) },
            })
            dispatch({ type: 'setView', view: 'browse' })
          }}>
          → Browse these in the book
        </button>
      </div>
    </section>
  )
}
