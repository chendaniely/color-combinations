import { groupMembers } from '../core/dataset'
import type { Action } from '../core/state'
import { Panel } from './Panel'
import { dataset } from '../data'

export function GroupDetail({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const g = dataset.groupById.get(groupId)!
  const members = groupMembers(dataset, groupId)
  return (
    <Panel title={g.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <p className="muted">{members.length} colors</p>
      <div className="swatch-grid">
        {members.map((c) => (
          <button key={c.id} className="swatch-cell" style={{ background: c.hex }} title={c.name}
            onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })} />
        ))}
      </div>
    </Panel>
  )
}
