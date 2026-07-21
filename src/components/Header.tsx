import type { Action, AppState } from '../core/state'
import { dataset } from '../data'
import { displayableCombinations } from '../core/dataset'
import { AccessibilityGoggles } from './AccessibilityGoggles'
import { SearchBox } from './SearchBox'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function Header({ state, dispatch }: Props) {
  function surprise() {
    const combos = displayableCombinations(dataset)
    const pick = combos[Math.floor(Math.random() * combos.length)]
    dispatch({ type: 'select', selection: { kind: 'combination', id: pick.id } })
  }
  function goHome() {
    if (state.selection) dispatch({ type: 'closePanel' })
    if (state.aboutOpen) dispatch({ type: 'toggleAbout' })
    dispatch({ type: 'setView', view: 'wheel' })
  }
  return (
    <header className="header">
      <button type="button" className="wordmark" onClick={goHome} title="Go to the color wheel">
        Iro <span className="seal">色</span>
        <small>A Dictionary of Color Combinations</small>
      </button>
      <nav className="nav">
        <SearchBox dispatch={dispatch} />
        <button aria-pressed={state.view === 'wheel'} onClick={() => dispatch({ type: 'setView', view: 'wheel' })}>Wheel</button>
        <button aria-pressed={state.view === 'match'} onClick={() => dispatch({ type: 'setView', view: 'match' })}>Match</button>
        <button aria-pressed={state.view === 'browse'} onClick={() => dispatch({ type: 'setView', view: 'browse' })}>Browse</button>
        <button aria-pressed={state.aboutOpen} onClick={() => dispatch({ type: 'toggleAbout' })}>About</button>
        <button className="surprise" onClick={surprise}>Surprise me</button>
        <AccessibilityGoggles state={state} dispatch={dispatch} />
      </nav>
    </header>
  )
}
