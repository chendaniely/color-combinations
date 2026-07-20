import { groupMembers } from '../core/dataset'
import { combosForSet, levelOfGroupKey, suggestPartners } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { PlateCard } from './PlateCard'

const ALL_SIZES = new Set<2 | 3 | 4>([2, 3, 4])

export function GroupMatches({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const level = levelOfGroupKey(dataset, groupId)
  const partners = suggestPartners(dataset, level, [groupId], ALL_SIZES).slice(0, 6)
  const palettes = combosForSet(dataset, level, [groupId], ALL_SIZES).slice(0, 4)
  return (
    <>
      <h3>Pairs well with</h3>
      <div className="partner-list">
        {partners.map((p) => (
          <button key={p.key} className="partner"
            onClick={() => dispatch({
              type: 'select',
              selection: { kind: 'ribbon', level, keyA: groupId, keyB: p.key, sizes: [2, 3, 4] },
            })}>
            <span className="cl">
              {groupMembers(dataset, p.key).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
            </span>
            <span className="nm">{dataset.groupById.get(p.key)!.name}</span>
            <span className="ct">{p.score}</span>
          </button>
        ))}
      </div>
      {palettes.length > 0 && (
        <>
          <h3>Palettes with a {dataset.groupById.get(groupId)!.name.toLowerCase()} color</h3>
          <div className="plate-list">
            {palettes.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
          </div>
        </>
      )}
    </>
  )
}
