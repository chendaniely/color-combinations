import { useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { sampleCanvasAt } from '../camera/sampleCanvas'

const MAX_DIM = 1600

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Upload a photo and eyedrop a region — the still-image sibling of the camera.
// Everything is local: the file is drawn to a canvas and sampled in-browser.
export function ImagePicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [tap, setTap] = useState<{ xPct: number; yPct: number; rgb: RGB } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('That file isn’t an image — pick a photo.'); return }
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setLoaded(true); setTap(null)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { setError('Couldn’t read that image — try another.'); URL.revokeObjectURL(url) }
    img.src = url
  }

  function sampleAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rgb = sampleCanvasAt(canvas, e.clientX, e.clientY)
    if (!rgb) return
    const rect = canvas.getBoundingClientRect()
    setTap({
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
      rgb,
    })
  }

  return (
    <div className="cam-overlay" role="dialog" aria-label="Sample a color from a photo">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps">
        {!loaded
          ? <><b>Step 1 of 2:</b> Choose a photo.</>
          : !tap
            ? <><b>Step 2 of 2:</b> Tap the exact color on the photo.</>
            : <>Tap another spot to change your pick, or use the button below.</>}
      </p>
      {!loaded && (
        <label className="sample-upload">
          <input type="file" accept="image/*" onChange={onFile} aria-label="Choose a photo" />
          <span>Choose a photo…</span>
        </label>
      )}
      <div className="cam-stage" style={{ display: loaded ? 'block' : 'none' }}>
        <canvas ref={canvasRef} className="cam-canvas" style={{ display: 'block' }} onPointerDown={sampleAt} />
        {loaded && tap && (
          <div className="cam-tap" style={{ left: `${tap.xPct}%`, top: `${tap.yPct}%` }}>
            <span className="cam-tap-chip"><i style={{ background: toHex(tap.rgb) }} />{toHex(tap.rgb)}</span>
          </div>
        )}
      </div>
      {error && <p className="cam-error">{error}</p>}
      <div className="cam-controls">
        {loaded && (
          <button className="cam-btn primary" disabled={!tap} onClick={() => tap && onSample(tap.rgb)}>Use this color</button>
        )}
      </div>
      <p className="cam-privacy">Your photo stays on this device — nothing is uploaded or saved.</p>
    </div>
  )
}
