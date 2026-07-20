import { groupMembers } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

function Cluster({ groupId }: { groupId: string }) {
  return (
    <span className="cl">
      {groupMembers(dataset, groupId).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
    </span>
  )
}

export function PaletteTray({ keys, dispatch }: { keys: string[]; dispatch: (a: Action) => void }) {
  return (
    <div className="tray">
      <div className="lab">Your palette · {keys.length} shade{keys.length === 1 ? '' : 's'}</div>
      <div className="chips">
        {keys.map((k) => (
          <div key={k} className="chip">
            <Cluster groupId={k} />
            <div className="row">
              <span className="nm">{dataset.groupById.get(k)!.name}</span>
              <button className="x" aria-label={`Remove ${dataset.groupById.get(k)!.name}`}
                onClick={() => dispatch({ type: 'removeFromPalette', key: k })}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
