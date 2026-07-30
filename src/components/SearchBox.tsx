import { useRef, useState } from 'react'
import { searchColors } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { ColorSampler } from './sample/ColorSampler'

export function SearchBox({ dispatch }: { dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [sampleOpen, setSampleOpen] = useState(false)
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
    else if (e.key === 'Escape') { e.stopPropagation(); setQ('') }
  }

  // ARIA 1.2 combobox-with-listbox. The input keeps focus throughout and
  // aria-activedescendant names the highlighted option, which is what lets a
  // screen reader announce arrow-key movement. Previously this had only
  // role=listbox/aria-selected on the results, so the whole type-ahead was
  // silent: nothing said a popup had appeared, nothing announced the highlight.
  const open = matches.length > 0
  const activeId = open ? `search-opt-${matches[active].id}` : undefined

  return (
    <div className="search-box">
      <input ref={inputRef} value={q} placeholder="Find a color…"
        aria-label="Search colors"
        role="combobox" aria-expanded={open} aria-controls="search-results"
        aria-autocomplete="list" aria-activedescendant={activeId}
        onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown}
        onBlur={() => { setTimeout(() => setQ(''), 150) }} />
      {/* A CAMERA, and a visible label.
          It was a pencil, which means "edit" — contradicting its own accessible
          name, "Sample a color from a photo or hex". Owner: "i think people will
          better grivitate to a camera knowing it's for a picture."
          The label matters more than the glyph: a bare icon is undiscoverable
          whichever one it is, and this button opens three things, of which the
          camera is only one. With the words there, the camera reads as a hint at
          the most eye-catching option rather than a promise the menu breaks. */}
      <button type="button" className="search-sample" aria-label="Sample a color from a photo, camera or hex"
        onClick={() => setSampleOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 8.5h3.2l1.4-2.2h8.8l1.4 2.2H21v10.5H3z" />
          <circle cx="12" cy="13.4" r="3.4" />
        </svg>
        <span className="search-sample-tx">Sample</span>
      </button>
      {/* Rendered unconditionally so aria-controls always resolves to a real
          element; empty until there is something to show. */}
      <ul className="search-results" role="listbox" id="search-results"
        aria-label="Matching colors" hidden={!open}>
        {matches.map((c, i) => (
          // The option IS the row. It used to wrap a <button>, which is invalid
          // here — an interactive child inside role=option is not reliably
          // reachable, and the button stole a tab stop from a widget whose
          // whole point is that the input never loses focus.
          <li key={c.id} id={`search-opt-${c.id}`} role="option"
            aria-selected={i === active}
            onMouseDown={() => choose(c.id)}
            onMouseEnter={() => setActive(i)}>
            <span className="search-swatch" style={{ background: c.hex }} />
            {c.name}
          </li>
        ))}
      </ul>
      {sampleOpen && <ColorSampler dispatch={dispatch} onClose={() => setSampleOpen(false)} />}
    </div>
  )
}
