import { useState } from 'react'
import type { Action, AppState } from '../../core/state'
import { FaceCapture, type CaptureResult } from '../sample/FaceCapture'
import { ProbeReview } from '../sample/ProbeReview'
import { MatchedCombinations } from './MatchedCombinations'
import { PaletteTabs } from './PaletteTabs'
import { ReadingStrip } from './ReadingStrip'
import { YouDoorways } from './YouDoorways'

// The You tab: capture -> review -> the reading, both palettes, the
// combinations that suit you, and the doorways into Match and Browse.
export function YouView({ state, dispatch }: {
  state: AppState
  dispatch: (a: Action) => void
}) {
  const [capture, setCapture] = useState<CaptureResult | null>(null)
  const [capturing, setCapturing] = useState(false)
  // Whichever palette the visitor is currently LOOKING at — the combinations
  // below follow the tab, so switching to the season list re-ranks against it.
  const [visiblePalette, setVisiblePalette] = useState<ReadonlySet<number> | null>(null)
  // What Browse should call this palette in its chip — "Your colours" or the
  // season's name. Reported by PaletteTabs, which is the only place that knows.
  const [paletteLabel, setPaletteLabel] = useState('Your colours')
  const reading = state.you.reading
  // A shared link carries a season but never a reading — the owner's privacy
  // decision, enforced by tests/urlPrivacy.test.ts. So "somebody sent me this"
  // is a real state the tab has to render: the season's colours, with no
  // measurements of anyone, and an invitation to run it yourself.
  const sharedSeason = !reading && state.you.season !== null


  if (capturing && !capture) {
    return (
      <FaceCapture
        onCapture={setCapture}
        onClose={() => setCapturing(false)} />
    )
  }

  if (capture) {
    return (
      <ProbeReview
        capture={capture}
        onRetake={() => setCapture(null)}
        onConfirm={(r) => {
          dispatch({ type: 'setReading', reading: r })
          setCapture(null)
          setCapturing(false)
        }} />
    )
  }

  return (
    <div className="you-view">
      <header className="you-intro">
        <h1>{sharedSeason ? 'A season, shared with you' : 'Your colours'}</h1>
        <p>
          Photograph your face and we’ll measure three things about your
          colouring — whether you lean warm or cool, how deep your colouring is,
          and how much contrast there is between your skin and your hair. Hold
          something white next to your face and we can read the lighting too.
        </p>
        <p className="you-privacy">
          The photo never leaves your device and is thrown away as soon as it’s
          measured. Only the numbers below are kept, and only until you close
          the page.
        </p>
      </header>

      {reading && <ReadingStrip reading={reading} />}

      {(reading || sharedSeason) && (
        <PaletteTabs reading={reading} season={state.you.season} dispatch={dispatch}
          onPaletteChange={(ids, label) => { setVisiblePalette(ids); setPaletteLabel(label) }} />
      )}

      {visiblePalette && (
        <MatchedCombinations palette={visiblePalette} floor={state.you.floor}
          dispatch={dispatch} />
      )}

      {visiblePalette && (
        <YouDoorways palette={visiblePalette} floor={state.you.floor}
          label={paletteLabel} dispatch={dispatch} />
      )}

      <div className="you-actions">
        <button className="cam-btn primary" onClick={() => setCapturing(true)}>
          {reading ? 'Take another photo' : 'Take a photo'}
        </button>
        {reading && (
          <button className="cam-btn ghost" onClick={() => dispatch({ type: 'clearReading' })}>
            Clear
          </button>
        )}
      </div>

    </div>
  )
}
