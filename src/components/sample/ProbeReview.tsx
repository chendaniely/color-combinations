import { useEffect, useRef, useState } from 'react'
import { readSkin } from '../../color/skinMetrics'
import { rgbToHex, type RGB } from '../../core/colorMath'
import type { ProbeKind } from '../../core/facePlan'
import { medianColor } from '../../core/robustSample'
import type { SkinReading } from '../../core/types'
import { canvasPointAt, sampleCanvasAt } from '../camera/sampleCanvas'
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
  const stageRef = useRef<HTMLDivElement>(null)
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
  const [correcting, setCorrecting] = useState<Correcting>(null)

  const skin = medianColor(skinMarks.map((m) => m.rgb))
  const hair = hairMark?.rgb ?? null
  const whiteRef = whiteMark?.rgb ?? null

  // Show the captured frame. The canvas came from FaceCapture; we mount it
  // rather than copy it, so no second copy of the photograph exists.
  //
  // Two things this must undo, both found the hard way: FaceCapture's camera
  // path leaves `display: none` on the element, which would travel with it and
  // hide the photo entirely; and .cam-canvas is object-fit: cover, which crops
  // the frame — often cropping away the very white object the visitor is being
  // asked to confirm. Here the whole frame is shown, contained.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    capture.canvas.className = 'probe-canvas'
    capture.canvas.style.display = 'block'
    stage.prepend(capture.canvas)
    return () => { capture.canvas.remove() }
  }, [capture.canvas])

  function correctAt(e: React.PointerEvent<HTMLDivElement>) {
    if (!correcting) return
    // 'contain' to match how the canvas is laid out above — inverting a cover
    // transform here would sample the wrong pixels and misplace the marker.
    const point = canvasPointAt(capture.canvas, e.clientX, e.clientY, 'contain')
    const rgb = sampleCanvasAt(capture.canvas, e.clientX, e.clientY, undefined, 'contain')
    if (!point || !rgb) return
    const mark: Mark = { rgb, cx: point.x, cy: point.y }
    // A corrected skin reading replaces the automatic set: the visitor pointing
    // at one spot is a stronger signal than four guesses averaged together.
    if (correcting === 'skin') setSkinMarks([mark])
    else if (correcting === 'hair') setHairMark(mark)
    else setWhiteMark(mark)
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

  return (
    <div className="cam-overlay probe-review" role="dialog" aria-label="Check what we read">
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
      <div ref={stageRef} className="probe-stage" onPointerDown={correctAt}
        style={{ aspectRatio: `${capture.canvas.width} / ${capture.canvas.height}` }}>
        {skinMarks.map((m, i) => dot('skin', m, `skin-${i}`))}
        {hairMark && dot('hair', hairMark, 'hair')}
        {whiteMark && dot('white', whiteMark, 'white')}
      </div>

      {correcting && (
        <p className="cam-steps" role="status">
          Tap your {correcting === 'white' ? 'white object' : correcting} in the photo.
        </p>
      )}

      <div className="probe-reads">
        {swatch('Skin', skin, 'tap your cheek')}
        {swatch('Hair', hair, 'no hair visible')}
        {swatch('White', whiteRef, 'none — rough reading')}
      </div>

      <div className="probe-fixes">
        <button type="button" onClick={() => setCorrecting('skin')}>Correct the skin</button>
        <button type="button" onClick={() => setCorrecting('hair')}>Correct the hair</button>
        <button type="button" onClick={() => setCorrecting('white')}>Correct the white</button>
        <button type="button" onClick={() => setWhiteMark(null)}>There’s nothing white in this shot</button>
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
    </div>
  )
}
