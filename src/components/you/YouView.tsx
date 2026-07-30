import { useCallback, useEffect, useState } from 'react'
import type { Action, AppState } from '../../core/state'
import { FaceCapture, type CaptureResult } from '../sample/FaceCapture'
import { ProbeReview } from '../sample/ProbeReview'
import { MatchedCombinations } from './MatchedCombinations'
import { PaletteTabs } from './PaletteTabs'
import { ReadingStrip } from './ReadingStrip'
import { YouDoorways } from './YouDoorways'
import { registerOverlay } from '../../overlayHistory'

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
  // Which swatch the visitor picked, for "Start a palette from ...".
  const [selectedColorId, setSelectedColorId] = useState<number | undefined>(undefined)
  // The task-level dismiss for the capture flow, for the same reason
  // ColorSampler has one: ProbeReview's own close steps BACK to FaceCapture, so
  // Back would walk the flow in reverse a screen at a time instead of leaving
  // it. Registered only while a capture screen is up, so it adds nothing to the
  // count on the ordinary tab.
  const capturingNow = capturing || capture !== null
  useEffect(() => {
    if (!capturingNow) return
    return registerOverlay(() => { setCapture(null); setCapturing(false) })
  }, [capturingNow])

  // useCallback, and it is a PERFORMANCE FIX rather than tidiness.
  //
  // PaletteTabs lists this in an effect's deps and calls it with a freshly
  // built Set. An inline arrow here therefore closed the loop: new callback ->
  // effect re-runs -> setVisiblePalette with a new Set identity -> re-render ->
  // new callback. Measured with CDP over a 3s idle window on the built site:
  // the You tab burned 2.99s of script time (a full core, indefinitely) against
  // 0.000s on every other tab, re-ranking all 338 combinations each pass.
  // (idleCpu.spec.ts guards it over 2s, which is the same fault at a different
  // sample length — the numbers here are the diagnosis, not the threshold.) It is
  // silent in production — React only names it in dev — so no console test
  // could ever have caught it. Wrapping this brought the same measurement to
  // 0.000s with nothing else changed.
  const onPaletteChange = useCallback((ids: ReadonlySet<number>, label: string) => {
    setVisiblePalette(ids)
    setPaletteLabel(label)
  }, [])

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

      {/* THE ENTRY POINT, and therefore at the top.
          It used to sit last, under the palettes and the combination grid. That
          reads fine on an empty tab — where there is nothing else — and badly in
          every other state: a season arriving from a shared link, or a reading
          from earlier in the session, fills the page with fifty swatches and a
          grid of plates, and the one thing a first-time visitor needs is several
          screens below all of it. Owner, 2026-07-30: "the photo button on the
          bottom gets lost. we need the photo up at the top so it's a clear entry
          point."
          Deliberately NOT duplicated at the bottom the way the doorways are:
          the bottom of this page already ends in two buttons, and a third pair
          competing with them makes the ending less clear, not more. */}
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

      {reading && <ReadingStrip reading={reading} />}

      {/* Everything downstream of the reading, wrapped so the doorway bar has a
          region to be sticky WITHIN. It pins to the top of the viewport for as
          long as there is palette or combination left to scroll, then releases
          with the rest of this block — a bar that outstayed its subject would
          just be a second header. */}
      {(reading || sharedSeason) && (
        <div className="you-result">
          {visiblePalette && (
            <YouDoorways palette={visiblePalette} floor={state.you.floor}
              label={paletteLabel} selectedId={selectedColorId} dispatch={dispatch} />
          )}

          <PaletteTabs reading={reading} season={state.you.season} dispatch={dispatch}
            onPaletteChange={onPaletteChange}
            onSelectColor={setSelectedColorId} />

          {visiblePalette && (
            <MatchedCombinations palette={visiblePalette} floor={state.you.floor}
              dispatch={dispatch} />
          )}
        </div>
      )}
    </div>
  )
}
