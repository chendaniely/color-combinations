import { useReducer } from 'react'
import { Header } from './components/Header'
import { initialState, reducer } from './core/state'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <div className="app">
      <Header state={state} dispatch={dispatch} />
      <main>
        {state.view === 'wheel' ? <p style={{ padding: '2rem' }}>wheel goes here</p> : <p style={{ padding: '2rem' }}>browse goes here</p>}
      </main>
    </div>
  )
}
