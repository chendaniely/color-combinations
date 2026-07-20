import { useReducer } from 'react'
import { AboutPanel } from './components/AboutPanel'
import { BrowseView } from './components/BrowseView'
import { ChordWheel } from './components/ChordWheel'
import { ColorDetail } from './components/ColorDetail'
import { CombinationDetail } from './components/CombinationDetail'
import { GroupDetail } from './components/GroupDetail'
import { Header } from './components/Header'
import { MatchPage } from './components/MatchPage'
import { RibbonDetail } from './components/RibbonDetail'
import { WheelControls } from './components/WheelControls'
import { initialState, reducer } from './core/state'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <div className="app">
      <Header state={state} dispatch={dispatch} />
      <main>
        {state.view === 'wheel' ? (
          <div className="wheel-view">
            <ChordWheel state={state} dispatch={dispatch} />
            <WheelControls state={state} dispatch={dispatch} />
          </div>
        ) : state.view === 'browse' ? (
          <BrowseView state={state} dispatch={dispatch} />
        ) : (
          <MatchPage state={state} dispatch={dispatch} />
        )}
        {state.selection?.kind === 'color' && <ColorDetail colorId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'combination' && <CombinationDetail comboId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'group' && <GroupDetail groupId={state.selection.id} dispatch={dispatch} />}
        {state.selection?.kind === 'ribbon' && (
          <RibbonDetail sel={state.selection} sizes={new Set(state.selection.sizes ?? state.sizes)} dispatch={dispatch} />
        )}
        {state.aboutOpen && <AboutPanel dispatch={dispatch} />}
      </main>
      <footer className="footer">
        <span className="hanko" title="iro — color">色</span>
      </footer>
    </div>
  )
}
