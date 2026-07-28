import { useEffect, useRef, useState } from 'react'
import { readSkin } from '../../color/skinMetrics'
import { rgbToHex, type RGB } from '../../core/colorMath'
import type { ProbeKind } from '../../core/facePlan'
import { medianColor } from '../../core/robustSample'
import type { SkinReading } from '../../core/types'
import { sampleCanvasAt } from '../camera/sampleCanvas'
import type { CaptureResult } from './FaceCapture'

const SKIN_KINDS: ProbeKind[] = ['forehead', 'leftCheek', 'rightCheek', 'jaw']

const PROBE_LABEL: Record<ProbeKind, string> = {
  forehead: 'skin',
  leftCheek: 'skin',
  rightCheek: 'skin',
  jaw: 'skin',
  hair: 'hair',
}

type Correcting = 'skin' | 'hair' | 'white' | null

// The trust step, and it is deliberately not skippable: we show every colour we
// took and let the visitor overrule any of it. Without this the feature is a
// black box that tells people what suits them from numbers they never saw.
//
// NOTE: this file is scanned by tests/sample-privacy.test.ts.
export function ProbeReview({ capture, onConfirm, onRetake }: {
  capture: CaptureResult
  onConfirm: (reading: SkinReading) => void
  onRetake: () => void
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [skin, setSkin] = useState<RGB | null>(
    () => medianColor(capture.probes.filter((p) => SKIN_KINDS.includes(p.kind)).map((p) => p.rgb)),
  )
  const [hair, setHair] = useState<RGB | null>(
    () => capture.probes.find((p) => p.kind === 'hair')?.rgb ?? null,
  )
  const [whiteRef, setWhiteRef] = useState<RGB | null>(capture.whiteRef?.rgb ?? null)
  const [correcting, setCorrecting] = useState<Correcting>(null)

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
    // transform here would sample the wrong pixels.
    const rgb = sampleCanvasAt(capture.canvas, e.clientX, e.clientY, undefined, 'contain')
    if (!rgb) return
    if (correcting === 'skin') setSkin(rgb)
    else if (correcting === 'hair') setHair(rgb)
    else setWhiteRef(rgb)
    setCorrecting(null)
  }

  function confirm() {
    if (!skin) return
    onConfirm(readSkin(skin, hair, whiteRef))
  }

  const swatch = (label: string, rgb: RGB | null, note?: string) => (
    <div className="probe-read">
      <i className="probe-chip" style={{ background: rgb ? rgbToHex(rgb) : 'transparent' }} />
      <div>
        <b>{label}</b>
        <small>{rgb ? rgbToHex(rgb) : note ?? 'not read'}</small>
      </div>
    </div>
  )

  return (
    <div className="cam-overlay probe-review" role="dialog" aria-label="Check what we read">
      <p className="cam-steps">
        {capture.faceFound
          ? <><b>Check this is right.</b> These are the colours we measured. Tap a
            correction below if any of them look wrong.</>
          : <><b>We couldn’t find a face in that photo.</b> No problem — tap your
            cheek and your hair yourself using the buttons below.</>}
      </p>

      {/* The stage takes the photo's own aspect ratio, so a probe's source
          fraction is exactly its percentage position and the dots land on the
          pixels that were actually sampled. */}
      <div ref={stageRef} className="probe-stage" onPointerDown={correctAt}
        style={{ aspectRatio: `${capture.canvas.width} / ${capture.canvas.height}` }}>
        {capture.probes.map((p) => (
          <span key={p.kind}
            className={`probe-dot ${p.kind === 'hair' ? 'is-hair' : 'is-skin'}`}
            aria-hidden="true"
            style={{
              left: `${(p.cx / capture.canvas.width) * 100}%`,
              top: `${(p.cy / capture.canvas.height) * 100}%`,
            }}>
            {/* Labelled so a misplaced probe is obvious on sight — this is how
                the 2026-07-28 "hair" probe was caught sitting on a forehead. */}
            <b>{PROBE_LABEL[p.kind]}</b>
          </span>
        ))}
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
        <button type="button" onClick={() => setWhiteRef(null)}>There’s nothing white in this shot</button>
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
