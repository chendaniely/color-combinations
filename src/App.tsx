import { useMemo, useReducer } from 'react'
import { AboutPanel } from './components/AboutPanel'
import { AccessibilityGoggles } from './components/AccessibilityGoggles'
import { BrowseView } from './components/BrowseView'
import { ChordWheel } from './components/ChordWheel'
import { ColorDetail } from './components/ColorDetail'
import { CombinationDetail } from './components/CombinationDetail'
import { GroupDetail } from './components/GroupDetail'
import { Header } from './components/Header'
import { MatchPage } from './components/MatchPage'
import { RibbonDetail } from './components/RibbonDetail'
import { SiteMark } from './components/SiteMark'
import { WheelControls } from './components/WheelControls'
import { YouView } from './components/you/YouView'
import { reducer } from './core/state'
import { allowedFor } from './data'
import { initialStateFromUrl, useUrlSync } from './urlSync'

export default function App() {
  // Seeded from the address bar, so a shared link renders the right screen on
  // the first paint rather than flashing the default one first.
  const [state, dispatch] = useReducer(reducer, undefined, initialStateFromUrl)
  useUrlSync(state, dispatch)
  const allowed = useMemo(() => allowedFor(state.access), [state.access])
  return (
    <div className="app">
      <Header state={state} dispatch={dispatch} />
      <main>
        <AccessibilityGoggles state={state} dispatch={dispatch} />
        {state.view === 'wheel' ? (
          <div className="wheel-view">
            <ChordWheel state={state} dispatch={dispatch} />
            <WheelControls state={state} dispatch={dispatch} />
          </div>
        ) : state.view === 'browse' ? (
          <BrowseView state={state} dispatch={dispatch} />
        ) : state.view === 'you' ? (
          <YouView state={state} dispatch={dispatch} />
        ) : (
          <MatchPage state={state} dispatch={dispatch} />
        )}
        {state.selection?.kind === 'color' && <ColorDetail colorId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'combination' && <CombinationDetail comboId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'group' && <GroupDetail groupId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'ribbon' && (
          <RibbonDetail sel={state.selection} sizes={new Set(state.selection.sizes ?? state.sizes)} allowed={allowed} dispatch={dispatch} />
        )}
        {state.aboutOpen && <AboutPanel dispatch={dispatch} />}
      </main>
      <SiteMark />
    </div>
  )
}
