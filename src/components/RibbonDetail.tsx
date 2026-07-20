import { combosForPair, wheelNodes } from '../core/chord'
import type { Action, Selection } from '../core/state'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { dataset } from '../data'

export function RibbonDetail({ sel, sizes, dispatch }:
  { sel: Extract<Selection, { kind: 'ribbon' }>; sizes: Set<2 | 3 | 4>; dispatch: (a: Action) => void }) {
  const nodes = wheelNodes(dataset, sel.level)
  const labelOf = (key: string) => nodes.find((n) => n.key === key)?.label ?? key
  const combos = combosForPair(dataset, sel.level, sel.keyA, sel.keyB, sizes)
  const title = sel.keyA === sel.keyB
    ? `Within ${labelOf(sel.keyA)}`
    : `${labelOf(sel.keyA)} × ${labelOf(sel.keyB)}`
  return (
    <Panel title={title} onClose={() => dispatch({ type: 'closePanel' })}>
      <p className="muted">{combos.length} combination{combos.length === 1 ? '' : 's'} in the book</p>
      <div className="plate-list">
        {combos.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
      </div>
    </Panel>
  )
}
