import { groupMembers } from '../core/dataset'
import type { PartnerSuggestion } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'

export function SuggestionList({ suggestions, dispatch }:
  { suggestions: PartnerSuggestion[]; dispatch: (a: Action) => void }) {
  return (
    <div className="sugs">
      {suggestions.map((s) => (
        <button key={s.key} className="sug" onClick={() => dispatch({ type: 'addToPalette', key: s.key })}>
          <span className="cl">
            {groupMembers(dataset, s.key).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
          </span>
          <span className="meta">
            <span className="nm">{dataset.groupById.get(s.key)!.name}</span>
            <span className="sc">{s.bookVerified ? '★ book-verified' : 'pairs with all'}</span>
          </span>
          <span className="plus" aria-hidden="true">+</span>
        </button>
      ))}
    </div>
  )
}
