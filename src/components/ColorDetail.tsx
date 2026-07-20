import { combinationsForColor } from '../core/dataset'
import type { Action } from '../core/state'
import { CopyField } from './CopyField'
import { Panel } from './Panel'
import { PlateCard } from './PlateCard'
import { dataset } from '../data'

export function ColorDetail({ colorId, dispatch }: { colorId: number; dispatch: (a: Action) => void }) {
  const c = dataset.colorById.get(colorId)!
  const fine = dataset.groupById.get(c.fineId)!
  const broad = dataset.groupById.get(fine.parentId!)!
  const sup = dataset.groupById.get(broad.parentId!)!
  const combos = combinationsForColor(dataset, colorId)
  return (
    <Panel title={c.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <div className="swatch-hero" style={{ background: c.hex }} />
      <p className="family-chain">
        {fine.name} · <button className="linklike" onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: broad.id } })}>{broad.name}</button> · {sup.name}
      </p>
      <CopyField label="HEX" value={c.hex} />
      <CopyField label="RGB" value={c.rgb.join(', ')} />
      <CopyField label="CMYK" value={c.cmyk.join(', ')} />
      {combos.length === 0
        ? <p className="empty-note">Appears in no combinations in the book — a wallflower.</p>
        : <>
            <h3>In {combos.length} combination{combos.length > 1 ? 's' : ''}</h3>
            <div className="plate-list">
              {combos.map((combo) => <PlateCard key={combo.id} comboId={combo.id} dispatch={dispatch} />)}
            </div>
          </>}
    </Panel>
  )
}
