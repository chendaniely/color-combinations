import { groupMembers } from '../core/dataset'
import { breadcrumbOf, childGroupsOf, levelOfGroupKey } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { GroupMatches } from './GroupMatches'
import { Panel } from './Panel'

export function GroupDetail({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const g = dataset.groupById.get(groupId)!
  const level = levelOfGroupKey(dataset, groupId)
  const crumbs = breadcrumbOf(dataset, groupId)
  const children = childGroupsOf(dataset, groupId)
  const members = groupMembers(dataset, groupId)
  return (
    <Panel title={g.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <nav className="crumb" aria-label="Group hierarchy">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="sep">›</span>}
            {c.id === groupId
              ? <span className="here">{c.name}</span>
              : <button className="linklike"
                  onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: c.id } })}>{c.name}</button>}
          </span>
        ))}
      </nav>

      <GroupMatches groupId={groupId} dispatch={dispatch} />

      {(level === 1 || level === 2) && (
        <button className="bridge"
          onClick={() => dispatch({ type: 'seedPalette', key: groupId, level: level as 1 | 2 })}>
          Build a palette from this →
        </button>
      )}

      {children.length > 0 ? (
        <>
          <h3>Narrow to a shade</h3>
          <div className="partner-list">
            {children.map((ch) => (
              <button key={ch.id} className="partner"
                onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: ch.id } })}>
                <span className="cl">
                  {groupMembers(dataset, ch.id).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
                </span>
                <span className="nm">{ch.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3>Narrow to a single color</h3>
          <div className="swatch-grid">
            {members.map((c) => (
              <button key={c.id} className="swatch-cell" style={{ background: c.hex }} title={c.name} aria-label={c.name}
                onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })} />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
