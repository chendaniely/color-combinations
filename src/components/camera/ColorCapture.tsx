import { useEffect, useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { cameraSupported, stopStream } from './cameraStream'
import { sampleCanvasAt } from './sampleCanvas'

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function ColorCapture({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const supported = cameraSupported()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [frozen, setFrozen] = useState(false)
  const [tap, setTap] = useState<{ xPct: number; yPct: number; rgb: RGB } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) { stopStream(stream); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => { if (!cancelled) setError('Camera access was blocked. Close this and type a color name instead.') })
    return () => { cancelled = true; stopStream(streamRef.current); streamRef.current = null }
  }, [supported])

  function freeze() {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setFrozen(true); setTap(null)
  }

  function retake() { setFrozen(false); setTap(null) }

  function sampleAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rgb = sampleCanvasAt(canvas, e.clientX, e.clientY)
    if (!rgb) return
    const rect = canvas.getBoundingClientRect()
    // xPct/yPct place the .cam-tap marker in display/box space (not the
    // cover-inverted source coords, which would misplace it under any aspect).
    setTap({
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
      rgb,
    })
  }

  return (
    <div className="cam-overlay" role="dialog" aria-label="Find a color with the camera">
      <button className="cam-close" onClick={onClose} aria-label="Close camera">×</button>

      {!supported ? (
        <div className="cam-fallback">
          <p>Your camera isn’t available here (it needs a secure connection and permission).
            Close this and search by name instead.</p>
        </div>
      ) : (
        <>
          <p className="cam-steps">
            {!frozen
              ? <><b>Step 1 of 2:</b> Point at the item, then tap the shutter to take a photo.</>
              : !tap
                ? <><b>Step 2 of 2:</b> Now tap the exact color on the photo — it won’t pick the center for you.</>
                : <>Tap another spot to change your pick, or use the button below.</>}
          </p>
          <div className="cam-stage">
            <video ref={videoRef} playsInline muted className="cam-video" style={{ display: frozen ? 'none' : 'block' }} />
            <canvas ref={canvasRef} className="cam-canvas" style={{ display: frozen ? 'block' : 'none' }}
              onPointerDown={sampleAt} />
            {!frozen && <div className="cam-reticle" aria-hidden="true" />}
            {frozen && tap && (
              <div className="cam-tap" style={{ left: `${tap.xPct}%`, top: `${tap.yPct}%` }}>
                <span className="cam-tap-chip"><i style={{ background: toHex(tap.rgb) }} />{toHex(tap.rgb)}</span>
              </div>
            )}
          </div>

          {error && <p className="cam-error">{error}</p>}

          <div className="cam-controls">
            {!frozen ? (
              <button className="cam-shutter" onClick={freeze} aria-label="Freeze the frame" />
            ) : (
              <>
                <button className="cam-btn ghost" onClick={retake}>Retake</button>
                <button className="cam-btn primary" disabled={!tap}
                  onClick={() => tap && onSample(tap.rgb)}>Use this color</button>
              </>
            )}
          </div>

          <p className="cam-privacy">Your photo stays on this device — nothing is uploaded or saved.</p>
        </>
      )}
    </div>
  )
}
