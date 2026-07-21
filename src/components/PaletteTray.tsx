import { keyName, keySwatches } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

function Swatches({ hexes }: { hexes: string[] }) {
  return (
    <span className="cl">
      {hexes.map((h, i) => <span key={i} style={{ background: h }} />)}
    </span>
  )
}

export function PaletteTray({ keys, dispatch }: { keys: string[]; dispatch: (a: Action) => void }) {
  return (
    <div className="tray">
      <div className="lab">
        Your palette · {keys.length} item{keys.length === 1 ? '' : 's'}
        <button className="tray-clear" onClick={() => dispatch({ type: 'clearPalette' })}>Start over</button>
      </div>
      <div className="chips">
        {keys.map((k) => (
          <div key={k} className="chip">
            <Swatches hexes={keySwatches(dataset, k)} />
            <div className="row">
              <span className="nm">{keyName(dataset, k)}</span>
              <button className="x" aria-label={`Remove ${keyName(dataset, k)}`}
                onClick={() => dispatch({ type: 'removeFromPalette', key: k })}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
