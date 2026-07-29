import { useEffect, useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { faceTooSmall, planProbes, type Probe } from '../../core/facePlan'
import { robustColor, samplesInPatch } from '../../core/robustSample'
import { findWhiteRef } from '../../core/whiteRef'
import { cameraSupported, stopStream } from '../camera/cameraStream'
import { Overlay } from '../Overlay'

const MAX_DIM = 1200

// The capture canvas is WRITTEN once and READ many times: analyse() pulls the
// whole frame, and ProbeReview re-reads it on every white-balance change to
// repaint the preview. Chromium warns about exactly this pattern
// ("Multiple readback operations using getImageData are faster with the
// willReadFrequently attribute set to true"), because without the hint the
// canvas stays GPU-backed and every read stalls on a pixel transfer.
//
// The option only takes effect on the FIRST getContext call for an element, so
// every path that touches this canvas must go through here — including the
// plain drawImage calls, which would otherwise create the context first and
// silently lock in the GPU-backed mode.
function readableContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return canvas.getContext('2d', { willReadFrequently: true })
}

export interface SampledProbe extends Probe { rgb: RGB }

export interface CaptureResult {
  probes: SampledProbe[]
  whiteRef: { cx: number; cy: number; rgb: RGB } | null
  canvas: HTMLCanvasElement
  faceFound: boolean
}

type Source = 'camera' | 'upload'

// Photograph a face and sample it. The detector is imported lazily so the
// ~3.5 MB MediaPipe runtime never lands in the main bundle — only visitors who
// open the You tab pay for it.
//
// NOTE: this file is scanned by tests/sample-privacy.test.ts. The photograph is
// drawn to a canvas, measured, and discarded — never uploaded, never stored.
export function FaceCapture({ onCapture, onClose }: {
  onCapture: (result: CaptureResult) => void
  onClose: () => void
}) {
  const supported = cameraSupported()
  const [source, setSource] = useState<Source>(supported ? 'camera' : 'upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tooSmall, setTooSmall] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (source !== 'camera' || !supported) return
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        if (cancelled) { stopStream(stream); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) setError('Camera access was blocked — upload a photo instead.')
      })
    return () => { cancelled = true; stopStream(streamRef.current); streamRef.current = null }
  }, [source, supported])

  // Everything the analysis needs, taken from one canvas. Runs automatically:
  // ProbeReview is the confirmation step, so a second button here would just
  // repeat the freeze-then-tap confusion logged in TODO.md.
  async function analyse(canvas: HTMLCanvasElement) {
    setBusy(true)
    setError(null)
    setTooSmall(false)
    const ctx = readableContext(canvas)
    if (!ctx) { setBusy(false); setError('Could not read that photo — try another.'); return }
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

    let face = null
    try {
      const { detectFace } = await import('../../face/detect')
      face = await detectFace(canvas)
    } catch {
      // Model blocked, offline, or unsupported: fall through to the manual
      // path rather than showing a spinner that never resolves.
      face = null
    }

    if (face && faceTooSmall(face, width)) {
      setBusy(false)
      setTooSmall(true)
      return
    }

    const probes: SampledProbe[] = face
      ? planProbes(face, width, height).flatMap((p) => {
        const rgb = robustColor(samplesInPatch(data, width, height, p.cx, p.cy, p.radius))
        return rgb ? [{ ...p, rgb }] : []
      })
      : []

    const whiteRef = findWhiteRef(data, width, height, face ? face.box : null)

    setBusy(false)
    onCapture({ probes, whiteRef, canvas, faceFound: face !== null })
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t an image — pick a photo.')
      return
    }
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        readableContext(canvas)?.drawImage(img, 0, 0, canvas.width, canvas.height)
        void analyse(canvas)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      setError('Couldn’t read that image — try another.')
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function shutter() {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    readableContext(canvas)?.drawImage(video, 0, 0, canvas.width, canvas.height)
    void analyse(canvas)
  }

  return (
    <Overlay label="Photograph your face" onClose={onClose} className="face-capture">
      <p className="cam-steps">
        Fit your face in the oval, and hold <b>something white</b> next to it —
        paper, a mug, a wall, a t-shirt. We use it to correct the lighting.
        No white thing to hand? Carry on anyway.
      </p>

      {supported && (
        <div className="face-sources" role="tablist" aria-label="Photo source">
          <button role="tab" aria-selected={source === 'camera'}
            onClick={() => setSource('camera')}>Camera</button>
          <button role="tab" aria-selected={source === 'upload'}
            onClick={() => setSource('upload')}>Upload a photo</button>
        </div>
      )}

      <div className="cam-stage">
        {source === 'camera' && (
          <video ref={videoRef} playsInline muted className="cam-video" />
        )}
        <canvas ref={canvasRef} className="cam-canvas"
          style={{ display: source === 'upload' ? 'block' : 'none' }} />
        <div className="face-oval" aria-hidden="true" />
      </div>

      {source === 'upload' && (
        <label className="sample-upload">
          <input type="file" accept="image/*" onChange={onFile} aria-label="Choose a photo" />
          <span>Choose a photo…</span>
        </label>
      )}

      {busy && <p className="cam-steps" role="status">Reading your colouring…</p>}
      {tooSmall && (
        <p className="cam-error">
          Your face is a little far away — move closer, or crop in, and try again.
        </p>
      )}
      {error && <p className="cam-error">{error}</p>}

      {source === 'camera' && (
        <div className="cam-controls">
          <button className="cam-shutter" onClick={shutter} aria-label="Take the photo" />
        </div>
      )}

      <p className="cam-privacy">
        Your photo stays on this device — nothing is uploaded or saved, and the
        photo itself is thrown away as soon as we’ve measured it.
      </p>
    </Overlay>
  )
}
