import { useState } from 'react'
import type { Action, AppState } from '../../core/state'
import { FaceCapture, type CaptureResult } from '../sample/FaceCapture'
import { ProbeReview } from '../sample/ProbeReview'
import { ReadingStrip } from './ReadingStrip'

// The You tab. Stage 1: capture -> review -> the reading. The two palettes and
// the ranked combinations arrive in stage 2 (see the spec).
export function YouView({ state, dispatch }: {
  state: AppState
  dispatch: (a: Action) => void
}) {
  const [capture, setCapture] = useState<CaptureResult | null>(null)
  const [capturing, setCapturing] = useState(false)
  const reading = state.you.reading

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
        <h1>Your colours</h1>
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

      {reading && (
        <p className="you-next">
          Next: your palettes and the combinations that suit you.
        </p>
      )}
    </div>
  )
}
