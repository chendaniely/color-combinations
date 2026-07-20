import { useState } from 'react'
import { groupMembers } from '../core/dataset'
import type { Action, MatchLevel } from '../core/state'
import { dataset } from '../data'

export function ShadePicker({ level, dispatch }: { level: MatchLevel; dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const groups = level === 1 ? dataset.data.groups.fine : dataset.data.groups.broad
  const needle = q.trim().toLowerCase()
  const matches = groups.filter((g) => g.name.toLowerCase().includes(needle))
  return (
    <div className="picker">
      <p className="lede">Pick a shade you already have to start:</p>
      <input className="picker-input" value={q} placeholder="search shades… (olive, teal)"
        aria-label="Search shades" onChange={(e) => setQ(e.target.value)} />
      <div className="sugs">
        {matches.map((g) => (
          <button key={g.id} className="sug" onClick={() => dispatch({ type: 'seedPalette', key: g.id, level })}>
            <span className="cl">
              {groupMembers(dataset, g.id).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
            </span>
            <span className="meta"><span className="nm">{g.name}</span></span>
          </button>
        ))}
      </div>
    </div>
  )
}
