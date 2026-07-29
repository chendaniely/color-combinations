import { useEffect, useRef, useState } from 'react'
import { readSkin } from '../../color/skinMetrics'
import {
  CONTROL_LIMIT, controlsToWhiteRef, NEUTRAL, whiteBalance, whiteBalanceTable,
  whiteRefToControls, type WhiteBalanceControls,
} from '../../color/whiteBalance'
import { rgbToHex, type RGB } from '../../core/colorMath'
import type { ProbeKind } from '../../core/facePlan'
import { medianColor, robustColor, samplesInPatch } from '../../core/robustSample'
import type { SkinReading } from '../../core/types'
import { canvasPointAt, PATCH_RADIUS } from '../camera/sampleCanvas'
import { Overlay } from '../Overlay'
import type { CaptureResult } from './FaceCapture'

const SKIN_KINDS: ProbeKind[] = ['forehead', 'leftCheek', 'rightCheek', 'jaw']

type Correcting = 'skin' | 'hair' | 'white' | null

// A sample and where it came from. Keeping the position alongside the colour is
// what lets a marker follow a correction — without it the dots would go stale
// the moment the visitor touched one, which is exactly the class of bug that
// made the first version of this screen untrustworthy.
interface Mark { rgb: RGB; cx: number; cy: number }

// The trust step, and it is deliberately not skippable: we show every colour we
// took, where we took it from, and let the visitor overrule any of it. Without
// this the feature is a black box that tells people what suits them from
// numbers they never saw.
//
// NOTE: this file is scanned by tests/sample-privacy.test.ts.
export function ProbeReview({ capture, onConfirm, onRetake }: {
  capture: CaptureResult
  onConfirm: (reading: SkinReading) => void
  onRetake: () => void
}) {
  const displayRef = useRef<HTMLCanvasElement>(null)
  const [skinMarks, setSkinMarks] = useState<Mark[]>(() =>
    capture.probes
      .filter((p) => SKIN_KINDS.includes(p.kind))
      .map((p) => ({ rgb: p.rgb, cx: p.cx, cy: p.cy })))
  const [hairMark, setHairMark] = useState<Mark | null>(() => {
    const h = capture.probes.find((p) => p.kind === 'hair')
    return h ? { rgb: h.rgb, cx: h.cx, cy: h.cy } : null
  })
  const [whiteMark, setWhiteMark] = useState<Mark | null>(
    capture.whiteRef
      ? { rgb: capture.whiteRef.rgb, cx: capture.whiteRef.cx, cy: capture.whiteRef.cy }
      : null)
  // The correction itself. Eyedropping a white object SETS these; the sliders
  // then nudge them — the pairing every photo editor uses, because one tap on a
  // white object is a guess you want to be able to refine. null = no correction.
  const [controls, setControls] = useState<WhiteBalanceControls | null>(
    capture.whiteRef ? whiteRefToControls(capture.whiteRef.rgb) : null)
  const [correcting, setCorrecting] = useState<Correcting>(null)

  const skin = medianColor(skinMarks.map((m) => m.rgb))
  const hair = hairMark?.rgb ?? null
  // One source of truth: whatever the sliders say, expressed as the white
  // reference the rest of the pipeline already understands.
  const whiteRef = controls ? controlsToWhiteRef(controls) : null

  // Paint the photo into our OWN canvas, white-balanced, so the visitor can see
  // the correction working on the whole frame rather than trusting a number.
  //
  // capture.canvas is never mounted and never modified — it stays the untouched
  // source of truth. Correcting it in place would mean a later tap sampled
  // already-corrected pixels and corrected them twice.
  useEffect(() => {
    const display = displayRef.current
    const source = capture.canvas.getContext('2d')
    const target = display?.getContext('2d')
    if (!display || !source || !target) return
    const { width, height } = capture.canvas
    const frame = source.getImageData(0, 0, width, height)
    if (whiteRef) {
      // Per-channel lookup: identical to whiteBalance(), minus ~4 million
      // Math.pow calls on a full-size photo.
      const [tr, tg, tb] = whiteBalanceTable(whiteRef)
      const d = frame.data
      for (let i = 0; i < d.length; i += 4) {
        d[i] = tr[d[i]]; d[i + 1] = tg[d[i + 1]]; d[i + 2] = tb[d[i + 2]]
      }
    }
    target.putImageData(frame, 0, 0)
  }, [capture.canvas, whiteRef])

  function correctAt(e: React.PointerEvent<HTMLDivElement>) {
    if (!correcting) return
    const display = displayRef.current
    const source = capture.canvas.getContext('2d')
    if (!display || !source) return
    // Geometry from the canvas that is actually on screen; PIXELS from the
    // untouched original, so a tap is never read through the correction.
    const point = canvasPointAt(display, e.clientX, e.clientY, 'contain')
    if (!point) return
    const { width, height } = capture.canvas
    const frame = source.getImageData(0, 0, width, height)
    const rgb = robustColor(samplesInPatch(frame.data, width, height, point.x, point.y, PATCH_RADIUS))
    if (!rgb) return
    const mark: Mark = { rgb, cx: point.x, cy: point.y }
    // A corrected skin reading replaces the automatic set: the visitor pointing
    // at one spot is a stronger signal than four guesses averaged together.
    if (correcting === 'skin') {
      setSkinMarks([mark])
    } else if (correcting === 'hair') {
      setHairMark(mark)
    } else {
      // The eyedropper sets the sliders, exactly as it does in photo software.
      setWhiteMark(mark)
      setControls(whiteRefToControls(rgb))
    }
    setCorrecting(null)
  }

  function confirm() {
    if (!skin) return
    onConfirm(readSkin(skin, hair, whiteRef))
  }

  function dot(kind: 'skin' | 'hair' | 'white', mark: Mark, key: string) {
    return (
      <span key={key} className={`probe-dot is-${kind}`} aria-hidden="true"
        style={{
          left: `${(mark.cx / capture.canvas.width) * 100}%`,
          top: `${(mark.cy / capture.canvas.height) * 100}%`,
        }}>
        {/* Labelled so a probe in the wrong zone is obvious on sight — this is
            how the "hair" probe was caught sitting on a forehead. */}
        <b>{kind}</b>
      </span>
    )
  }

  const swatch = (label: string, rgb: RGB | null, note: string) => (
    <div className="probe-read">
      <i className="probe-chip" style={{ background: rgb ? rgbToHex(rgb) : 'transparent' }} />
      <div>
        <b>{label}</b>
        <small>{rgb ? rgbToHex(rgb) : note}</small>
      </div>
    </div>
  )

  // No × button: the way out of this screen is Retake or Continue, both
  // rendered below. Escape maps to Retake — the same "back", not a silent
  // discard of a capture the visitor has just spent time correcting.
  return (
    <Overlay label="Check what we read" className="probe-review"
      onClose={onRetake} closeLabel={null}>
      <p className="cam-steps">
        {capture.faceFound
          ? <><b>Check this is right.</b> These are the colours we measured, and
            the spots we took them from. Tap a correction below if any look wrong.</>
          : <><b>We couldn’t find a face in that photo.</b> No problem — tap your
            cheek and your hair yourself using the buttons below.</>}
      </p>

      {/* The stage takes the photo's own aspect ratio, so a mark's source
          fraction is exactly its percentage position and the dots land on the
          pixels that were actually sampled. */}
      <div className="probe-stage" onPointerDown={correctAt}
        style={{ aspectRatio: `${capture.canvas.width} / ${capture.canvas.height}` }}>
        <canvas ref={displayRef} className="probe-canvas"
          width={capture.canvas.width} height={capture.canvas.height} />
        {skinMarks.map((m, i) => dot('skin', m, `skin-${i}`))}
        {hairMark && dot('hair', hairMark, 'hair')}
        {whiteMark && dot('white', whiteMark, 'white')}
      </div>

      {/* Always rendered, so turning correction on and off cannot reflow the
          page under the visitor's finger while they are aiming at it. */}
      <p className="probe-hint" role="status" aria-live="polite">
        {correcting
          ? <>Tap your {correcting === 'white' ? 'white object' : correcting} in the photo.</>
          : ' '}
      </p>

      <div className="probe-reads">
        {/* Corrected, so they match the photo above and move when the white
            reference changes — that is how the visitor can tell the balance is
            working, rather than being asked to take it on trust. */}
        {swatch('Skin', skin && whiteBalance(skin, whiteRef), 'tap your cheek')}
        {swatch('Hair', hair && whiteBalance(hair, whiteRef), 'no hair visible')}
        {/* The white swatch stays UNcorrected: it is the cast being removed, and
            showing it post-correction would just be a grey square every time. */}
        {swatch('White', whiteRef, 'none — rough reading')}
      </div>
      {whiteRef && (
        <p className="probe-note">
          The photo above is corrected using that white. If it now looks like
          the room you were in, the balance is right — if it has gone orange or
          blue, tap <b>Correct the white</b> and pick something properly white.
        </p>
      )}

      {/* Nudge the correction by hand. The eyedropper above sets these; these
          refine it — the same division of labour as a photo editor, and the
          only way to fix a cast when nothing in the frame is truly white. */}
      <div className="probe-wb">
        <div className="probe-wb-head">
          <b>White balance</b>
          <button type="button" className="probe-wb-reset"
            onClick={() => { setControls(null); setWhiteMark(null) }}>
            Reset
          </button>
        </div>
        <label className="probe-slider">
          <span>Temperature</span>
          <input type="range" min={-CONTROL_LIMIT} max={CONTROL_LIMIT} step={0.01}
            value={controls?.temp ?? 0}
            aria-label="Temperature, blue to amber"
            onChange={(e) => setControls({
              ...(controls ?? NEUTRAL), temp: Number(e.target.value),
            })} />
          <small>blue — amber</small>
        </label>
        <label className="probe-slider">
          <span>Tint</span>
          <input type="range" min={-CONTROL_LIMIT} max={CONTROL_LIMIT} step={0.01}
            value={controls?.tint ?? 0}
            aria-label="Tint, green to magenta"
            onChange={(e) => setControls({
              ...(controls ?? NEUTRAL), tint: Number(e.target.value),
            })} />
          <small>green — magenta</small>
        </label>
      </div>

      <div className="probe-fixes">
        <button type="button" onClick={() => setCorrecting('skin')}>Correct the skin</button>
        <button type="button" onClick={() => setCorrecting('hair')}>Correct the hair</button>
        <button type="button" onClick={() => setCorrecting('white')}>Correct the white</button>
        <button type="button"
          onClick={() => { setWhiteMark(null); setControls(null) }}>
          There’s nothing white in this shot
        </button>
      </div>

      {!whiteRef && (
        <p className="probe-note">
          Without something white we can’t be sure of the lighting, so your
          undertone — warm or cool — is a guess. Everything else still holds.
        </p>
      )}
      {!hair && (
        <p className="probe-note">
          No hair visible, so the contrast reading is weaker than usual.
        </p>
      )}

      <div className="cam-controls">
        <button className="cam-btn ghost" onClick={onRetake}>Retake</button>
        <button className="cam-btn primary" onClick={confirm} disabled={!skin}>Continue</button>
      </div>

      <p className="cam-privacy">
        Your photo stays on this device — only these few numbers go any further.
      </p>
    </Overlay>
  )
}
