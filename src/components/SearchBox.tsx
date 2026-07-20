import { useRef, useState } from 'react'
import { searchColors } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

export function SearchBox({ dispatch }: { dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = searchColors(dataset, q).slice(0, 8)

  function choose(id: number) {
    dispatch({ type: 'select', selection: { kind: 'color', id } })
    setQ('')
    inputRef.current?.blur()
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && matches[active]) choose(matches[active].id)
    else if (e.key === 'Escape') setQ('')
  }

  return (
    <div className="search-box">
      <input ref={inputRef} value={q} placeholder="find a color… (navy, olive)"
        aria-label="Search colors"
        onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown}
        onBlur={() => { setTimeout(() => setQ(''), 150) }} />
      {matches.length > 0 && (
        <ul className="search-results" role="listbox">
          {matches.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button onMouseDown={() => choose(c.id)}>
                <span className="search-swatch" style={{ background: c.hex }} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
