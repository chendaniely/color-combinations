import { readableTextOn } from '../core/colorMath'
import type { Action } from '../core/state'
import { dataset } from '../data'

const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7] // decorative, not from the book

export function PlateCard({ comboId, dispatch, large = false, outsiders }:
  {
    comboId: number
    dispatch?: (a: Action) => void
    large?: boolean
    // Colour ids that fall OUTSIDE the visitor's personal palette. Marked so
    // the You tab can show which accent in a combination isn't theirs; unused
    // everywhere else, where every colour is equally relevant.
    outsiders?: readonly number[]
  }) {
  const combo = dataset.comboById.get(comboId)!
  const colors = combo.colorIds.map((id) => dataset.colorById.get(id)!)
  const total = TAPER.slice(0, colors.length).reduce((a, b) => a + b, 0)
  const isOutsider = (id: number) => outsiders?.includes(id) ?? false
  const inner = (
    <figure className={large ? 'plate plate-large' : 'plate'}>
      <div className="plate-bars">
        {colors.map((c, i) => (
          <div key={c.id} style={{ background: c.hex, flexGrow: TAPER[i] / total }}
            className={`plate-bar text-${readableTextOn(c.hex)}${isOutsider(c.id) ? ' is-outsider' : ''}`}
            title={isOutsider(c.id) ? `${c.name} — not in your palette` : c.name} />
        ))}
      </div>
      <figcaption>
        <span className="plate-number">No. {combo.id}</span>
        <span className="plate-names">{colors.map((c) => c.name).join(' · ')}</span>
      </figcaption>
    </figure>
  )
  if (!dispatch) return inner
  return (
    <button className="plate-button"
      onClick={() => dispatch({ type: 'select', selection: { kind: 'combination', id: comboId } })}>
      {inner}
    </button>
  )
}
