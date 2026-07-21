import { useEffect, useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { averagePatch } from '../../core/sampling'
import { cameraSupported, stopStream } from './cameraStream'

const PATCH_RADIUS = 6

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
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const rgb = averagePatch(img.data, canvas.width, canvas.height, cx, cy, PATCH_RADIUS)
    setTap({ xPct: (cx / canvas.width) * 100, yPct: (cy / canvas.height) * 100, rgb })
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
