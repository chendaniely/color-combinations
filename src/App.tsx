import { useReducer } from 'react'
import { ChordWheel } from './components/ChordWheel'
import { Header } from './components/Header'
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
        ) : (
          <p style={{ padding: '2rem' }}>browse goes here</p>
        )}
      </main>
    </div>
  )
}
